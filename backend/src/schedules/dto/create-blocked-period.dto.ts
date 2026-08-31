import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BlockedPeriodType } from '../../generated/prisma/enums.js';

export class CreateBlockedPeriodDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @IsOptional()
  @IsEnum(BlockedPeriodType)
  type?: BlockedPeriodType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
