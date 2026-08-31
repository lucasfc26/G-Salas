import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { InvoicesService } from '../../financial/invoices.service.js';
import { FINANCIAL_QUEUE } from '../jobs.constants.js';

@Processor(FINANCIAL_QUEUE)
export class FinancialProcessor extends WorkerHost {
  private readonly logger = new Logger(FinancialProcessor.name);

  constructor(private readonly invoicesService: InvoicesService) {
    super();
  }

  async process(job: Job): Promise<{ overdue: number; reminded: number }> {
    const overdue = await this.invoicesService.markOverdueInvoices();
    const reminded = await this.invoicesService.remindUpcomingInvoices();
    this.logger.log(
      `[${job.name}] ${overdue} cobrança(s) marcada(s) como vencida(s), ${reminded} lembrete(s) enviado(s).`,
    );
    return { overdue, reminded };
  }
}
