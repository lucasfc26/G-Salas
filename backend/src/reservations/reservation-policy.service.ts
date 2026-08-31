import { Injectable } from '@nestjs/common';
import type { Contract } from '../generated/prisma/client.js';

export interface CancellationDecision {
  hoursUntilStart: number;
  isLateCancellation: boolean;
  refundCredits: boolean;
}

/**
 * Cancellation/reschedule rules, kept out of controllers per roadmap
 * section 10 ("Não deixar regras críticas hardcoded em controllers").
 * Rules are read from the contract, so they stay configurable per contract.
 */
@Injectable()
export class ReservationPolicyService {
  evaluateCancellation(
    contract: Pick<
      Contract,
      'cancellationWindowHours' | 'cancellationLimit' | 'cancellationsUsed'
    >,
    reservationStartAt: Date,
    now: Date = new Date(),
  ): CancellationDecision {
    const hoursUntilStart =
      (reservationStartAt.getTime() - now.getTime()) / 3_600_000;

    if (hoursUntilStart >= contract.cancellationWindowHours) {
      return {
        hoursUntilStart,
        isLateCancellation: false,
        refundCredits: true,
      };
    }

    // Late cancellation: still refunded while the contract has unused
    // "late cancellation allowance" left, otherwise the credit is forfeited.
    const withinAllowance =
      contract.cancellationsUsed < contract.cancellationLimit;
    return {
      hoursUntilStart,
      isLateCancellation: true,
      refundCredits: withinAllowance,
    };
  }

  canReschedule(
    reservationStatus: string,
    reservationStartAt: Date,
    now: Date = new Date(),
  ): boolean {
    return reservationStatus === 'CONFIRMED' && reservationStartAt > now;
  }
}
