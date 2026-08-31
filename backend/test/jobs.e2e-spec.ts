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
import { ContractsProcessor } from '../src/jobs/processors/contracts.processor.js';
import { FinancialProcessor } from '../src/jobs/processors/financial.processor.js';
import { ContractsModule } from '../src/contracts/contracts.module.js';
import { FinancialModule } from '../src/financial/financial.module.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

async function waitUntil(
  check: () => Promise<boolean>,
  timeoutMs = 5000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('Timed out waiting for the background job to take effect.');
}

describe('Jobs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let clientUserId: string;

  beforeAll(async () => {
    // The API process never runs a @Processor in production — that's the
    // separate worker process (src/worker.ts), so a slow job can't starve
    // request handling. Here we add the processors as extra providers so
    // this single test process can also consume what it enqueues; they
    // pick up the queue tokens AppModule (via JobsModule) already
    // registers, without duplicating the BullMQ connection setup.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, ContractsModule, FinancialModule],
      providers: [ContractsProcessor, FinancialProcessor],
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

    const clientEmail = `jobs-client-${Date.now()}@gsalas.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Jobs',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    clientUserId = data<{ id: string }>(created).id;
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;
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

  it('blocks non-admins from triggering jobs', async () => {
    const res = await request(server())
      .post('/api/v1/jobs/contracts/run-now')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(403);
  });

  it('expires an overdue contract and notifies the client', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Job',
        monthlyHours: 4,
        monthlyValue: 200,
        cancellationLimit: 1,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(Date.now() - 60 * 86_400_000),
        endDate: new Date(Date.now() - 86_400_000),
        monthlyHours: 4,
        cancellationLimit: 1,
        status: 'ACTIVE',
      },
    });

    const run = await request(server())
      .post('/api/v1/jobs/contracts/run-now')
      .set('Authorization', auth(adminToken));
    expect(run.status).toBe(201);
    expect(data<{ enqueued: boolean }>(run).enqueued).toBe(true);

    await waitUntil(async () => {
      const updated = await prisma.contract.findUniqueOrThrow({
        where: { id: contract.id },
      });
      return updated.status === 'EXPIRED';
    });

    const notification = await prisma.notification.findFirst({
      where: { userId: clientUserId, type: 'CONTRACT_EXPIRED' },
    });
    expect(notification).not.toBeNull();
  });

  it('alerts a contract expiring within the 7-day window, once', async () => {
    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Job 2',
        monthlyHours: 4,
        monthlyValue: 200,
        cancellationLimit: 1,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86_400_000),
        monthlyHours: 4,
        cancellationLimit: 1,
        status: 'ACTIVE',
      },
    });

    await request(server())
      .post('/api/v1/jobs/contracts/run-now')
      .set('Authorization', auth(adminToken));

    await waitUntil(async () => {
      const count = await prisma.notification.count({
        where: { userId: clientUserId, type: 'CONTRACT_EXPIRING' },
      });
      return count > 0;
    });

    // Running the sweep again the same day must not duplicate the alert.
    await request(server())
      .post('/api/v1/jobs/contracts/run-now')
      .set('Authorization', auth(adminToken));
    await new Promise((resolve) => setTimeout(resolve, 500));

    const alerts = await prisma.notification.findMany({
      where: { userId: clientUserId, type: 'CONTRACT_EXPIRING' },
    });
    const forThisContract = alerts.filter(
      (n) =>
        (n.metadata as { contractId?: string } | null)?.contractId ===
        contract.id,
    );
    expect(forThisContract).toHaveLength(1);
  });

  it('marks an overdue invoice, once triggered by the financial job', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        userId: clientUserId,
        amount: 100,
        dueDate: new Date(Date.now() - 86_400_000),
        referenceMonth: '2026-11',
        status: 'PENDING',
      },
    });

    const run = await request(server())
      .post('/api/v1/jobs/financial/run-now')
      .set('Authorization', auth(adminToken));
    expect(run.status).toBe(201);

    await waitUntil(async () => {
      const updated = await prisma.invoice.findUniqueOrThrow({
        where: { id: invoice.id },
      });
      return updated.status === 'OVERDUE';
    });
  });
});
