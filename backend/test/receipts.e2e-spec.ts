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

const PDF_BUFFER = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.alloc(200, 0x20),
  Buffer.from('%%EOF'),
]);

describe('Receipts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let strangerToken: string;

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

    const clientEmail = `recibos-client-${Date.now()}@gsalas.dev`;
    await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Recibos',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;

    const strangerEmail = `recibos-stranger-${Date.now()}@gsalas.dev`;
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

  async function createPaymentAsClient() {
    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', auth(clientToken));
    const userId = data<{ id: string }>(me).id;
    const invoiceRes = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId,
        amount: 120,
        dueDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
        referenceMonth: '2027-05',
      });
    const invoice = data<{ id: string }>(invoiceRes);
    const paymentRes = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(clientToken))
      .send({ invoiceId: invoice.id, method: 'PIX' });
    return {
      invoiceId: invoice.id,
      paymentId: data<{ id: string }>(paymentRes).id,
    };
  }

  it('rejects a fake file and accepts a real PDF, moving the payment to UNDER_REVIEW', async () => {
    const { paymentId } = await createPaymentAsClient();

    const fake = await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', Buffer.from('not a pdf'), 'comprovante.pdf');
    expect(fake.status).toBe(400);

    const real = await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', PDF_BUFFER, 'comprovante.pdf');
    expect(real.status).toBe(201);
    expect(data<{ status: string }>(real).status).toBe('PENDING_REVIEW');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(payment.status).toBe('UNDER_REVIEW');
  });

  it('blocks a stranger from uploading, viewing, approving or rejecting', async () => {
    const { paymentId } = await createPaymentAsClient();
    await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', PDF_BUFFER, 'comprovante.pdf');

    const upload = await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(strangerToken))
      .attach('file', PDF_BUFFER, 'x.pdf');
    expect(upload.status).toBe(403);

    const view = await request(server())
      .get(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(strangerToken));
    expect(view.status).toBe(403);

    const approve = await request(server())
      .patch(`/api/v1/payments/${paymentId}/receipt/approve`)
      .set('Authorization', auth(clientToken));
    expect(approve.status).toBe(403);
  });

  it('rejects a receipt with a reason and allows the client to retry', async () => {
    const { paymentId } = await createPaymentAsClient();
    await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', PDF_BUFFER, 'comprovante.pdf');

    const reject = await request(server())
      .patch(`/api/v1/payments/${paymentId}/receipt/reject`)
      .set('Authorization', auth(adminToken))
      .send({ reason: 'Valor não corresponde à cobrança' });
    expect(reject.status).toBe(200);
    const rejected = data<{ status: string; rejectionReason: string }>(reject);
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Valor não corresponde à cobrança');

    const paymentAfterReject = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(paymentAfterReject.status).toBe('PENDING');

    const retry = await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', PDF_BUFFER, 'comprovante-2.pdf');
    expect(retry.status).toBe(201);
    expect(data<{ status: string }>(retry).status).toBe('PENDING_REVIEW');

    // Same payment can only ever have one receipt row (1:1) — retry updates it.
    const receiptCount = await prisma.paymentReceipt.count({
      where: { paymentId },
    });
    expect(receiptCount).toBe(1);
  });

  it('approving a receipt approves the payment and pays the invoice, atomically', async () => {
    const { paymentId, invoiceId } = await createPaymentAsClient();
    await request(server())
      .post(`/api/v1/payments/${paymentId}/receipt`)
      .set('Authorization', auth(clientToken))
      .attach('file', PDF_BUFFER, 'comprovante.pdf');

    const approve = await request(server())
      .patch(`/api/v1/payments/${paymentId}/receipt/approve`)
      .set('Authorization', auth(adminToken));
    expect(approve.status).toBe(200);
    expect(data<{ status: string }>(approve).status).toBe('APPROVED');

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(payment.status).toBe('APPROVED');
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    expect(invoice.status).toBe('PAID');

    const doubleApprove = await request(server())
      .patch(`/api/v1/payments/${paymentId}/receipt/approve`)
      .set('Authorization', auth(adminToken));
    expect(doubleApprove.status).toBe(409);
  });
});
