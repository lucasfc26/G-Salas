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

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Contracts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let strangerToken: string;
  let clientUserId: string;

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

    const adminLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@gsalas.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientEmail = `contratos-client-${Date.now()}@gsalas.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Contratos',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    clientUserId = data<{ id: string }>(created).id;
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;

    const strangerEmail = `contratos-stranger-${Date.now()}@gsalas.dev`;
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

  it('blocks non-admins from creating a contract', async () => {
    const res = await request(server())
      .post('/api/v1/contracts')
      .set('Authorization', auth(clientToken))
      .send({
        userId: clientUserId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        monthlyHours: 8,
        cancellationLimit: 1,
      });
    expect(res.status).toBe(403);
  });

  it('creates a contract and grants the initial credit wallet atomically', async () => {
    const res = await request(server())
      .post('/api/v1/contracts')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        monthlyHours: 8,
        cancellationLimit: 1,
      });

    expect(res.status).toBe(201);
    const contract = data<{ id: string; status: string }>(res);
    expect(contract.status).toBe('ACTIVE');

    const wallet = await prisma.creditWallet.findFirstOrThrow({
      where: { contractId: contract.id },
    });
    expect(wallet.balance).toBe(8);
    expect(wallet.totalGranted).toBe(8);

    const ledger = await prisma.creditTransaction.findFirst({
      where: { walletId: wallet.id, referenceType: 'CONTRACT' },
    });
    expect(ledger).toMatchObject({ type: 'CREDIT', amount: 8 });
  });

  it('lets the owner view their contract, blocks other clients, allows admin', async () => {
    const list = await request(server())
      .get(`/api/v1/contracts?userId=${clientUserId}`)
      .set('Authorization', auth(adminToken));
    const [contract] = data<{ id: string }[]>(list);

    const owner = await request(server())
      .get(`/api/v1/contracts/${contract.id}`)
      .set('Authorization', auth(clientToken));
    expect(owner.status).toBe(200);

    const stranger = await request(server())
      .get(`/api/v1/contracts/${contract.id}`)
      .set('Authorization', auth(strangerToken));
    expect(stranger.status).toBe(403);
  });

  it('renews a contract: extends endDate, resets cancellationsUsed, tops up credits', async () => {
    const create = await request(server())
      .post('/api/v1/contracts')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        monthlyHours: 5,
        cancellationLimit: 1,
      });
    const contract = data<{ id: string }>(create);
    await prisma.contract.update({
      where: { id: contract.id },
      data: { cancellationsUsed: 1 },
    });
    const wallet = await prisma.creditWallet.findFirstOrThrow({
      where: { contractId: contract.id },
    });

    const newEndDate = new Date(Date.now() + 60 * 86_400_000).toISOString();
    const renew = await request(server())
      .post(`/api/v1/contracts/${contract.id}/renew`)
      .set('Authorization', auth(adminToken))
      .send({ endDate: newEndDate });

    expect(renew.status).toBe(201);
    const renewed = data<{
      status: string;
      cancellationsUsed: number;
      endDate: string;
    }>(renew);
    expect(renewed.cancellationsUsed).toBe(0);
    expect(renewed.status).toBe('ACTIVE');
    expect(new Date(renewed.endDate).toISOString()).toBe(newEndDate);

    const walletAfter = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });
    expect(walletAfter.balance).toBe(wallet.balance + 5);
    expect(walletAfter.totalGranted).toBe(wallet.totalGranted + 5);
  });

  it('validates and stores a contract document, exposing a public URL', async () => {
    const create = await request(server())
      .post('/api/v1/contracts')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        monthlyHours: 4,
        cancellationLimit: 1,
      });
    const contract = data<{ id: string }>(create);

    const rejected = await request(server())
      .post(`/api/v1/contracts/${contract.id}/document`)
      .set('Authorization', auth(adminToken))
      .attach('file', Buffer.from('not a real pdf'), 'contract.pdf');
    expect(rejected.status).toBe(400);

    const pdfHeader = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(200, 0x20),
      Buffer.from('%%EOF'),
    ]);
    const accepted = await request(server())
      .post(`/api/v1/contracts/${contract.id}/document`)
      .set('Authorization', auth(adminToken))
      .attach('file', pdfHeader, 'contract.pdf');
    expect(accepted.status).toBe(201);
    expect(data<{ documentUrl: string }>(accepted).documentUrl).toMatch(
      /\/uploads\/contracts\/.+\.pdf$/,
    );
  });

  it('blocks non-admins from renewing or uploading a document', async () => {
    const create = await request(server())
      .post('/api/v1/contracts')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        monthlyHours: 4,
        cancellationLimit: 1,
      });
    const contract = data<{ id: string }>(create);

    const renew = await request(server())
      .post(`/api/v1/contracts/${contract.id}/renew`)
      .set('Authorization', auth(clientToken))
      .send({ endDate: new Date(Date.now() + 90 * 86_400_000).toISOString() });
    expect(renew.status).toBe(403);

    const upload = await request(server())
      .post(`/api/v1/contracts/${contract.id}/document`)
      .set('Authorization', auth(clientToken))
      .attach('file', Buffer.from('x'), 'x.pdf');
    expect(upload.status).toBe(403);
  });
});
