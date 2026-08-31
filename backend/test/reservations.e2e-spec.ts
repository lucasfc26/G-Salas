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
import { ReservationsService } from '../src/reservations/reservations.service.js';
import { ReservationConflictException } from '../src/common/exceptions/reservation-conflict.exception.js';
import { InsufficientCreditsException } from '../src/common/exceptions/insufficient-credits.exception.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

function errorCode(res: request.Response): string {
  return (res.body as { error: { code: string } }).error.code;
}

describe('Reservations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let reservationsService: ReservationsService;
  let adminToken: string;
  let clientToken: string;
  let strangerToken: string;
  let clientUserId: string;
  let contractId: string;
  let walletId: string;
  let roomId: string;

  const dateStr = '2027-06-07'; // arbitrary future Monday-or-not date, weekday computed below
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
    reservationsService = app.get(ReservationsService);

    const adminLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@esalas.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    // A dedicated user (not the shared seed client) keeps this suite's
    // credit/contract assertions exact — the seed client already has an
    // active contract of its own, which would otherwise compete with it.
    const clientEmail = `reservas-client-${Date.now()}@esalas.dev`;
    await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Reservas',
        email: clientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: clientEmail, password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;
    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`);
    clientUserId = data<{ id: string }>(me).id;

    const strangerEmail = `stranger-res-${Date.now()}@esalas.dev`;
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

    const room = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Sala Reserva ${Date.now()}`,
        capacity: 2,
        hourlyPrice: 50,
      });
    roomId = data<{ id: string }>(room).id;

    await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomId, weekday, startTime: '08:00', endTime: '20:00' });

    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Reserva',
        monthlyHours: 10,
        monthlyValue: 500,
        cancellationLimit: 1,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        monthlyHours: 10,
        cancellationLimit: 1,
        status: 'ACTIVE',
      },
    });
    contractId = contract.id;
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

  it('creates a reservation, debiting exactly one credit per hour', async () => {
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T09:00:00.000Z`, duration: 60 });

    expect(res.status).toBe(201);
    const reservation = data<{ id: string; status: string }>(res);
    expect(reservation.status).toBe('CONFIRMED');

    const wallet = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });
    expect(wallet.balance).toBe(9);
    expect(wallet.totalUsed).toBe(1);

    const ledger = await prisma.creditTransaction.findFirst({
      where: { walletId, referenceId: reservation.id },
    });
    expect(ledger).toMatchObject({ type: 'DEBIT', amount: -1 });
  });

  it('rejects an overlapping reservation for the same room', async () => {
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T09:30:00.000Z`, duration: 60 });

    expect(res.status).toBe(409);
    expect(errorCode(res)).toBe('RESERVATION_CONFLICT');
  });

  it('rejects a reservation outside the room availability window', async () => {
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T21:00:00.000Z`, duration: 60 });
    expect(res.status).toBe(409);
  });

  it('rejects a duration that is not a whole number of hours', async () => {
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T11:00:00.000Z`, duration: 45 });
    expect(res.status).toBe(400);
  });

  it('rejects a reservation when the client has no active contract', async () => {
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(strangerToken))
      .send({ roomId, startAt: `${dateStr}T12:00:00.000Z`, duration: 60 });
    expect(res.status).toBe(409);
  });

  it('rejects a reservation when the wallet has insufficient credits', async () => {
    await prisma.creditWallet.update({
      where: { id: walletId },
      data: { balance: 0 },
    });
    const res = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T13:00:00.000Z`, duration: 60 });
    expect(res.status).toBe(409);
    expect(errorCode(res)).toBe('INSUFFICIENT_CREDITS');
    await prisma.creditWallet.update({
      where: { id: walletId },
      data: { balance: 9 },
    });
  });

  it('blocks strangers from viewing or cancelling another client reservation, allows admin', async () => {
    const list = await request(server())
      .get(`/api/v1/reservations?userId=${clientUserId}`)
      .set('Authorization', auth(clientToken));
    const [reservation] = data<{ id: string }[]>(list);

    const strangerView = await request(server())
      .get(`/api/v1/reservations/${reservation.id}`)
      .set('Authorization', auth(strangerToken));
    expect(strangerView.status).toBe(403);

    const strangerCancel = await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/cancel`)
      .set('Authorization', auth(strangerToken));
    expect(strangerCancel.status).toBe(403);

    const adminView = await request(server())
      .get(`/api/v1/reservations/${reservation.id}`)
      .set('Authorization', auth(adminToken));
    expect(adminView.status).toBe(200);
  });

  it('refunds credits on an early cancellation (outside the window)', async () => {
    const create = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T14:00:00.000Z`, duration: 60 });
    const reservation = data<{ id: string }>(create);
    const before = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });

    const cancel = await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/cancel`)
      .set('Authorization', auth(clientToken))
      .send({ reason: 'Mudança de agenda' });
    expect(cancel.status).toBe(200);
    expect(data<{ status: string }>(cancel).status).toBe('CANCELLED');

    const after = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });
    expect(after.balance).toBe(before.balance + 1);

    const contract = await prisma.contract.findUniqueOrThrow({
      where: { id: contractId },
    });
    expect(contract.cancellationsUsed).toBe(0);
  });

  it('reschedules a reservation and settles the credit difference', async () => {
    const create = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T15:00:00.000Z`, duration: 60 });
    const reservation = data<{ id: string }>(create);
    const before = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });

    const reschedule = await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/reschedule`)
      .set('Authorization', auth(clientToken))
      .send({ startAt: `${dateStr}T16:00:00.000Z`, duration: 120 });
    expect(reschedule.status).toBe(200);

    const after = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });
    expect(after.balance).toBe(before.balance - 1); // 2h now costs 1 extra credit
  });

  it('never double-books a slot under concurrent reservation attempts', async () => {
    await prisma.creditWallet.update({
      where: { id: walletId },
      data: { balance: 20 },
    });
    const raceStart = new Date(`${dateStr}T18:00:00.000Z`);

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        reservationsService.create(clientUserId, {
          roomId,
          startAt: raceStart,
          duration: 60,
        }),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === 'fulfilled');
    const conflicted = attempts.filter(
      (a) =>
        a.status === 'rejected' &&
        a.reason instanceof ReservationConflictException,
    );
    expect(succeeded).toHaveLength(1);
    expect(conflicted).toHaveLength(7);

    const overlapping = await prisma.reservation.count({
      where: {
        roomId,
        startAt: raceStart,
        status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
      },
    });
    expect(overlapping).toBe(1);
  });

  it('never oversells credits under concurrent reservations for distinct time slots', async () => {
    // A dedicated room keeps these 5 slots free of the reservations created
    // by earlier tests in this file, isolating this to a pure credits race.
    const raceRoom = await prisma.room.create({
      data: {
        name: `Sala Corrida ${Date.now()}`,
        capacity: 2,
        hourlyPrice: 50,
      },
    });
    await prisma.availability.create({
      data: {
        roomId: raceRoom.id,
        weekday,
        startTime: '08:00',
        endTime: '20:00',
      },
    });
    await prisma.creditWallet.update({
      where: { id: walletId },
      data: { balance: 3, totalUsed: 0 },
    });

    const slotStarts = Array.from(
      { length: 5 },
      (_, i) =>
        new Date(
          `${dateStr}T${(9 + i).toString().padStart(2, '0')}:00:00.000Z`,
        ),
    );
    const attempts = await Promise.allSettled(
      slotStarts.map((startAt) =>
        reservationsService.create(clientUserId, {
          roomId: raceRoom.id,
          startAt,
          duration: 60,
        }),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === 'fulfilled');
    const insufficientCredits = attempts.filter(
      (a) =>
        a.status === 'rejected' &&
        a.reason instanceof InsufficientCreditsException,
    );
    expect(succeeded).toHaveLength(3);
    expect(insufficientCredits).toHaveLength(2);

    const wallet = await prisma.creditWallet.findUniqueOrThrow({
      where: { id: walletId },
    });
    expect(wallet.balance).toBe(0);

    // The two failed attempts must have rolled back their reservation insert
    // too — no orphaned reservation without a matching credit debit.
    const createdReservations = await prisma.reservation.count({
      where: { roomId: raceRoom.id, startAt: { in: slotStarts } },
    });
    expect(createdReservations).toBe(3);
  });

  it('lets an admin mark a reservation as no-show or completed', async () => {
    await prisma.creditWallet.update({
      where: { id: walletId },
      data: { balance: 5 },
    });
    const create = await request(server())
      .post('/api/v1/reservations')
      .set('Authorization', auth(clientToken))
      .send({ roomId, startAt: `${dateStr}T19:00:00.000Z`, duration: 60 });
    const reservation = data<{ id: string }>(create);

    const noShow = await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/no-show`)
      .set('Authorization', auth(adminToken));
    expect(noShow.status).toBe(200);
    expect(data<{ status: string }>(noShow).status).toBe('NO_SHOW');

    const blocked = await request(server())
      .patch(`/api/v1/reservations/${reservation.id}/complete`)
      .set('Authorization', auth(clientToken));
    expect(blocked.status).toBe(403);
  });
});
