import { resolve } from 'node:path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { StorageConfig } from './config/storage.config.js';
import appConfig from './config/configuration.js';
import authConfig from './config/auth.config.js';
import databaseConfig from './config/database.config.js';
import storageConfig from './config/storage.config.js';
import redisConfig from './config/redis.config.js';
import { validationSchema } from './config/validation.js';
import { HealthModule } from './health/health.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { RateLimiterService } from './common/rate-limit/rate-limiter.service.js';
import { ThrottleGuard } from './common/rate-limit/throttle.guard.js';
import { UploadsModule } from './uploads/uploads.module.js';
import { UsersModule } from './users/users.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { CreditsModule } from './credits/credits.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { FinancialModule } from './financial/financial.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { RedisModule } from './redis/redis.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AuditModule } from './audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [appConfig, authConfig, databaseConfig, storageConfig, redisConfig],
      validationSchema,
    }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const storageConfig =
          configService.getOrThrow<StorageConfig>('storage');
        if (storageConfig.driver !== 'local') {
          return [];
        }
        return [
          {
            rootPath: resolve(storageConfig.localPath),
            serveRoot: new URL(storageConfig.publicUrl).pathname,
          },
        ];
      },
    }),
    PrismaModule,
    RedisModule,
    UploadsModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    SchedulesModule,
    CreditsModule,
    ReservationsModule,
    ContractsModule,
    FinancialModule,
    PaymentsModule,
    ReceiptsModule,
    JobsModule,
    DashboardModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    RateLimiterService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
