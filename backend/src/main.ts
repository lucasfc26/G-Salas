import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/configuration.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  // Behind NGINX/Cloudflare in production — trust X-Forwarded-For so
  // req.ip (rate limiting, audit logs) reflects the real client.
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: appConfig.env === 'production' ? undefined : false,
    }),
  );
  app.use(compression());

  // CSRF: no dedicated CSRF middleware is used. This API is stateless and
  // authenticates purely via a bearer JWT in the Authorization header —
  // never via a cookie the browser attaches automatically — so there is no
  // ambient credential for a forged cross-site request to ride on. CORS
  // (below) with an explicit origin allowlist plus the requirement that a
  // caller must read and attach the token itself is the actual mitigation
  // here (roadmap section 53/checklist item "CSRF strategy").
  app.enableCors({
    origin: appConfig.corsOrigins.length > 0 ? appConfig.corsOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion.replace(/^v/, ''),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (appConfig.env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Gestão de Salas API')
      .setDescription(
        'API do sistema de gestão de aluguel de salas para profissionais de saúde',
      )
      .setVersion(appConfig.apiVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

await bootstrap();
