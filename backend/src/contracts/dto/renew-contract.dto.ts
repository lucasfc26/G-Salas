import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class RenewContractDto {
  @Type(() => Date)
  @IsDate()
  endDate!: Date;
}
