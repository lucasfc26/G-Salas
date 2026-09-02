import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RoomStatus } from '../../generated/prisma/enums.js';
import { ROOM_AMENITIES } from '../constants/room-amenities.constant.js';

export class CreateRoomDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  capacity!: number;

  @IsOptional()
  @IsArray()
  @IsIn(ROOM_AMENITIES, { each: true })
  amenities?: string[];

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyPrice!: number;
}
