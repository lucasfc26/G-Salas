import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../generated/prisma/enums.js';

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s()-]{8,20}$/, { message: 'Telefone inválido.' })
  phone?: string;

  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'A senha deve conter letras e números.',
  })
  password!: string;
}
