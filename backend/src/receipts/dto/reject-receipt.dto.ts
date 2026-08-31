import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectReceiptDto {
  @IsString()
  @MinLength(5, { message: 'Informe um motivo com pelo menos 5 caracteres.' })
  @MaxLength(300)
  reason!: string;
}
