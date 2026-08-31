import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import type { ListInvoicesQueryDto } from './dto/list-invoices-query.dto.js';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({ data: dto });

      await this.notifications.create(
        {
          userId: dto.userId,
          type: 'PAYMENT_PENDING',
          title: 'Nova cobrança',
          body: `Uma nova cobrança de R$ ${dto.amount.toFixed(2)} vence em ${dto.dueDate.toISOString().slice(0, 10)}.`,
          metadata: { invoiceId: invoice.id },
        },
        tx,
      );

      return invoice;
    });
  }

  async getById(id: string, requester: AuthenticatedUser) {
    const invoice = await this.mustFind(id);
    if (requester.role !== 'ADMIN' && invoice.userId !== requester.id) {
      throw new ForbiddenException('Você não tem acesso a esta cobrança.');
    }
    return invoice;
  }

  async list(query: ListInvoicesQueryDto, requester: AuthenticatedUser) {
    const where = {
      userId: requester.role === 'ADMIN' ? query.userId : requester.id,
      status: query.status,
    };

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { dueDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { user: { select: { name: true } } },
      }),
    ]);

    return {
      data: invoices,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async cancel(id: string) {
    const invoice = await this.mustFind(id);
    if (invoice.status === 'PAID') {
      throw new BadRequestException(
        'Uma cobrança já paga não pode ser cancelada.',
      );
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /** Marks PENDING invoices past their due date as OVERDUE — called daily
   * by the "financial" queue job. */
  async markOverdueInvoices(): Promise<number> {
    const { count } = await this.prisma.invoice.updateMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      data: { status: 'OVERDUE' },
    });
    return count;
  }

  /** Reminds clients of a PENDING invoice due within the next 3 days — once
   * per day per invoice. Same daily "financial" queue job as above. */
  async remindUpcomingInvoices(): Promise<number> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date(now.getTime() + 3 * 86_400_000);

    const invoices = await this.prisma.invoice.findMany({
      where: { status: 'PENDING', dueDate: { gte: now, lte: windowEnd } },
    });

    let reminded = 0;
    for (const invoice of invoices) {
      const alreadyRemindedToday = await this.prisma.notification.findMany({
        where: {
          userId: invoice.userId,
          type: 'PAYMENT_PENDING',
          createdAt: { gte: startOfToday },
        },
      });
      const seen = alreadyRemindedToday.some(
        (n) =>
          (n.metadata as { invoiceId?: string } | null)?.invoiceId ===
          invoice.id,
      );
      if (seen) continue;

      await this.notifications.create({
        userId: invoice.userId,
        type: 'PAYMENT_PENDING',
        title: 'Cobrança próxima do vencimento',
        body: `Sua cobrança de R$ ${invoice.amount.toFixed(2)} vence em ${invoice.dueDate
          .toISOString()
          .slice(0, 10)}.`,
        metadata: { invoiceId: invoice.id },
      });
      reminded++;
    }

    return reminded;
  }

  private async mustFind(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Cobrança não encontrada.');
    }
    return invoice;
  }
}
