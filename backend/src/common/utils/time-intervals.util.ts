export interface MinuteInterval {
  start: number; // minutes from midnight, inclusive
  end: number; // minutes from midnight, exclusive
}

/**
 * Subtracts `busy` intervals from `free` intervals, both expressed in
 * minutes-from-midnight. Pure function — the availability engine (roadmap
 * Fase 6/7) computes slots on demand instead of storing pre-generated ones.
 */
export function subtractIntervals(
  free: MinuteInterval[],
  busy: MinuteInterval[],
): MinuteInterval[] {
  let result = free
    .filter((interval) => interval.end > interval.start)
    .map((interval) => ({ ...interval }));

  for (const block of busy) {
    if (block.end <= block.start) continue;
    const next: MinuteInterval[] = [];
    for (const interval of result) {
      if (block.end <= interval.start || block.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (block.start > interval.start) {
        next.push({
          start: interval.start,
          end: Math.min(block.start, interval.end),
        });
      }
      if (block.end < interval.end) {
        next.push({
          start: Math.max(block.end, interval.start),
          end: interval.end,
        });
      }
    }
    result = next;
  }

  return mergeIntervals(result).sort((a, b) => a.start - b.start);
}

function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: MinuteInterval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (clamped % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
