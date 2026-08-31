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

describe('Financial & Payments (e2e)', () => {
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
      .send({ email: 'admin@esalas.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientEmail = `financeiro-client-${Date.now()}@esalas.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Financeiro',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    clientUserId = data<{ id: string }>(created).id;
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;

    const strangerEmail = `financeiro-stranger-${Date.now()}@esalas.dev`;
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

  it('blocks non-admins from creating invoices', async () => {
    const res = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(clientToken))
      .send({
        userId: clientUserId,
        amount: 150,
        dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        referenceMonth: '2027-01',
      });
    expect(res.status).toBe(403);
  });

  it('creates an invoice and lets only the owner or admin view it', async () => {
    const create = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 150,
        dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        referenceMonth: '2027-01',
      });
    expect(create.status).toBe(201);
    const invoice = data<{ id: string; status: string }>(create);
    expect(invoice.status).toBe('PENDING');

    const owner = await request(server())
      .get(`/api/v1/invoices/${invoice.id}`)
      .set('Authorization', auth(clientToken));
    expect(owner.status).toBe(200);

    const stranger = await request(server())
      .get(`/api/v1/invoices/${invoice.id}`)
      .set('Authorization', auth(strangerToken));
    expect(stranger.status).toBe(403);
  });

  it('marks a past-due pending invoice as OVERDUE', async () => {
    const create = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 100,
        dueDate: new Date(Date.now() - 86_400_000).toISOString(),
        referenceMonth: '2026-12',
      });
    const invoice = data<{ id: string }>(create);

    const markOverdue = await request(server())
      .post('/api/v1/invoices/mark-overdue')
      .set('Authorization', auth(adminToken));
    expect(markOverdue.status).toBe(201);
    expect(data<{ count: number }>(markOverdue).count).toBeGreaterThanOrEqual(
      1,
    );

    const updated = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(updated.status).toBe('OVERDUE');
  });

  it('runs the full payment approval flow, setting the invoice to PAID', async () => {
    const invoiceRes = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 200,
        dueDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        referenceMonth: '2027-02',
      });
    const invoice = data<{ id: string }>(invoiceRes);

    const strangerPayment = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(strangerToken))
      .send({ invoiceId: invoice.id, method: 'PIX' });
    expect(strangerPayment.status).toBe(403);

    const paymentRes = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(clientToken))
      .send({ invoiceId: invoice.id, method: 'PIX' });
    expect(paymentRes.status).toBe(201);
    const payment = data<{ id: string; status: string }>(paymentRes);
    expect(payment.status).toBe('PENDING');

    const approve = await request(server())
      .patch(`/api/v1/payments/${payment.id}/approve`)
      .set('Authorization', auth(adminToken));
    expect(approve.status).toBe(200);
    expect(data<{ status: string }>(approve).status).toBe('APPROVED');

    const invoiceAfter = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(invoiceAfter.status).toBe('PAID');

    const auditLog = await prisma.auditLog.findFirst({
      where: { action: 'APPROVE_PAYMENT', entityId: payment.id },
    });
    expect(auditLog).not.toBeNull();
  });

  it('rejects double-approving the same payment', async () => {
    const invoiceRes = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 90,
        dueDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        referenceMonth: '2027-03',
      });
    const invoice = data<{ id: string }>(invoiceRes);
    const paymentRes = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(clientToken))
      .send({ invoiceId: invoice.id });
    const payment = data<{ id: string }>(paymentRes);

    const first = await request(server())
      .patch(`/api/v1/payments/${payment.id}/approve`)
      .set('Authorization', auth(adminToken));
    expect(first.status).toBe(200);

    const second = await request(server())
      .patch(`/api/v1/payments/${payment.id}/approve`)
      .set('Authorization', auth(adminToken));
    expect(second.status).toBe(409);
  });

  it('lets an admin reject a payment without affecting invoice status', async () => {
    const invoiceRes = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 60,
        dueDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        referenceMonth: '2027-04',
      });
    const invoice = data<{ id: string }>(invoiceRes);
    const paymentRes = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(clientToken))
      .send({ invoiceId: invoice.id });
    const payment = data<{ id: string }>(paymentRes);

    const reject = await request(server())
      .patch(`/api/v1/payments/${payment.id}/reject`)
      .set('Authorization', auth(adminToken))
      .send({ reason: 'Comprovante ilegível' });
    expect(reject.status).toBe(200);
    expect(data<{ status: string }>(reject).status).toBe('REJECTED');

    const invoiceAfter = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(invoiceAfter.status).toBe('PENDING');
  });
});
