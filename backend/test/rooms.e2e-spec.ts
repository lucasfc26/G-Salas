import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

function data<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

describe('Rooms (e2e)', () => {
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
      .send({ email: 'admin@lumiar.dev', password: 'Senha@123' });
    adminToken = data<{ accessToken: string }>(adminLogin).accessToken;

    const clientLogin = await request(server())
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@lumiar.dev', password: 'Senha@123' });
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

  it('blocks room creation for non-admins', async () => {
    const res = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(clientToken))
      .send({ name: 'Sala X', capacity: 2, hourlyPrice: 50 });
    expect(res.status).toBe(403);
  });

  it('lets an admin create, list and fetch a room', async () => {
    const uniqueName = `Sala Serenidade ${Date.now()}`;
    const create = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(adminToken))
      .send({
        name: uniqueName,
        description: 'Sala silenciosa para atendimento individual.',
        type: 'Individual',
        capacity: 3,
        amenities: ['Wi-Fi', 'Ar-condicionado'],
        hourlyPrice: 75.5,
      });
    expect(create.status).toBe(201);
    const room = data<{ id: string; hourlyPrice: string; image: unknown }>(
      create,
    );
    expect(room.image).toBeNull();

    // Filter by this test's own unique name — the dev DB accumulates rooms
    // across test runs, so an unfiltered page could easily miss it.
    const list = await request(server())
      .get(`/api/v1/rooms?search=${encodeURIComponent(uniqueName)}`)
      .set('Authorization', auth(clientToken));
    expect(list.status).toBe(200);
    expect(data<{ id: string }[]>(list).some((r) => r.id === room.id)).toBe(
      true,
    );

    const single = await request(server())
      .get(`/api/v1/rooms/${room.id}`)
      .set('Authorization', auth(clientToken));
    expect(single.status).toBe(200);
    expect(data<{ name: string }>(single).name).toContain('Sala Serenidade');
  });

  it('returns 404 for a non-existent room', async () => {
    const res = await request(server())
      .get('/api/v1/rooms/does-not-exist')
      .set('Authorization', auth(clientToken));
    expect(res.status).toBe(404);
  });

  it('updates a room and soft-deletes it via status', async () => {
    const create = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(adminToken))
      .send({ name: `Sala Temp ${Date.now()}`, capacity: 1, hourlyPrice: 40 });
    const room = data<{ id: string }>(create);

    const update = await request(server())
      .patch(`/api/v1/rooms/${room.id}`)
      .set('Authorization', auth(adminToken))
      .send({ status: 'INACTIVE', hourlyPrice: 45 });
    expect(update.status).toBe(200);
    const updated = data<{ status: string; hourlyPrice: string }>(update);
    expect(updated.status).toBe('INACTIVE');
  });

  it('uploads and processes a room image', async () => {
    const create = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(adminToken))
      .send({ name: `Sala Foto ${Date.now()}`, capacity: 2, hourlyPrice: 60 });
    const room = data<{ id: string }>(create);

    const png = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 5, g: 5, b: 5 },
      },
    })
      .png()
      .toBuffer();

    const upload = await request(server())
      .post(`/api/v1/rooms/${room.id}/image`)
      .set('Authorization', auth(adminToken))
      .attach('file', png, 'room.png');

    expect(upload.status).toBe(201);
    const updated = data<{
      image: { thumbnail: string; medium: string; original: string };
    }>(upload);
    expect(updated.image.medium).toMatch(
      new RegExp(`/uploads/rooms/${room.id}/.+/medium\\.webp$`),
    );
  });

  it('blocks non-admins from uploading a room image', async () => {
    const create = await request(server())
      .post('/api/v1/rooms')
      .set('Authorization', auth(adminToken))
      .send({
        name: `Sala Bloqueada ${Date.now()}`,
        capacity: 2,
        hourlyPrice: 60,
      });
    const room = data<{ id: string }>(create);

    const res = await request(server())
      .post(`/api/v1/rooms/${room.id}/image`)
      .set('Authorization', auth(clientToken))
      .attach('file', Buffer.from('irrelevant'), 'x.png');
    expect(res.status).toBe(403);
  });
});
