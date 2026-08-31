import { describe, expect, it } from 'vitest';
import {
  minutesToTime,
  subtractIntervals,
  timeToMinutes,
} from './time-intervals.util.js';

describe('subtractIntervals', () => {
  it('returns the free interval untouched when nothing overlaps', () => {
    const result = subtractIntervals(
      [{ start: 480, end: 1200 }],
      [{ start: 0, end: 100 }],
    );
    expect(result).toEqual([{ start: 480, end: 1200 }]);
  });

  it('splits a free interval when a block sits in the middle', () => {
    const result = subtractIntervals(
      [{ start: 480, end: 1200 }],
      [{ start: 600, end: 660 }],
    );
    expect(result).toEqual([
      { start: 480, end: 600 },
      { start: 660, end: 1200 },
    ]);
  });

  it('trims the edges when a block overlaps the start or end', () => {
    const result = subtractIntervals(
      [{ start: 480, end: 1200 }],
      [
        { start: 0, end: 500 },
        { start: 1100, end: 1440 },
      ],
    );
    expect(result).toEqual([{ start: 500, end: 1100 }]);
  });

  it('removes the whole interval when fully covered', () => {
    const result = subtractIntervals(
      [{ start: 480, end: 600 }],
      [{ start: 400, end: 700 }],
    );
    expect(result).toEqual([]);
  });

  it('merges overlapping free windows before subtracting', () => {
    const result = subtractIntervals(
      [
        { start: 480, end: 600 },
        { start: 590, end: 720 },
      ],
      [],
    );
    expect(result).toEqual([{ start: 480, end: 720 }]);
  });

  it('handles multiple non-overlapping reservations across one window', () => {
    const result = subtractIntervals(
      [{ start: 480, end: 1080 }],
      [
        { start: 480, end: 540 },
        { start: 600, end: 660 },
        { start: 1020, end: 1080 },
      ],
    );
    expect(result).toEqual([
      { start: 540, end: 600 },
      { start: 660, end: 1020 },
    ]);
  });
});

describe('time <-> minutes conversion', () => {
  it('converts HH:mm to minutes and back', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(minutesToTime(510)).toBe('08:30');
  });

  it('clamps minutesToTime to a single day', () => {
    expect(minutesToTime(-30)).toBe('00:00');
    expect(minutesToTime(1500)).toBe('24:00');
  });
});
