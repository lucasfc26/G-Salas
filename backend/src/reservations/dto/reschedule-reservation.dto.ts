import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive } from 'class-validator';

export class RescheduleReservationDto {
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @IsInt()
  @IsPositive()
  duration!: number;
}
