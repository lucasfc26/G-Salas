import { Type } from 'class-transformer';
import { IsDate, IsInt, IsPositive, IsString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  roomId!: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  /** Minutes. Must be a positive multiple of 60 — see ReservationsService. */
  @IsInt()
  @IsPositive()
  duration!: number;
}
