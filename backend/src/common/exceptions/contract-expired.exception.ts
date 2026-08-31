import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants.js';
import { DomainException } from './domain.exception.js';

export class ContractExpiredException extends DomainException {
  constructor(message = 'Você não possui um contrato ativo no momento.') {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
  }
}
