import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { ContractStatus } from '../../generated/prisma/enums.js';
import { CreateContractDto } from './create-contract.dto.js';

class UpdatableContractFields extends OmitType(CreateContractDto, [
  'userId',
] as const) {}

export class UpdateContractDto extends PartialType(UpdatableContractFields) {
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
