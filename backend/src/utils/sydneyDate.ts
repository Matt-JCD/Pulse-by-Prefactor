const SYDNEY_TIMEZONE = 'Australia/Sydney';

const weekdayToNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Returns YYYY-MM-DD in Australia/Sydney local time.
 */
export function getSydneyDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SYDNEY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Failed to derive Sydney date parts');
  }

  return `${year}-${month}-${day}`;
}

/**
 * Returns day-of-week using Australia/Sydney local time where Sunday=0..Saturday=6.
 */
export function getSydneyDayOfWeek(now: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat('en-AU', {
    timeZone: SYDNEY_TIMEZONE,
    weekday: 'short',
  }).format(now);

  const day = weekdayToNumber[weekday];
  if (day === undefined) {
    throw new Error(`Unknown weekday value: ${weekday}`);
  }
  return day;
}

/**
 * Returns YYYY-MM-DD for a Sydney-local day offset from now.
 * Example: -1 gives "yesterday" in Sydney local time.
 */
export function getSydneyDateOffset(days: number, now: Date = new Date()): string {
  return getSydneyDate(new Date(now.getTime() + days * 86400000));
}
