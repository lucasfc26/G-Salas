import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  minutesToTime,
  subtractIntervals,
  timeToMinutes,
  type MinuteInterval,
} from '../common/utils/time-intervals.util.js';
import type { CreateAvailabilityDto } from './dto/create-availability.dto.js';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import type { CreateBlockedPeriodDto } from './dto/create-blocked-period.dto.js';

const OCCUPYING_RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export interface DaySlot {
  start: string;
  end: string;
}

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailabilities(roomId: string) {
    return this.prisma.availability.findMany({
      where: { roomId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createAvailability(dto: CreateAvailabilityDto) {
    this.assertValidRange(dto.startTime, dto.endTime);
    await this.assertRoomExists(dto.roomId);
    return this.prisma.availability.create({ data: dto });
  }

  async updateAvailability(id: string, dto: UpdateAvailabilityDto) {
    const existing = await this.prisma.availability.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Regra de disponibilidade não encontrada.');
    }
    this.assertValidRange(
      dto.startTime ?? existing.startTime,
      dto.endTime ?? existing.endTime,
    );
    return this.prisma.availability.update({ where: { id }, data: dto });
  }

  async deleteAvailability(id: string): Promise<void> {
    await this.prisma.availability.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Regra de disponibilidade não encontrada.');
    });
  }

  async listBlockedPeriods(roomId?: string) {
    return this.prisma.blockedPeriod.findMany({
      where: roomId ? { OR: [{ roomId }, { roomId: null }] } : {},
      orderBy: { startAt: 'asc' },
    });
  }

  async createBlockedPeriod(dto: CreateBlockedPeriodDto) {
    if (dto.endAt <= dto.startAt) {
      throw new BadRequestException('endAt deve ser posterior a startAt.');
    }
    if (dto.roomId) {
      await this.assertRoomExists(dto.roomId);
    }
    return this.prisma.blockedPeriod.create({ data: dto });
  }

  async deleteBlockedPeriod(id: string): Promise<void> {
    await this.prisma.blockedPeriod.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Bloqueio não encontrado.');
    });
  }

  async getAvailableSlots(
    roomId: string,
    dateStr: string,
    excludeReservationId?: string,
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Data inválida.');
    }
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekday = dayStart.getUTCDay();

    if (room.status !== 'AVAILABLE') {
      return {
        roomId,
        date: dateStr,
        roomStatus: room.status,
        slots: [] as DaySlot[],
      };
    }

    const [availabilities, blockedPeriods, reservations] = await Promise.all([
      this.prisma.availability.findMany({
        where: { roomId, weekday, active: true },
      }),
      this.prisma.blockedPeriod.findMany({
        where: {
          OR: [{ roomId }, { roomId: null }],
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          roomId,
          status: { in: [...OCCUPYING_RESERVATION_STATUSES] },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
          ...(excludeReservationId
            ? { id: { not: excludeReservationId } }
            : {}),
        },
      }),
    ]);

    const free: MinuteInterval[] = availabilities.map((a) => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    }));

    const busy: MinuteInterval[] = [...blockedPeriods, ...reservations].map(
      (item) =>
        this.clipToDayMinutes(item.startAt, item.endAt, dayStart, dayEnd),
    );

    const slots = subtractIntervals(free, busy).map((interval): DaySlot => ({
      start: minutesToTime(interval.start),
      end: minutesToTime(interval.end),
    }));

    return { roomId, date: dateStr, roomStatus: room.status, slots };
  }

  private clipToDayMinutes(
    startAt: Date,
    endAt: Date,
    dayStart: Date,
    dayEnd: Date,
  ): MinuteInterval {
    const clippedStart = Math.max(startAt.getTime(), dayStart.getTime());
    const clippedEnd = Math.min(endAt.getTime(), dayEnd.getTime());
    return {
      start: (clippedStart - dayStart.getTime()) / 60_000,
      end: (clippedEnd - dayStart.getTime()) / 60_000,
    };
  }

  private assertValidRange(startTime: string, endTime: string): void {
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      throw new BadRequestException('endTime deve ser posterior a startTime.');
    }
  }

  private async assertRoomExists(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
  }
}
