import { Type } from 'class-transformer';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @Type(() => Date)
  @IsDate()
  dueDate!: Date;

  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'referenceMonth deve estar no formato YYYY-MM.',
  })
  referenceMonth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
