import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  invoiceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  method?: string;
}
