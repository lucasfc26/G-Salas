import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CancelReservationDto } from './dto/cancel-reservation.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RescheduleReservationDto } from './dto/reschedule-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.create(user.id, dto);
  }

  @Get()
  list(
    @Query() query: ListReservationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.list(query, user);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reservationsService.getById(id, user);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CancelReservationDto,
  ) {
    return this.reservationsService.cancel(id, user, dto.reason);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RescheduleReservationDto,
  ) {
    return this.reservationsService.reschedule(id, user, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/no-show')
  markNoShow(@Param('id') id: string) {
    return this.reservationsService.markNoShow(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.reservationsService.complete(id);
  }
}
