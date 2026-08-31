import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  UPLOAD_LIMITS,
} from '../common/constants/upload-limits.constants.js';
import { CreditsService } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FileValidationService } from '../uploads/file-validation.service.js';
import { StorageService } from '../uploads/storage/storage.service.js';
import type { CreateContractDto } from './dto/create-contract.dto.js';
import type { ListContractsQueryDto } from './dto/list-contracts-query.dto.js';
import type { RenewContractDto } from './dto/renew-contract.dto.js';
import type { UpdateContractDto } from './dto/update-contract.dto.js';

export const EXPIRATION_ALERT_THRESHOLDS_DAYS = [7, 15, 30] as const;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
    private readonly storage: StorageService,
    private readonly fileValidation: FileValidationService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateContractDto) {
    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('endDate deve ser posterior a startDate.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          userId: dto.userId,
          planId: dto.planId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          monthlyHours: dto.monthlyHours,
          cancellationLimit: dto.cancellationLimit,
          cancellationWindowHours: dto.cancellationWindowHours,
        },
      });

      const wallet = await tx.creditWallet.create({
        data: {
          userId: dto.userId,
          contractId: contract.id,
          balance: dto.monthlyHours,
          totalGranted: dto.monthlyHours,
        },
      });

      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: dto.monthlyHours,
          referenceType: 'CONTRACT',
          referenceId: contract.id,
          description: 'Concessão inicial do contrato',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_CONTRACT',
          entity: 'Contract',
          entityId: contract.id,
          userId: dto.userId,
        },
      });

      return this.toView(contract);
    });
  }

  async update(id: string, dto: UpdateContractDto, adminId: string) {
    await this.mustFind(id);
    const contract = await this.prisma.contract.update({
      where: { id },
      data: dto,
    });
    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE_CONTRACT',
        entity: 'Contract',
        entityId: id,
        userId: adminId,
      },
    });
    return this.toView(contract);
  }

  async renew(id: string, dto: RenewContractDto, adminId: string) {
    const contract = await this.mustFind(id);
    if (dto.endDate <= new Date()) {
      throw new BadRequestException(
        'A nova data de término deve ser no futuro.',
      );
    }

    const wallet = await this.prisma.creditWallet.findFirst({
      where: { contractId: id },
    });
    if (!wallet) {
      throw new NotFoundException(
        'Carteira de créditos do contrato não encontrada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: { endDate: dto.endDate, status: 'ACTIVE', cancellationsUsed: 0 },
      });

      await this.creditsService.grant(
        wallet.id,
        contract.monthlyHours,
        {
          referenceType: 'CONTRACT_RENEWAL',
          referenceId: id,
          description: 'Renovação de contrato',
        },
        tx,
      );

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_CONTRACT',
          entity: 'Contract',
          entityId: id,
          userId: adminId,
          metadata: { reason: 'renewal', newEndDate: dto.endDate },
        },
      });

      return this.toView(updated);
    });
  }

  async uploadDocument(id: string, file: Express.Multer.File, adminId: string) {
    await this.mustFind(id);
    const { ext } = await this.fileValidation.assertValid({
      buffer: file.buffer,
      maxBytes: UPLOAD_LIMITS.CONTRACT_MAX_BYTES,
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
    });

    const key = `contracts/${id}/${randomUUID()}.${ext}`;
    await this.storage.save(key, file.buffer, file.mimetype);

    const contract = await this.prisma.contract.update({
      where: { id },
      data: { documentUrl: key },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE_CONTRACT',
        entity: 'Contract',
        entityId: id,
        userId: adminId,
      },
    });

    return this.toView(contract);
  }

  async getById(id: string, requester: AuthenticatedUser) {
    const contract = await this.mustFind(id);
    if (requester.role !== 'ADMIN' && contract.userId !== requester.id) {
      throw new ForbiddenException('Você não tem acesso a este contrato.');
    }
    return this.toView(contract);
  }

  async list(query: ListContractsQueryDto, requester: AuthenticatedUser) {
    const where = {
      userId: requester.role === 'ADMIN' ? query.userId : requester.id,
      status: query.status,
    };

    const [total, contracts] = await this.prisma.$transaction([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          user: { select: { name: true } },
          plan: { select: { name: true, monthlyValue: true } },
        },
      }),
    ]);

    return {
      data: contracts.map((c) => this.toView(c)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Daily alert sweep (roadmap section 22, triggered by the "contracts"
   * queue): notifies once per threshold as a contract's endDate approaches.
   * Idempotent — skips a threshold already notified today.
   */
  async alertExpiringContracts(): Promise<number> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    let notified = 0;

    const sortedThresholds = [...EXPIRATION_ALERT_THRESHOLDS_DAYS].sort(
      (a, b) => a - b,
    );
    const maxWindowDays = sortedThresholds[sortedThresholds.length - 1];
    const windowEnd = new Date(now.getTime() + maxWindowDays * 86_400_000);

    const contracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE', endDate: { gte: now, lte: windowEnd } },
    });

    for (const contract of contracts) {
      const daysUntilExpiration = Math.ceil(
        (contract.endDate.getTime() - now.getTime()) / 86_400_000,
      );
      // A contract can sit within several windows at once (e.g. 5 days left
      // matches the 7/15/30-day thresholds simultaneously) — alert only
      // once, using the most urgent threshold that applies.
      const threshold =
        sortedThresholds.find((days) => daysUntilExpiration <= days) ??
        maxWindowDays;

      // Prisma's JSON filtering can't portably match a metadata path, so
      // fetch today's CONTRACT_EXPIRING alerts for this user and check
      // contractId in application code.
      const todaysAlerts = await this.prisma.notification.findMany({
        where: {
          userId: contract.userId,
          type: 'CONTRACT_EXPIRING',
          createdAt: { gte: startOfToday },
        },
      });
      const alreadySeen = todaysAlerts.some(
        (n) =>
          (n.metadata as { contractId?: string } | null)?.contractId ===
          contract.id,
      );
      if (alreadySeen) continue;

      await this.notifications.create({
        userId: contract.userId,
        type: 'CONTRACT_EXPIRING',
        title: 'Contrato vencendo em breve',
        body: `Seu contrato vence em ${threshold} dias (${contract.endDate.toISOString().slice(0, 10)}).`,
        metadata: { contractId: contract.id, thresholdDays: threshold },
      });
      notified++;
    }

    return notified;
  }

  /** Marks ACTIVE contracts whose endDate has passed as EXPIRED and notifies
   * once — called by the same daily "contracts" queue job. */
  async expireOverdueContracts(): Promise<number> {
    const contracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE', endDate: { lt: new Date() } },
    });

    for (const contract of contracts) {
      await this.prisma.$transaction(async (tx) => {
        await tx.contract.update({
          where: { id: contract.id },
          data: { status: 'EXPIRED' },
        });
        await this.notifications.create(
          {
            userId: contract.userId,
            type: 'CONTRACT_EXPIRED',
            title: 'Contrato expirado',
            body: 'Seu contrato expirou. Entre em contato para renovação.',
            metadata: { contractId: contract.id },
          },
          tx,
        );
      });
    }

    return contracts.length;
  }

  private async mustFind(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    return contract;
  }

  private toView<T extends { documentUrl: string | null }>(contract: T) {
    return {
      ...contract,
      documentUrl: contract.documentUrl
        ? this.storage.publicUrl(contract.documentUrl)
        : null,
    };
  }
}
