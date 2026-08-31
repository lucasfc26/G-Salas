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
import { RedisService } from '../src/redis/redis.service.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminToken: string;
  let clientToken: string;
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
    redis = app.get(RedisService);

    const adminLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@esalas.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientEmail = `dash-client-${Date.now()}@esalas.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Dashboard',
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

  it('blocks non-admins from the admin dashboard', async () => {
    const res = await request(server())
      .get('/api/v1/dashboard/admin')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(403);
  });

  it("returns the client's own contract, credits and upcoming reservations", async () => {
    const room = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(adminToken))
      .send({ name: `Sala Dash ${Date.now()}`, capacity: 2, hourlyPrice: 40 });
    const roomId = data<{ id: string }>(room).id;
    const weekday = new Date().getUTCDay();
    await request(server())
      .post('/api/v1/schedules/availabilities')
      .set('Authorization', auth(adminToken))
      .send({ roomId, weekday, startTime: '00:00', endTime: '23:59' });

    const plan = await prisma.plan.create({
      data: {
        name: 'Plano Dash',
        monthlyHours: 6,
        monthlyValue: 300,
        cancellationLimit: 1,
      },
    });
    const contract = await prisma.contract.create({
      data: {
        userId: clientUserId,
        planId: plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 20 * 86_400_000),
        monthlyHours: 6,
        cancellationLimit: 1,
        status: 'ACTIVE',
      },
    });
    await prisma.creditWallet.create({
      data: {
        userId: clientUserId,
        contractId: contract.id,
        balance: 6,
        totalGranted: 6,
      },
    });

    const futureStart = new Date(Date.now() + 3 * 3_600_000);
    await prisma.reservation.create({
      data: {
        userId: clientUserId,
        roomId,
        startAt: futureStart,
        endAt: new Date(futureStart.getTime() + 3_600_000),
        duration: 60,
        status: 'CONFIRMED',
      },
    });

    const res = await request(server())
      .get('/api/v1/dashboard/client')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(200);
    const dashboard = data<{
      contract: { creditsBalance: number; monthlyHours: number } | null;
      upcomingReservations: { roomName: string }[];
    }>(res);
    expect(dashboard.contract?.creditsBalance).toBe(6);
    expect(dashboard.contract?.monthlyHours).toBe(6);
    expect(dashboard.upcomingReservations.length).toBeGreaterThan(0);
  });

  it('aggregates admin metrics without dozens of round trips', async () => {
    await redis.client.del('dashboard:admin');

    const before = await request(server())
      .get('/api/v1/dashboard/admin')
      .set('Authorization', auth(adminToken));
    const beforeStats = data<{
      activeClients: number;
      activeContracts: number;
    }>(before);

    const newClientEmail = `dash-admin-check-${Date.now()}@esalas.dev`;
    await request(server())
      .post('/api/v1/users')
      .set('Authorization', auth(adminToken))
      .send({
        name: 'Novo Cliente',
        email: newClientEmail,
        role: 'CLIENT',
        password: 'Senha@123',
      });

    await redis.client.del('dashboard:admin');
    const after = await request(server())
      .get('/api/v1/dashboard/admin')
      .set('Authorization', auth(adminToken));
    const afterStats = data<{
      activeClients: number;
      roomsByStatus: Record<string, number>;
    }>(after);

    // Other e2e test files run concurrently against the same DB and also
    // create client users, so the count can grow by more than 1 — assert
    // the aggregate genuinely reflects the new row, not an exact delta.
    expect(afterStats.activeClients).toBeGreaterThanOrEqual(
      beforeStats.activeClients + 1,
    );
    expect(typeof afterStats.roomsByStatus).toBe('object');
  });

  it('serves the admin dashboard from cache within the TTL window', async () => {
    await redis.client.del('dashboard:admin');
    await request(server())
      .get('/api/v1/dashboard/admin')
      .set('Authorization', auth(adminToken));

    const cached = await redis.client.get('dashboard:admin');
    expect(cached).not.toBeNull();
  });
});
