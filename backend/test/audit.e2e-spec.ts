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

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Audit (e2e)', () => {
  let app: INestApplication<App>;
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

    const adminLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@lumiar.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientEmail = `audit-client-${Date.now()}@lumiar.dev`;
    const created = await request(server())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente Audit',
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

  it('blocks non-admins from reading the audit trail', async () => {
    const res = await request(server())
      .get('/api/v1/audit-logs')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(403);
  });

  it('records a LOGIN entry queryable by an admin', async () => {
    const res = await request(server())
      .get(`/api/v1/audit-logs?userId=${clientUserId}&action=LOGIN`)
      .set('Authorization', auth(adminToken));

    expect(res.status).toBe(200);
    const logs =
      data<{ action: string; userId: string; user: { email: string } }[]>(res);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('LOGIN');
    expect(logs[0].userId).toBe(clientUserId);
  });

  it('records a LOGOUT entry after logging out', async () => {
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@lumiar.dev', password: 'Senha@123' });
    const { refreshToken } = data<{ refreshToken: string }>(login);
    await request(server()).post('/api/v1/auth/logout').send({ refreshToken });

    const res = await request(server())
      .get('/api/v1/audit-logs?action=LOGOUT')
      .set('Authorization', auth(adminToken));
    expect(data<unknown[]>(res).length).toBeGreaterThan(0);
  });

  it('records USER_UPDATE when a client edits their own profile', async () => {
    await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', auth(clientToken))
      .send({ phone: '11977776666' });

    const history = await request(server())
      .get(`/api/v1/audit-logs/entity/User/${clientUserId}`)
      .set('Authorization', auth(adminToken));
    expect(history.status).toBe(200);
    const entries = data<{ action: string }[]>(history);
    expect(entries.some((e) => e.action === 'USER_UPDATE')).toBe(true);
  });

  it('fetches a single audit log entry by id', async () => {
    const list = await request(server())
      .get('/api/v1/audit-logs?limit=1')
      .set('Authorization', auth(adminToken));
    const [entry] = data<{ id: string }[]>(list);

    const single = await request(server())
      .get(`/api/v1/audit-logs/${entry.id}`)
      .set('Authorization', auth(adminToken));
    expect(single.status).toBe(200);
    expect(data<{ id: string }>(single).id).toBe(entry.id);
  });
});
