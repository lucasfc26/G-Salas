import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateAvailabilityDto } from './dto/create-availability.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { CreateBlockedPeriodDto } from './dto/create-blocked-period.dto.js';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto.js';
import { SchedulesService } from './schedules.service.js';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('rooms/:roomId/availabilities')
  listAvailabilities(@Param('roomId') roomId: string) {
    return this.schedulesService.listAvailabilities(roomId);
  }

  @Roles(Role.ADMIN)
  @Post('availabilities')
  createAvailability(@Body() dto: CreateAvailabilityDto) {
    return this.schedulesService.createAvailability(dto);
  }

  @Roles(Role.ADMIN)
  @Patch('availabilities/:id')
  updateAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.schedulesService.updateAvailability(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('availabilities/:id')
  async deleteAvailability(@Param('id') id: string): Promise<void> {
    await this.schedulesService.deleteAvailability(id);
  }

  @Get('blocked-periods')
  listBlockedPeriods(@Query('roomId') roomId?: string) {
    return this.schedulesService.listBlockedPeriods(roomId);
  }

  @Roles(Role.ADMIN)
  @Post('blocked-periods')
  createBlockedPeriod(@Body() dto: CreateBlockedPeriodDto) {
    return this.schedulesService.createBlockedPeriod(dto);
  }

  @Roles(Role.ADMIN)
  @Delete('blocked-periods/:id')
  async deleteBlockedPeriod(@Param('id') id: string): Promise<void> {
    await this.schedulesService.deleteBlockedPeriod(id);
  }

  @Get('rooms/:roomId/slots')
  getAvailableSlots(
    @Param('roomId') roomId: string,
    @Query() query: GetSlotsQueryDto,
  ) {
    return this.schedulesService.getAvailableSlots(roomId, query.date);
  }
}
