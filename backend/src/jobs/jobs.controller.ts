import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import {
  CHECK_EXPIRATIONS_JOB,
  CHECK_OVERDUE_JOB,
  CONTRACTS_QUEUE,
  FINANCIAL_QUEUE,
} from './jobs.constants.js';

@Roles(Role.ADMIN)
@Controller('jobs')
export class JobsController {
  constructor(
    @InjectQueue(CONTRACTS_QUEUE) private readonly contractsQueue: Queue,
    @InjectQueue(FINANCIAL_QUEUE) private readonly financialQueue: Queue,
  ) {}

  @Post('contracts/run-now')
  async runContractsJobNow() {
    const job = await this.contractsQueue.add(CHECK_EXPIRATIONS_JOB, {});
    return { enqueued: true, jobId: job.id };
  }

  @Post('financial/run-now')
  async runFinancialJobNow() {
    const job = await this.financialQueue.add(CHECK_OVERDUE_JOB, {});
    return { enqueued: true, jobId: job.id };
  }
}
