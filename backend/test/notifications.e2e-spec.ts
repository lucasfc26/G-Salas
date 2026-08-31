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

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let clientUserId: string;
  let roomId: string;

  const dateStr = '2027-09-13';
  const weekday = new Date(`${dateStr}T00:00:00.000Z`).getUTCDay();

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

    const clientEmail = `notif-client-${Date.now()}@esalas.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Notif',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    clientUserId = data<{ id: string }>(created).id;
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;

    const room = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Sala Notif ${Date.now()}`, capacity: 2, hourlyPrice: 50 });
    roomId = data<{ id: string }>(room).id;
    await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomId, weekday, startTime: '08:00', endTime: '20:00' });

    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Notif',
        monthlyHours: 5,
        monthlyValue: 300,
        cancellationLimit: 1,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 86_400_000),
        monthlyHours: 5,
        cancellationLimit: 1,
        status: 'ACTIVE',
      },
    });
    await prisma.creditWallet.create({
      data: {
        userId: clientUserId,
        contractId: contract.id,
        balance: 5,
        totalGranted: 5,
      },
    });
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

  it('notifies the client when a reservation is confirmed and again when cancelled', async () => {
    const create = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T09:00:00.000Z`, duration: 60 });
    const reservation = data<{ id: string }>(create);

    const confirmed = await prisma.notification.findFirst({
      where: { userId: clientUserId, type: 'RESERVATION_CONFIRMED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(confirmed).not.toBeNull();
    expect(
      (confirmed?.metadata as { reservationId: string }).reservationId,
    ).toBe(reservation.id);

    await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/cancel`)
      .set('Authorization', auth(clientToken));

    const cancelled = await prisma.notification.findFirst({
      where: { userId: clientUserId, type: 'RESERVATION_CANCELLED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(cancelled).not.toBeNull();
  });

  it('notifies the client when a payment is approved', async () => {
    const invoiceRes = await request(server())
      .post('/api/v1/invoices')
      .set('Authorization', auth(adminToken))
      .send({
        userId: clientUserId,
        amount: 80,
        dueDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        referenceMonth: '2027-06',
      });
    const invoice = data<{ id: string }>(invoiceRes);

    const pending = await prisma.notification.findFirst({
      where: { userId: clientUserId, type: 'PAYMENT_PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    expect(pending).not.toBeNull();

    const paymentRes = await request(server())
      .post('/api/v1/payments')
      .set('Authorization', auth(clientToken))
      .send({ invoiceId: invoice.id });
    const payment = data<{ id: string }>(paymentRes);

    await request(server())
      .patch(`/api/v1/payments/${payment.id}/approve`)
      .set('Authorization', auth(adminToken));

    const approved = await prisma.notification.findFirst({
      where: { userId: clientUserId, type: 'PAYMENT_APPROVED' },
    });
    expect(approved).not.toBeNull();
  });

  it('lists, counts and marks the client own notifications as read', async () => {
    const unreadBefore = await request(server())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', auth(clientToken));
    expect(data<{ count: number }>(unreadBefore).count).toBeGreaterThan(0);

    const list = await request(server())
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Authorization', auth(clientToken));
    const notifications = data<{ id: string; read: boolean }[]>(list);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.every((n) => !n.read)).toBe(true);

    const markOne = await request(server())
      .patch(`/api/v1/notifications/${notifications[0].id}/read`)
      .set('Authorization', auth(clientToken));
    expect(markOne.status).toBe(200);
    expect(data<{ read: boolean }>(markOne).read).toBe(true);

    const markAll = await request(server())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', auth(clientToken));
    expect(markAll.status).toBe(200);

    const unreadAfter = await request(server())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', auth(clientToken));
    expect(data<{ count: number }>(unreadAfter).count).toBe(0);
  });

  it('blocks a user from marking another user notification as read', async () => {
    const notif = await prisma.notification.findFirstOrThrow({
      where: { userId: clientUserId },
    });

    const strangerEmail = `notif-stranger-${Date.now()}@esalas.dev`;
    await request(server())
      .post('/api/v1/users')
      .set('Authorization', auth(adminToken))
      .send({
        name: 'Estranho',
        email: strangerEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    const strangerLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: strangerEmail, password: 'Senha@123' });
    const strangerToken = data<{ accessToken: string }>(
      strangerLogin,
    ).accessToken;

    const res = await request(server())
      .patch(`/api/v1/notifications/${notif.id}/read`)
      .set('Authorization', auth(strangerToken));
    expect(res.status).toBe(403);
  });
});
