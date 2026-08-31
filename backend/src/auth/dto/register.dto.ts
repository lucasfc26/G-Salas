import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const SIGNUP_PLANS = ['FREE', 'MONTHLY', 'YEARLY'] as const;
export type SignupPlan = (typeof SIGNUP_PLANS)[number];

export const SIGNUP_PAYMENT_METHODS = ['card', 'pix'] as const;
export type SignupPaymentMethod = (typeof SIGNUP_PAYMENT_METHODS)[number];

export class RegisterDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s()-]{8,20}$/, { message: 'Telefone inválido.' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  spaceName?: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'A senha deve conter letras e números.',
  })
  password!: string;

  @IsIn(SIGNUP_PLANS, { message: 'Plano inválido.' })
  plan!: SignupPlan;

  @ValidateIf((dto: RegisterDto) => dto.plan !== 'FREE')
  @IsIn(SIGNUP_PAYMENT_METHODS, { message: 'Informe a forma de pagamento.' })
  paymentMethod?: SignupPaymentMethod;
}
