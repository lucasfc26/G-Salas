import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CacheService } from '../redis/cache.service.js';

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getClientDashboard(userId: string) {
    return this.cache.wrap(
      `dashboard:client:${userId}`,
      CACHE_TTL_SECONDS,
      async () => {
        const now = new Date();

        const [
          contract,
          upcomingReservations,
          pendingInvoices,
          unreadNotifications,
        ] = await Promise.all([
          this.prisma.contract.findFirst({
            where: { userId, status: 'ACTIVE', endDate: { gte: now } },
            orderBy: { createdAt: 'desc' },
            include: {
              creditWallets: { select: { id: true, balance: true, totalGranted: true, totalUsed: true } },
            },
          }),
          this.prisma.reservation.findMany({
            where: { userId, status: 'CONFIRMED', startAt: { gte: now } },
            orderBy: { startAt: 'asc' },
            take: 5,
            include: { room: { select: { name: true } } },
          }),
          this.prisma.invoice.aggregate({
            where: { userId, status: { in: ['PENDING', 'OVERDUE'] } },
            _count: true,
            _sum: { amount: true },
          }),
          this.prisma.notification.count({ where: { userId, read: false } }),
        ]);

        const daysUntilContractExpiration = contract
          ? Math.ceil((contract.endDate.getTime() - now.getTime()) / 86_400_000)
          : null;

        return {
          contract: contract
            ? {
                id: contract.id,
                status: contract.status,
                endDate: contract.endDate,
                daysUntilExpiration: daysUntilContractExpiration,
                monthlyHours: contract.monthlyHours,
                walletId: contract.creditWallets[0]?.id ?? null,
                creditsBalance: contract.creditWallets[0]?.balance ?? 0,
                creditsGranted: contract.creditWallets[0]?.totalGranted ?? 0,
                creditsUsed: contract.creditWallets[0]?.totalUsed ?? 0,
              }
            : null,
          upcomingReservations: upcomingReservations.map((r) => ({
            id: r.id,
            roomName: r.room.name,
            startAt: r.startAt,
            endAt: r.endAt,
          })),
          pendingInvoices: {
            count: pendingInvoices._count,
            totalAmount: pendingInvoices._sum.amount ?? 0,
          },
          unreadNotifications,
        };
      },
    );
  }

  async getAdminDashboard() {
    return this.cache.wrap('dashboard:admin', CACHE_TTL_SECONDS, async () => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setUTCHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
      const startOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const in30Days = new Date(now.getTime() + 30 * 86_400_000);

      const [
        activeClients,
        activeContracts,
        contractsExpiringSoon,
        roomsByStatus,
        reservationsToday,
        overdueInvoices,
        pendingPayments,
        revenueThisMonth,
      ] = await Promise.all([
        this.prisma.user.count({ where: { role: 'CLIENT', status: 'ACTIVE' } }),
        this.prisma.contract.count({ where: { status: 'ACTIVE' } }),
        this.prisma.contract.count({
          where: { status: 'ACTIVE', endDate: { gte: now, lte: in30Days } },
        }),
        this.prisma.room.groupBy({ by: ['status'], _count: true }),
        this.prisma.reservation.count({
          where: {
            startAt: { gte: startOfToday, lt: endOfToday },
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
          },
        }),
        this.prisma.invoice.aggregate({
          where: { status: 'OVERDUE' },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.payment.count({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        }),
        this.prisma.payment.aggregate({
          where: { status: 'APPROVED', paidAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
      ]);

      return {
        activeClients,
        activeContracts,
        contractsExpiringSoon,
        roomsByStatus: Object.fromEntries(
          roomsByStatus.map((r) => [r.status, r._count]),
        ),
        reservationsToday,
        overdueInvoices: {
          count: overdueInvoices._count,
          totalAmount: overdueInvoices._sum.amount ?? 0,
        },
        pendingPayments,
        revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
      };
    });
  }
}
