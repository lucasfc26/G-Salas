import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { CreditsService } from '../src/credits/credits.service.js';
import { InsufficientCreditsException } from '../src/common/exceptions/insufficient-credits.exception.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Credits (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let creditsService: CreditsService;
  let adminToken: string;
  let clientToken: string;
  let strangerToken: string;
  let walletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    creditsService = app.get(CreditsService);

    const adminLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@lumiar.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@lumiar.dev', password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;
    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`);
    const clientUserId = data<{ id: string }>(me).id;

    const strangerEmail = `stranger-${Date.now()}@lumiar.dev`;
    await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Estranho',
        email: strangerEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    const strangerLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: strangerEmail, password: 'Senha@123' });
    strangerToken = data<{ accessToken: string }>(strangerLogin).accessToken;

    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Teste',
        monthlyHours: 10,
        monthlyValue: 500,
        cancellationLimit: 2,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyHours: 10,
        cancellationLimit: 2,
        status: 'ACTIVE',
      },
    });
    const wallet = await prisma.creditWallet.create({
      data: {
        userId: clientUserId,
        contractId: contract.id,
        balance: 10,
        totalGranted: 10,
      },
    });
    walletId = wallet.id;
  });

  afterAll(async () => {
    await app.close();
  });

  function server(): App {
    return app.getHttpServer();
  }

  function auth(token: string) {
    return `Bearer ${token}`;
  }

  it('lets the owner view their own wallet, blocks other clients', async () => {
    const owner = await request(server())
      .get(`/api/v1/credits/wallets/${walletId}`)
      .set('Authorization', auth(clientToken));
    expect(owner.status).toBe(200);
    expect(data<{ balance: number }>(owner).balance).toBe(10);

    const stranger = await request(server())
      .get(`/api/v1/credits/wallets/${walletId}`)
      .set('Authorization', auth(strangerToken));
    expect(stranger.status).toBe(403);

    const admin = await request(server())
      .get(`/api/v1/credits/wallets/${walletId}`)
      .set('Authorization', auth(adminToken));
    expect(admin.status).toBe(200);
  });

  it('debits credits atomically and records a ledger entry', async () => {
    const wallet = await creditsService.debit(walletId, 3, {
      referenceType: 'TEST',
      referenceId: 'ref-1',
    });
    expect(wallet.balance).toBe(7);
    expect(wallet.totalUsed).toBe(3);

    const list = await request(server())
      .get(`/api/v1/credits/wallets/${walletId}/transactions`)
      .set('Authorization', auth(clientToken));
    const tx = data<{ type: string; amount: number }[]>(list);
    expect(tx[0]).toMatchObject({ type: 'DEBIT', amount: -3 });
  });

  it('rejects a debit larger than the available balance', async () => {
    await expect(
      creditsService.debit(walletId, 999, { referenceType: 'TEST' }),
    ).rejects.toBeInstanceOf(InsufficientCreditsException);

    const wallet = await creditsService.getWallet(walletId);
    expect(wallet.balance).toBe(7);
  });

  it('refunds and grants credits correctly', async () => {
    const afterRefund = await creditsService.refund(walletId, 2, {
      referenceType: 'TEST',
    });
    expect(afterRefund.balance).toBe(9);
    expect(afterRefund.totalUsed).toBe(1);

    const afterGrant = await creditsService.grant(walletId, 5, {
      referenceType: 'TEST',
    });
    expect(afterGrant.balance).toBe(14);
    expect(afterGrant.totalGranted).toBe(15);
  });

  it('blocks non-admins from adjusting credits, and audits admin adjustments', async () => {
    const blocked = await request(server())
      .post(`/api/v1/credits/wallets/${walletId}/adjust`)
      .set('Authorization', auth(clientToken))
      .send({ delta: 1 });
    expect(blocked.status).toBe(403);

    const adjust = await request(server())
      .post(`/api/v1/credits/wallets/${walletId}/adjust`)
      .set('Authorization', auth(adminToken))
      .send({ delta: -4, description: 'Correção manual' });
    expect(adjust.status).toBe(201);
    expect(data<{ balance: number }>(adjust).balance).toBe(10);

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'CREDIT_ADJUSTMENT', entityId: walletId },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).not.toBeNull();
  });

  it('rejects a negative adjustment that would overdraw the wallet', async () => {
    const res = await request(server())
      .post(`/api/v1/credits/wallets/${walletId}/adjust`)
      .set('Authorization', auth(adminToken))
      .send({ delta: -9999 });
    expect(res.status).toBe(409);
  });

  it('never oversells credits under concurrent debits', async () => {
    const concurrentWallet = await prisma.creditWallet.create({
      data: {
        userId: (
          await prisma.creditWallet.findUniqueOrThrow({
            where: { id: walletId },
          })
        ).userId,
        contractId: (
          await prisma.creditWallet.findUniqueOrThrow({
            where: { id: walletId },
          })
        ).contractId,
        balance: 5,
        totalGranted: 5,
      },
    });

    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        creditsService.debit(concurrentWallet.id, 1, { referenceType: 'RACE' }),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === 'fulfilled');
    const failed = attempts.filter((a) => a.status === 'rejected');
    expect(succeeded).toHaveLength(5);
    expect(failed).toHaveLength(5);

    const finalWallet = await creditsService.getWallet(concurrentWallet.id);
    expect(finalWallet.balance).toBe(0);
    expect(finalWallet.totalUsed).toBe(5);
  });
});
