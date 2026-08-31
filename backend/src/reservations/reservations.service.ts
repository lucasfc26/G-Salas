import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ContractExpiredException } from '../common/exceptions/contract-expired.exception.js';
import { ReservationConflictException } from '../common/exceptions/reservation-conflict.exception.js';
import { timeToMinutes } from '../common/utils/time-intervals.util.js';
import { CreditsService } from '../credits/credits.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchedulesService } from '../schedules/schedules.service.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { RescheduleReservationDto } from './dto/reschedule-reservation.dto.js';
import type { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { ReservationPolicyService } from './reservation-policy.service.js';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulesService: SchedulesService,
    private readonly creditsService: CreditsService,
    private readonly policy: ReservationPolicyService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateReservationDto) {
    if (dto.duration % 60 !== 0) {
      throw new BadRequestException(
        'A duração da reserva deve ser em múltiplos de 60 minutos.',
      );
    }
    if (dto.startAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Não é possível reservar um horário no passado.',
      );
    }

    const endAt = new Date(dto.startAt.getTime() + dto.duration * 60_000);
    const dateStr = this.toDateStr(dto.startAt);
    if (
      this.toDateStr(endAt) !== dateStr &&
      endAt.getTime() !== this.startOfNextDay(dto.startAt)
    ) {
      throw new BadRequestException(
        'A reserva deve começar e terminar no mesmo dia.',
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    if (room.status !== 'AVAILABLE') {
      throw new ReservationConflictException(
        'Esta sala não está disponível para reservas.',
      );
    }

    const contract = await this.findActiveContract(userId);
    const wallet = await this.creditsService.getWalletForUser(
      userId,
      contract.id,
    );
    const creditsNeeded = dto.duration / 60;

    await this.assertSlotIsFree(dto.roomId, dateStr, dto.startAt, endAt);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({
          data: {
            userId,
            roomId: dto.roomId,
            startAt: dto.startAt,
            endAt,
            duration: dto.duration,
            status: 'CONFIRMED',
          },
        });

        await this.creditsService.debit(
          wallet.id,
          creditsNeeded,
          { referenceType: 'RESERVATION', referenceId: reservation.id },
          tx,
        );

        await tx.auditLog.create({
          data: {
            userId,
            action: 'CREATE_RESERVATION',
            entity: 'Reservation',
            entityId: reservation.id,
          },
        });

        await this.notifications.create(
          {
            userId,
            type: 'RESERVATION_CONFIRMED',
            title: 'Reserva confirmada',
            body: `Sua reserva na sala ${room.name} em ${this.formatDateTime(dto.startAt)} foi confirmada.`,
            metadata: { reservationId: reservation.id, roomId: room.id },
          },
          tx,
        );

        return reservation;
      });
    } catch (error) {
      if (this.isExclusionViolation(error)) {
        throw new ReservationConflictException();
      }
      throw error;
    }
  }

  async cancel(id: string, requester: AuthenticatedUser, reason?: string) {
    const reservation = await this.getOwnedOrAdmin(id, requester);
    if (
      reservation.status !== 'PENDING' &&
      reservation.status !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Esta reserva não pode mais ser cancelada.',
      );
    }

    const contract = await this.findActiveContract(reservation.userId);
    const wallet = await this.creditsService.getWalletForUser(
      reservation.userId,
      contract.id,
    );
    const decision = this.policy.evaluateCancellation(
      contract,
      reservation.startAt,
    );
    const creditsToRefund = reservation.duration / 60;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      if (decision.refundCredits) {
        await this.creditsService.refund(
          wallet.id,
          creditsToRefund,
          {
            referenceType: 'RESERVATION',
            referenceId: id,
            description: 'Cancelamento',
          },
          tx,
        );
      }

      if (decision.isLateCancellation) {
        await tx.contract.update({
          where: { id: contract.id },
          data: { cancellationsUsed: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: requester.id,
          action: 'CANCEL_RESERVATION',
          entity: 'Reservation',
          entityId: id,
          metadata: {
            refunded: decision.refundCredits,
            isLateCancellation: decision.isLateCancellation,
          },
        },
      });

      await this.notifications.create(
        {
          userId: reservation.userId,
          type: 'RESERVATION_CANCELLED',
          title: 'Reserva cancelada',
          body: decision.refundCredits
            ? `Sua reserva em ${this.formatDateTime(reservation.startAt)} foi cancelada e o crédito foi devolvido.`
            : `Sua reserva em ${this.formatDateTime(reservation.startAt)} foi cancelada fora do prazo e o crédito não foi devolvido.`,
          metadata: { reservationId: id },
        },
        tx,
      );

      return updated;
    });
  }

  async reschedule(
    id: string,
    requester: AuthenticatedUser,
    dto: RescheduleReservationDto,
  ) {
    if (dto.duration % 60 !== 0) {
      throw new BadRequestException(
        'A duração da reserva deve ser em múltiplos de 60 minutos.',
      );
    }

    const reservation = await this.getOwnedOrAdmin(id, requester);
    if (!this.policy.canReschedule(reservation.status, reservation.startAt)) {
      throw new BadRequestException(
        'Esta reserva não pode mais ser remarcada.',
      );
    }

    const endAt = new Date(dto.startAt.getTime() + dto.duration * 60_000);
    const dateStr = this.toDateStr(dto.startAt);
    const contract = await this.findActiveContract(reservation.userId);
    const wallet = await this.creditsService.getWalletForUser(
      reservation.userId,
      contract.id,
    );

    const oldCredits = reservation.duration / 60;
    const newCredits = dto.duration / 60;
    const delta = newCredits - oldCredits;

    await this.assertSlotIsFree(
      reservation.roomId,
      dateStr,
      dto.startAt,
      endAt,
      id,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (delta > 0) {
          await this.creditsService.debit(
            wallet.id,
            delta,
            {
              referenceType: 'RESERVATION',
              referenceId: id,
              description: 'Remarcação',
            },
            tx,
          );
        } else if (delta < 0) {
          await this.creditsService.refund(
            wallet.id,
            -delta,
            {
              referenceType: 'RESERVATION',
              referenceId: id,
              description: 'Remarcação',
            },
            tx,
          );
        }

        const updated = await tx.reservation.update({
          where: { id },
          data: { startAt: dto.startAt, endAt, duration: dto.duration },
        });

        await tx.auditLog.create({
          data: {
            userId: requester.id,
            action: 'UPDATE_CONTRACT',
            entity: 'Reservation',
            entityId: id,
            metadata: { reason: 'reschedule' },
          },
        });

        return updated;
      });
    } catch (error) {
      if (this.isExclusionViolation(error)) {
        throw new ReservationConflictException();
      }
      throw error;
    }
  }

  async markNoShow(id: string) {
    const reservation = await this.mustFind(id);
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Apenas reservas confirmadas podem virar não comparecimento.',
      );
    }
    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'NO_SHOW' },
    });
  }

  async complete(id: string) {
    const reservation = await this.mustFind(id);
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Apenas reservas confirmadas podem ser concluídas.',
      );
    }
    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async getById(id: string, requester: AuthenticatedUser) {
    return this.getOwnedOrAdmin(id, requester);
  }

  async list(query: ListReservationsQueryDto, requester: AuthenticatedUser) {
    const where = {
      userId: requester.role === 'ADMIN' ? query.userId : requester.id,
      roomId: query.roomId,
      status: query.status,
    };

    const [total, reservations] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          room: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    return {
      data: reservations,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private async assertSlotIsFree(
    roomId: string,
    dateStr: string,
    startAt: Date,
    endAt: Date,
    excludeReservationId?: string,
  ): Promise<void> {
    const { slots } = await this.schedulesService.getAvailableSlots(
      roomId,
      dateStr,
      excludeReservationId,
    );
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const startMinutes = (startAt.getTime() - dayStart.getTime()) / 60_000;
    const endMinutes = (endAt.getTime() - dayStart.getTime()) / 60_000;

    const fits = slots.some((slot) => {
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      return slotStart <= startMinutes && endMinutes <= slotEnd;
    });

    if (!fits) {
      throw new ReservationConflictException();
    }
  }

  /**
   * A user is expected to have at most one ACTIVE contract at a time; if
   * more than one somehow exists, the most recently created one wins —
   * deterministic and matches "the latest agreement supersedes older ones".
   */
  private async findActiveContract(userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { userId, status: 'ACTIVE', endDate: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) {
      throw new ContractExpiredException();
    }
    return contract;
  }

  private async mustFind(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    return reservation;
  }

  private async getOwnedOrAdmin(id: string, requester: AuthenticatedUser) {
    const reservation = await this.mustFind(id);
    if (requester.role !== 'ADMIN' && reservation.userId !== requester.id) {
      throw new ForbiddenException('Você não tem acesso a esta reserva.');
    }
    return reservation;
  }

  private toDateStr(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatDateTime(date: Date): string {
    const [datePart, timePart] = date.toISOString().split('T');
    return `${datePart} às ${timePart.slice(0, 5)}`;
  }

  private startOfNextDay(date: Date): number {
    const day = new Date(`${this.toDateStr(date)}T00:00:00.000Z`);
    return day.getTime() + 24 * 60 * 60 * 1000;
  }

  private isExclusionViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const err = error as { code?: unknown; message?: unknown; cause?: unknown };
    if (err.code === '23P01') return true;
    if (
      typeof err.message === 'string' &&
      err.message.includes('reservations_no_overlap')
    ) {
      return true;
    }
    return err.cause ? this.isExclusionViolation(err.cause) : false;
  }
}
