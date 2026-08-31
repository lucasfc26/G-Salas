import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import {
  CHECK_EXPIRATIONS_JOB,
  CHECK_OVERDUE_JOB,
  CONTRACTS_QUEUE,
  FINANCIAL_QUEUE,
} from './jobs.constants.js';

/** Daily 08:00 triggers (roadmap section 22) that enqueue work onto BullMQ
 * instead of running it inline — a slow sweep never blocks the cron tick. */
@Injectable()
export class JobsScheduler {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    @InjectQueue(CONTRACTS_QUEUE) private readonly contractsQueue: Queue,
    @InjectQueue(FINANCIAL_QUEUE) private readonly financialQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async triggerContractExpirationCheck(): Promise<void> {
    await this.contractsQueue.add(CHECK_EXPIRATIONS_JOB, {});
    this.logger.log('Job de expiração de contratos enfileirado.');
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async triggerFinancialCheck(): Promise<void> {
    await this.financialQueue.add(CHECK_OVERDUE_JOB, {});
    this.logger.log('Job financeiro (vencimentos) enfileirado.');
  }
}
