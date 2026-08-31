import { Module } from '@nestjs/common';
import { SchedulesModule } from '../schedules/schedules.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ReservationPolicyService } from './reservation-policy.service.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [SchedulesModule, CreditsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationPolicyService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
