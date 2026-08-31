import { describe, expect, it } from 'vitest';
import { ReservationPolicyService } from './reservation-policy.service.js';

describe('ReservationPolicyService', () => {
  const service = new ReservationPolicyService();
  const now = new Date('2027-01-10T12:00:00.000Z');
  const baseContract = {
    cancellationWindowHours: 24,
    cancellationLimit: 2,
    cancellationsUsed: 0,
  };

  it('refunds and does not count as late when cancelling well before the window', () => {
    const start = new Date('2027-01-12T12:00:00.000Z'); // 48h ahead
    const decision = service.evaluateCancellation(baseContract, start, now);
    expect(decision).toMatchObject({
      isLateCancellation: false,
      refundCredits: true,
    });
  });

  it('refunds a late cancellation while the allowance is not exhausted', () => {
    const start = new Date('2027-01-10T20:00:00.000Z'); // 8h ahead
    const decision = service.evaluateCancellation(baseContract, start, now);
    expect(decision).toMatchObject({
      isLateCancellation: true,
      refundCredits: true,
    });
  });

  it('forfeits the credit on a late cancellation once the allowance is exhausted', () => {
    const start = new Date('2027-01-10T20:00:00.000Z');
    const exhausted = { ...baseContract, cancellationsUsed: 2 };
    const decision = service.evaluateCancellation(exhausted, start, now);
    expect(decision).toMatchObject({
      isLateCancellation: true,
      refundCredits: false,
    });
  });

  it('treats exactly the window boundary as an early cancellation', () => {
    const start = new Date('2027-01-11T12:00:00.000Z'); // exactly 24h ahead
    const decision = service.evaluateCancellation(baseContract, start, now);
    expect(decision).toMatchObject({
      isLateCancellation: false,
      refundCredits: true,
    });
  });

  it('allows rescheduling a confirmed future reservation', () => {
    expect(
      service.canReschedule(
        'CONFIRMED',
        new Date('2027-01-11T00:00:00.000Z'),
        now,
      ),
    ).toBe(true);
  });

  it('blocks rescheduling a reservation that already started or is not confirmed', () => {
    expect(
      service.canReschedule(
        'CONFIRMED',
        new Date('2027-01-09T00:00:00.000Z'),
        now,
      ),
    ).toBe(false);
    expect(
      service.canReschedule(
        'CANCELLED',
        new Date('2027-01-11T00:00:00.000Z'),
        now,
      ),
    ).toBe(false);
  });
});
