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

describe('Schedules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let clientToken: string;
  let clientUserId: string;
  let roomId: string;

  const dateStr = '2027-03-15';
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

    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@esalas.dev', password: 'Senha@123' });
    clientToken = data<{ accessToken: string }>(clientLogin).accessToken;
    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${clientToken}`);
    clientUserId = data<{ id: string }>(me).id;

    const room = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Sala Agenda ${Date.now()}`,
        capacity: 2,
        hourlyPrice: 50,
      });
    roomId = data<{ id: string }>(room).id;
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

  it('rejects an availability rule with startTime >= endTime', async () => {
    const res = await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', auth(adminToken))
      .send({ roomId, weekday, startTime: '10:00', endTime: '09:00' });
    expect(res.status).toBe(400);
  });

  it('blocks non-admins from creating availability rules', async () => {
    const res = await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', auth(clientToken))
      .send({ roomId, weekday, startTime: '08:00', endTime: '12:00' });
    expect(res.status).toBe(403);
  });

  it('computes free slots from an availability rule alone', async () => {
    await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', auth(adminToken))
      .send({ roomId, weekday, startTime: '08:00', endTime: '12:00' });

    const res = await request(server())
      .get(`/api/v1/schedules/rooms/${roomId}/slots?date=${dateStr}`)
      .set('Authorization', auth(clientToken));

    expect(res.status).toBe(200);
    expect(data<{ slots: unknown[] }>(res).slots).toEqual([
      { start: '08:00', end: '12:00' },
    ]);
  });

  it('subtracts a blocked period from the available slots', async () => {
    await request(server())
      .post('/api/v1/schedules/blocked-periods')
      .set('Authorization', auth(adminToken))
      .send({
        roomId,
        startAt: `${dateStr}T09:00:00.000Z`,
        endAt: `${dateStr}T09:30:00.000Z`,
        type: 'MAINTENANCE',
      });

    const res = await request(server())
      .get(`/api/v1/schedules/rooms/${roomId}/slots?date=${dateStr}`)
      .set('Authorization', auth(clientToken));

    expect(data<{ slots: unknown[] }>(res).slots).toEqual([
      { start: '08:00', end: '09:00' },
      { start: '09:30', end: '12:00' },
    ]);
  });

  it('subtracts an existing reservation from the available slots', async () => {
    await prisma.reservation.create({
      data: {
        userId: clientUserId,
        roomId,
        startAt: new Date(`${dateStr}T10:00:00.000Z`),
        endAt: new Date(`${dateStr}T10:30:00.000Z`),
        duration: 30,
        status: 'CONFIRMED',
      },
    });

    const res = await request(server())
      .get(`/api/v1/schedules/rooms/${roomId}/slots?date=${dateStr}`)
      .set('Authorization', auth(clientToken));

    expect(data<{ slots: unknown[] }>(res).slots).toEqual([
      { start: '08:00', end: '09:00' },
      { start: '09:30', end: '10:00' },
      { start: '10:30', end: '12:00' },
    ]);
  });

  it('returns no slots for a room that is not AVAILABLE', async () => {
    await request(server())
      .patch(`/api/v1/rooms/${roomId}`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'MAINTENANCE' });

    const res = await request(server())
      .get(`/api/v1/schedules/rooms/${roomId}/slots?date=${dateStr}`)
      .set('Authorization', auth(clientToken));

    const body = data<{ slots: unknown[]; roomStatus: string }>(res);
    expect(body.roomStatus).toBe('MAINTENANCE');
    expect(body.slots).toEqual([]);
  });
});
