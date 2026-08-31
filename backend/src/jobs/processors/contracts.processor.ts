import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ContractsService } from '../../contracts/contracts.service.js';
import { CONTRACTS_QUEUE } from '../jobs.constants.js';

@Processor(CONTRACTS_QUEUE)
export class ContractsProcessor extends WorkerHost {
  private readonly logger = new Logger(ContractsProcessor.name);

  constructor(private readonly contractsService: ContractsService) {
    super();
  }

  async process(
    job: Job,
  ): Promise<{ expiringAlerts: number; expired: number }> {
    const expiringAlerts = await this.contractsService.alertExpiringContracts();
    const expired = await this.contractsService.expireOverdueContracts();
    this.logger.log(
      `[${job.name}] ${expiringAlerts} alerta(s) de vencimento, ${expired} contrato(s) expirado(s).`,
    );
    return { expiringAlerts, expired };
  }
}
