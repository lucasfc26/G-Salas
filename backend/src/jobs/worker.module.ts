import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from '../config/configuration.js';
import authConfig from '../config/auth.config.js';
import databaseConfig from '../config/database.config.js';
import storageConfig from '../config/storage.config.js';
import redisConfig from '../config/redis.config.js';
import { validationSchema } from '../config/validation.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ContractsModule } from '../contracts/contracts.module.js';
import { FinancialModule } from '../financial/financial.module.js';
import { bullConnectionFactory } from './bull-connection.js';
import { CONTRACTS_QUEUE, FINANCIAL_QUEUE } from './jobs.constants.js';
import { ContractsProcessor } from './processors/contracts.processor.js';
import { FinancialProcessor } from './processors/financial.processor.js';

/**
 * Entry point for the separate "worker" container: only the pieces a
 * @Processor needs (DB, cache, the domain services it calls) — no HTTP
 * server, no controllers, no cron scheduler (that stays in the API
 * process so a job is never enqueued twice).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
      load: [appConfig, authConfig, databaseConfig, storageConfig, redisConfig],
      validationSchema,
    }),
    PrismaModule,
    RedisModule,
    UploadsModule,
    NotificationsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    BullModule.registerQueue(
      { name: CONTRACTS_QUEUE },
      { name: FINANCIAL_QUEUE },
    ),
    ContractsModule,
    FinancialModule,
  ],
  providers: [ContractsProcessor, FinancialProcessor],
})
export class WorkerModule {}
