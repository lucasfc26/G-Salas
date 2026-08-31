import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  it('/api/health (GET) returns ok status', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }: { body: { data: { status: string } } }) => {
        expect(body.data.status).toBe('ok');
      });
  });

  it('/api/health/database (GET) confirms a live Postgres connection', () => {
    return request(app.getHttpServer())
      .get('/api/health/database')
      .expect(200)
      .expect(({ body }: { body: { data: { database: string } } }) => {
        expect(body.data.database).toBe('up');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
