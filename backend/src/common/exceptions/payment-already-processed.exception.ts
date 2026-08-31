import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants.js';
import { DomainException } from './domain.exception.js';

export class PaymentAlreadyProcessedException extends DomainException {
  constructor(message = 'Este pagamento já foi processado.') {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
  }
}
