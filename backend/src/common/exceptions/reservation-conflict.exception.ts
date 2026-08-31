import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants.js';
import { DomainException } from './domain.exception.js';

export class ReservationConflictException extends DomainException {
  constructor(message = 'O horário selecionado não está mais disponível.') {
    super(ErrorCode.RESERVATION_CONFLICT, message, HttpStatus.CONFLICT);
  }
}
