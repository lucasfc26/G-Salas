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

interface TokenPairData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

function error(res: request.Response): ErrorEnvelope['error'] {
  return (res.body as ErrorEnvelope).error;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  const server = (): App => app.getHttpServer();

  it('rejects login with wrong password using a generic message', async () => {
    const res = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@lumiar.dev', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(error(res).message).toBe('Credenciais inválidas.');
  });

  it('rejects login for a non-existent e-mail with the same generic message', async () => {
    const res = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'nao-existe@lumiar.dev', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(error(res).message).toBe('Credenciais inválidas.');
  });

  it('blocks /auth/me without a token', async () => {
    const res = await request(server()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('logs in and returns a working token pair', async () => {
    const res = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@lumiar.dev', password: 'Senha@123' });

    expect(res.status).toBe(200);
    const tokens = data<TokenPairData>(res);
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));

    const me = await request(server())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(me.status).toBe(200);
    const profile = data<{ email: string; role: string }>(me);
    expect(profile.email).toBe('admin@lumiar.dev');
    expect(profile.role).toBe('ADMIN');
  });

  it('rotates the refresh token and revokes the old one', async () => {
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@lumiar.dev', password: 'Senha@123' });
    const { refreshToken: firstRefresh } = data<TokenPairData>(login);

    const refreshed = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(refreshed.status).toBe(200);
    const { refreshToken: secondRefresh } = data<TokenPairData>(refreshed);
    expect(secondRefresh).not.toBe(firstRefresh);

    // Reusing the already-rotated (revoked) token is treated as theft and
    // must invalidate every session — including the one just issued.
    const reuseAttempt = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefresh });
    expect(reuseAttempt.status).toBe(401);

    const secondRefreshNowRevoked = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: secondRefresh });
    expect(secondRefreshNowRevoked.status).toBe(401);
  });

  it('logs out and invalidates the refresh token', async () => {
    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@lumiar.dev', password: 'Senha@123' });
    const { refreshToken } = data<TokenPairData>(login);

    const logout = await request(server())
      .post('/api/v1/auth/logout')
      .send({ refreshToken });
    expect(logout.status).toBe(204);

    const refreshAfterLogout = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('never reveals whether an e-mail exists on forgot-password', async () => {
    const known = await request(server())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'admin@lumiar.dev' });
    const unknown = await request(server())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nao-existe@lumiar.dev' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(data<{ message: string }>(known).message).toBe(
      data<{ message: string }>(unknown).message,
    );
  });
});
