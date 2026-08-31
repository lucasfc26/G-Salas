import { Matches } from 'class-validator';

export class GetSlotsQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date deve estar no formato YYYY-MM-DD.',
  })
  date!: string;
}
