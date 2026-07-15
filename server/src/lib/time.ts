/**
 * Timezone handling for Metricool post timestamps.
 *
 * THE TRAP: Metricool ignores the `timezone` query param when stamping posts. It
 * returns its own server's wall-clock time and *labels* it, e.g.
 *
 *     { "dateTime": "2026-07-13T12:19:57", "timezone": "Europe/Madrid" }
 *
 * Cross-checked against the same post's epoch `timestamp` (1783937997000 =
 * 10:19:57 UTC), that is Madrid local time. The post actually went out at 15:49
 * IST. Treating `dateTime` as a naive local string — which is what `new
 * Date("2026-07-13T12:19:57")` does — shifts every timestamp by 3.5 hours for an
 * Indian audience, and would put every "best hour to post" recommendation in the
 * wrong part of the day.
 *
 * So: convert to a true UTC instant on the way in, and derive day/hour in the
 * brand's own timezone on the way out. Never trust the naive string.
 */

/**
 * How far `timeZone` is ahead of UTC at the given instant, in ms.
 * Uses Intl rather than a date library — DST-correct for the instants we pass.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;

  const asIfUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );

  return asIfUtc - instant.getTime();
}

/**
 * Interpret a naive wall-clock string ("2026-07-13T12:19:57") as local time in
 * `timeZone`, and return the real instant.
 */
export function wallTimeToUtc(wall: string, timeZone: string): Date | null {
  const naive = new Date(`${wall.replace(/Z$/, '')}Z`); // parse the digits as if UTC
  if (Number.isNaN(naive.getTime())) return null;

  // Offset at approximately the right instant; one correction pass is enough
  // outside of the DST-transition hour itself.
  const offset = zoneOffsetMs(naive, timeZone);
  return new Date(naive.getTime() - offset);
}

export interface ZonedParts {
  /** 0 = Sunday … 6 = Saturday, in the target timezone. */
  weekday: number;
  /** 0–23, in the target timezone. */
  hour: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Day-of-week and hour of an instant, as seen in `timeZone`. */
export function partsInZone(instant: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
  });

  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) p[part.type] = part.value;

  return {
    weekday: WEEKDAY_INDEX[p.weekday] ?? 0,
    hour: Number(p.hour),
  };
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
