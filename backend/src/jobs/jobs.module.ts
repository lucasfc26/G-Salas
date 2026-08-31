import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { bullConnectionFactory } from './bull-connection.js';
import { JobsController } from './jobs.controller.js';
import { JobsScheduler } from './jobs.scheduler.js';
import { CONTRACTS_QUEUE, FINANCIAL_QUEUE } from './jobs.constants.js';

/**
 * The API process only *produces* jobs (cron trigger + manual admin
 * trigger) — it never runs a @Processor. Actual processing happens in the
 * separate worker process (see src/worker.ts / WorkerModule) so a slow job
 * can never starve HTTP request handling, and each can scale independently
 * (roadmap section 43 — "não executar tudo dentro do mesmo container").
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: bullConnectionFactory,
    }),
    BullModule.registerQueue(
      { name: CONTRACTS_QUEUE },
      { name: FINANCIAL_QUEUE },
    ),
  ],
  controllers: [JobsController],
  providers: [JobsScheduler],
})
export class JobsModule {}
