import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import type { StorageConfig } from '../src/config/storage.config.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let clientToken: string;

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
      .send({ email: 'admin@gsalas.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@gsalas.dev', password: 'Senha@123' });
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

  it('returns the current user profile with nested professional data', async () => {
    const res = await request(server())
      .get('/api/v1/users/me')
      .set('Authorization', auth(clientToken));

    expect(res.status).toBe(200);
    const profile = data<{
      email: string;
      professionalProfile: { profession: string };
    }>(res);
    expect(profile.email).toBe('cliente@gsalas.dev');
    expect(profile.professionalProfile.profession).toEqual(expect.any(String));
  });

  it('updates basic profile fields', async () => {
    const res = await request(server())
      .patch('/api/v1/users/me')
      .set('Authorization', auth(clientToken))
      .send({ phone: '11988887777' });

    expect(res.status).toBe(200);
    expect(data<{ phone: string }>(res).phone).toBe('11988887777');
  });

  it('upserts the professional profile and then the address', async () => {
    const profileRes = await request(server())
      .put('/api/v1/users/me/professional-profile')
      .set('Authorization', auth(clientToken))
      .send({
        profession: 'Psicóloga Clínica',
        specialties: ['TCC', 'Casais'],
      });
    expect(profileRes.status).toBe(200);

    const addressRes = await request(server())
      .put('/api/v1/users/me/address')
      .set('Authorization', auth(clientToken))
      .send({
        zipCode: '01310-000',
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      });
    expect(addressRes.status).toBe(200);
    const profile = data<{
      professionalProfile: { profession: string; address: { city: string } };
    }>(addressRes);
    expect(profile.professionalProfile.profession).toBe('Psicóloga Clínica');
    expect(profile.professionalProfile.address.city).toBe('São Paulo');
  });

  it('uploads and processes an avatar into thumbnail/medium/original variants', async () => {
    const png = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const res = await request(server())
      .post('/api/v1/users/me/avatar')
      .set('Authorization', auth(clientToken))
      .attach('file', png, 'avatar.png');

    expect(res.status).toBe(201);
    const profile = data<{
      avatar: { thumbnail: string; medium: string; original: string };
    }>(res);
    expect(profile.avatar.thumbnail).toMatch(
      /\/uploads\/avatars\/.+\/thumbnail\.webp$/,
    );

    // ServeStaticModule isn't wired up by Nest's TestingModule harness (it
    // works against the real bootstrap — verified manually with curl), so
    // here we confirm the processed variant actually landed on disk.
    const storageConfig = app
      .get(ConfigService)
      .getOrThrow<StorageConfig>('storage');
    const thumbnailPath = new URL(profile.avatar.thumbnail).pathname.replace(
      new URL(storageConfig.publicUrl).pathname,
      '',
    );
    await expect(
      access(resolve(storageConfig.localPath, `.${thumbnailPath}`)),
    ).resolves.toBeUndefined();
  });

  it('rejects a non-image file for the avatar endpoint', async () => {
    const res = await request(server())
      .post('/api/v1/users/me/avatar')
      .set('Authorization', auth(clientToken))
      .attach('file', Buffer.from('not an image'), 'fake.png');

    expect(res.status).toBe(400);
  });

  it('blocks non-admins from listing users', async () => {
    const res = await request(server())
      .get('/api/v1/users')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(403);
  });

  it('lets an admin list and paginate users', async () => {
    const res = await request(server())
      .get('/api/v1/users?limit=1&page=1')
      .set('Authorization', auth(adminToken));

    expect(res.status).toBe(200);
    const meta = (res.body as { meta: { limit: number } }).meta;
    expect(meta.limit).toBe(1);
    expect(data<unknown[]>(res).length).toBe(1);
  });

  it('lets an admin create a user and rejects a duplicate e-mail', async () => {
    const email = `novo-${Date.now()}@gsalas.dev`;
    const create = await request(server())
      .post('/api/v1/users')
      .set('Authorization', auth(adminToken))
      .send({
        name: 'Novo Profissional',
        email,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    expect(create.status).toBe(201);

    const duplicate = await request(server())
      .post('/api/v1/users')
      .set('Authorization', auth(adminToken))
      .send({ name: 'Outro', email, role: 'CLIENT', password: 'Senha@123' });
    expect(duplicate.status).toBe(409);
  });

  it('lets an admin suspend a user, revoking their sessions', async () => {
    const email = `suspender-${Date.now()}@gsalas.dev`;
    const create = await request(server())
      .post('/api/v1/users')
      .set('Authorization', auth(adminToken))
      .send({
        name: 'Vai Ser Suspenso',
        email,
        role: 'CLIENT',
        password: 'Senha@123',
      });
    const userId = data<{ id: string }>(create).id;

    const login = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Senha@123' });
    const { refreshToken } = data<{ refreshToken: string }>(login);

    const suspend = await request(server())
      .patch(`/api/v1/users/${userId}/status`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'SUSPENDED' });
    expect(suspend.status).toBe(200);

    const refreshAfterSuspend = await request(server())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(refreshAfterSuspend.status).toBe(401);

    const loginAfterSuspend = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Senha@123' });
    expect(loginAfterSuspend.status).toBe(401);
  });
});
