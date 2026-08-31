import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InsufficientCreditsException } from '../common/exceptions/insufficient-credits.exception.js';

export type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

export interface LedgerReference {
  referenceType?: string;
  referenceId?: string;
  description?: string;
}

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(id: string) {
    const wallet = await this.prisma.creditWallet.findUnique({ where: { id } });
    if (!wallet) {
      throw new NotFoundException('Carteira de créditos não encontrada.');
    }
    return wallet;
  }

  async getWalletForRequester(walletId: string, requester: AuthenticatedUser) {
    const wallet = await this.getWallet(walletId);
    if (requester.role !== 'ADMIN' && wallet.userId !== requester.id) {
      throw new ForbiddenException(
        'Você não tem acesso a esta carteira de créditos.',
      );
    }
    return wallet;
  }

  async getActiveWalletForUser(userId: string) {
    const now = new Date();
    const contract = await this.prisma.contract.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'EXPIRING_SOON', 'RENEWAL'] }, endDate: { gte: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) {
      const fallback = await this.prisma.creditWallet.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (!fallback) {
        throw new NotFoundException('Nenhuma carteira de créditos encontrada.');
      }
      return fallback;
    }
    return this.getWalletForUser(userId, contract.id);
  }

  async getWalletForUser(userId: string, contractId: string) {
    const wallet = await this.prisma.creditWallet.findFirst({
      where: { userId, contractId },
    });
    if (!wallet) {
      throw new NotFoundException(
        'Carteira de créditos não encontrada para este contrato.',
      );
    }
    return wallet;
  }

  async listTransactions(walletId: string, page: number, limit: number) {
    const [total, transactions] = await this.prisma.$transaction([
      this.prisma.creditTransaction.count({ where: { walletId } }),
      this.prisma.creditTransaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: transactions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Grants (adds) credits — used when a contract is created/renewed. */
  async grant(
    walletId: string,
    amount: number,
    ref: LedgerReference,
    client: PrismaClientOrTx = this.prisma,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await client.creditWallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
        totalGranted: { increment: amount },
      },
    });
    await client.creditTransaction.create({
      data: { walletId, type: 'CREDIT', amount, ...ref },
    });
    return wallet;
  }

  /**
   * Debits credits atomically: the WHERE clause enforces `balance >= amount`
   * in the same UPDATE statement, so two concurrent debits can never both
   * succeed against an insufficient balance (roadmap Fase 9/33 — no
   * check-then-write race).
   */
  async debit(
    walletId: string,
    amount: number,
    ref: LedgerReference,
    client: PrismaClientOrTx = this.prisma,
  ) {
    this.assertPositiveAmount(amount);
    const { count } = await client.creditWallet.updateMany({
      where: { id: walletId, balance: { gte: amount } },
      data: {
        balance: { decrement: amount },
        totalUsed: { increment: amount },
      },
    });

    if (count === 0) {
      const wallet = await client.creditWallet.findUnique({
        where: { id: walletId },
      });
      if (!wallet) {
        throw new NotFoundException('Carteira de créditos não encontrada.');
      }
      throw new InsufficientCreditsException();
    }

    await client.creditTransaction.create({
      data: { walletId, type: 'DEBIT', amount: -amount, ...ref },
    });
    return client.creditWallet.findUniqueOrThrow({ where: { id: walletId } });
  }

  /** Refunds previously debited credits (e.g. cancellation within policy). */
  async refund(
    walletId: string,
    amount: number,
    ref: LedgerReference,
    client: PrismaClientOrTx = this.prisma,
  ) {
    this.assertPositiveAmount(amount);
    const wallet = await client.creditWallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
        totalUsed: { decrement: amount },
      },
    });
    await client.creditTransaction.create({
      data: { walletId, type: 'REFUND', amount, ...ref },
    });
    return wallet;
  }

  /** Manual admin adjustment — positive or negative, never below zero. */
  async adjust(
    walletId: string,
    delta: number,
    ref: LedgerReference,
    client: PrismaClientOrTx = this.prisma,
  ) {
    if (!Number.isInteger(delta) || delta === 0) {
      throw new BadRequestException(
        'O ajuste deve ser um inteiro diferente de zero.',
      );
    }

    if (delta < 0) {
      const { count } = await client.creditWallet.updateMany({
        where: { id: walletId, balance: { gte: -delta } },
        data: { balance: { decrement: -delta } },
      });
      if (count === 0) {
        throw new InsufficientCreditsException(
          'Saldo insuficiente para aplicar o ajuste negativo.',
        );
      }
    } else {
      await client.creditWallet.update({
        where: { id: walletId },
        data: { balance: { increment: delta } },
      });
    }

    await client.creditTransaction.create({
      data: { walletId, type: 'ADJUSTMENT', amount: delta, ...ref },
    });
    return client.creditWallet.findUniqueOrThrow({ where: { id: walletId } });
  }

  /** Expires unused credits (e.g. monthly reset job — roadmap Fase 13). */
  async expire(
    walletId: string,
    amount: number,
    ref: LedgerReference,
    client: PrismaClientOrTx = this.prisma,
  ) {
    this.assertPositiveAmount(amount);
    const { count } = await client.creditWallet.updateMany({
      where: { id: walletId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (count === 0) {
      throw new InsufficientCreditsException(
        'Saldo insuficiente para expirar.',
      );
    }
    await client.creditTransaction.create({
      data: { walletId, type: 'EXPIRATION', amount: -amount, ...ref },
    });
    return client.creditWallet.findUniqueOrThrow({ where: { id: walletId } });
  }

  private assertPositiveAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        'O valor de créditos deve ser um inteiro positivo.',
      );
    }
  }
}
