import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { PaymentAlreadyProcessedException } from '../common/exceptions/payment-already-processed.exception.js';
import type { PrismaClientOrTx } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException('Cobrança não encontrada.');
    }
    if (invoice.userId !== userId) {
      throw new ForbiddenException('Esta cobrança não pertence a você.');
    }
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new BadRequestException(
        'Esta cobrança não aceita novos pagamentos.',
      );
    }

    return this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        userId,
        amount: invoice.amount,
        method: dto.method,
      },
    });
  }

  /**
   * Approves a payment: Payment -> APPROVED, its Invoice -> PAID, all in one
   * transaction (roadmap section 32 — "Integridade financeira"). Accepts an
   * external transaction client so the receipt-review flow (Fase 11) can
   * compose this with its own PaymentReceipt update atomically.
   */
  async approve(
    paymentId: string,
    adminId: string,
    client: PrismaClientOrTx = this.prisma,
  ) {
    const payment = await client.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (payment.status === 'APPROVED') {
      throw new PaymentAlreadyProcessedException();
    }

    const updated = await client.payment.update({
      where: { id: paymentId },
      data: { status: 'APPROVED', paidAt: new Date() },
    });

    await client.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'PAID' },
    });

    await client.auditLog.create({
      data: {
        userId: adminId,
        action: 'APPROVE_PAYMENT',
        entity: 'Payment',
        entityId: paymentId,
      },
    });

    await this.notifications.create(
      {
        userId: payment.userId,
        type: 'PAYMENT_APPROVED',
        title: 'Pagamento aprovado',
        body: 'Seu pagamento foi aprovado e a cobrança foi quitada.',
        metadata: { paymentId },
      },
      client,
    );

    return updated;
  }

  async reject(paymentId: string, adminId: string, reason: string | undefined) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    if (payment.status === 'APPROVED') {
      throw new PaymentAlreadyProcessedException();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED' },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'REJECT_PAYMENT',
          entity: 'Payment',
          entityId: paymentId,
          metadata: reason ? { reason } : undefined,
        },
      });

      await this.notifications.create(
        {
          userId: payment.userId,
          type: 'PAYMENT_REJECTED',
          title: 'Pagamento rejeitado',
          body: reason
            ? `Seu pagamento foi rejeitado: ${reason}`
            : 'Seu pagamento foi rejeitado.',
          metadata: { paymentId, reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  async getById(id: string, requester: AuthenticatedUser) {
    const payment = await this.mustFind(id);
    if (requester.role !== 'ADMIN' && payment.userId !== requester.id) {
      throw new ForbiddenException('Você não tem acesso a este pagamento.');
    }
    return payment;
  }

  async list(query: ListPaymentsQueryDto, requester: AuthenticatedUser) {
    const where = {
      userId: requester.role === 'ADMIN' ? query.userId : requester.id,
      status: query.status,
    };

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: { select: { name: true } },
          invoice: true,
          receipt: true,
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private async mustFind(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }
    return payment;
  }
}
