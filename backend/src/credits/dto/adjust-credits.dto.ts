import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';

export class AdjustCreditsDto {
  @IsInt()
  @NotEquals(0)
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
