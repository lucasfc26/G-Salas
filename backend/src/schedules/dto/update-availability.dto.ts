import { PartialType } from '@nestjs/mapped-types';
import { CreateAvailabilityDto } from './create-availability.dto.js';

export class UpdateAvailabilityDto extends PartialType(CreateAvailabilityDto) {}
