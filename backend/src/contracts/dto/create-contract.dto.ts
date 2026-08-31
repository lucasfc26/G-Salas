import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsInt()
  @IsPositive()
  monthlyHours!: number;

  @IsInt()
  @Min(0)
  cancellationLimit!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  cancellationWindowHours?: number;
}
