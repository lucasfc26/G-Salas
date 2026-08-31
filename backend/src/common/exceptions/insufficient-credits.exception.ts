import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants.js';
import { DomainException } from './domain.exception.js';

export class InsufficientCreditsException extends DomainException {
  constructor(message = 'Saldo de créditos insuficiente.') {
    super(ErrorCode.INSUFFICIENT_CREDITS, message, HttpStatus.CONFLICT);
  }
}
