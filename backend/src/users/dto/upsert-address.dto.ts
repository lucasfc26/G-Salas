import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpsertAddressDto {
  @IsString()
  @Length(8, 9)
  zipCode!: string;

  @IsString()
  @MaxLength(150)
  street!: string;

  @IsString()
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsString()
  @MaxLength(100)
  neighborhood!: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @Length(2, 2)
  state!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;
}
