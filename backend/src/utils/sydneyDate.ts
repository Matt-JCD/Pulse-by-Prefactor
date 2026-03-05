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

function getOffsetMsForTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value);
  const second = Number(parts.find((p) => p.type === 'second')?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function parseSydneyDate(date: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = date.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    throw new Error(`Invalid Sydney date: ${date}`);
  }
  return { year, month, day };
}

/**
 * Returns the UTC ISO bounds for a Sydney-local calendar day.
 * The end bound is exclusive.
 */
export function getSydneyDayBounds(date: string = getSydneyDate()): { startIso: string; endIso: string } {
  const { year, month, day } = parseSydneyDate(date);

  const localMidnightGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const startOffsetMs = getOffsetMsForTimeZone(localMidnightGuess, SYDNEY_TIMEZONE);
  const start = new Date(localMidnightGuess.getTime() - startOffsetMs);

  const nextDayGuess = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  const endOffsetMs = getOffsetMsForTimeZone(nextDayGuess, SYDNEY_TIMEZONE);
  const end = new Date(nextDayGuess.getTime() - endOffsetMs);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Converts a Sydney-local date + HH:mm to UTC ISO timestamp.
 */
export function sydneyLocalToUtcIso(date: string, time: string): string {
  const { year, month, day } = parseSydneyDate(date);
  const [hourRaw, minuteRaw] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error(`Invalid local time: ${time}`);
  }

  const localGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMs = getOffsetMsForTimeZone(localGuess, SYDNEY_TIMEZONE);
  return new Date(localGuess.getTime() - offsetMs).toISOString();
}
