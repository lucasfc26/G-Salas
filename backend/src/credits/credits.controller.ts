import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdjustCreditsDto } from './dto/adjust-credits.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import { CreditsService } from './credits.service.js';

@Controller('credits')
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.creditsService.getActiveWalletForUser(user.id);
  }

  @Get('wallets/:id')
  async getWallet(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.creditsService.getWalletForRequester(id, user);
  }

  @Get('wallets/:id/transactions')
  async listTransactions(
    @Param('id') id: string,
    @Query() query: ListTransactionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.creditsService.getWalletForRequester(id, user);
    return this.creditsService.listTransactions(id, query.page, query.limit);
  }

  @Roles(Role.ADMIN)
  @Post('wallets/:id/adjust')
  async adjust(
    @Param('id') id: string,
    @Body() dto: AdjustCreditsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    const wallet = await this.creditsService.adjust(id, dto.delta, {
      referenceType: 'MANUAL_ADJUSTMENT',
      referenceId: admin.id,
      description: dto.description,
    });
    await this.prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREDIT_ADJUSTMENT',
        entity: 'CreditWallet',
        entityId: id,
        metadata: { delta: dto.delta, description: dto.description ?? null },
      },
    });
    return wallet;
  }
}
