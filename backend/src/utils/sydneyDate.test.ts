import { describe, expect, it } from 'vitest';
import { getSydneyDate, getSydneyDateOffset, getSydneyDayOfWeek } from './sydneyDate.js';

describe('sydneyDate', () => {
  it('uses Sydney local date at UTC boundary', () => {
    const date = new Date('2026-02-27T13:30:00.000Z'); // 2026-02-28 00:30 AEDT
    expect(getSydneyDate(date)).toBe('2026-02-28');
  });

  it('calculates Sydney date offsets', () => {
    const date = new Date('2026-02-27T13:30:00.000Z');
    expect(getSydneyDateOffset(-1, date)).toBe('2026-02-27');
    expect(getSydneyDateOffset(1, date)).toBe('2026-03-01');
  });

  it('derives Sydney weekday number', () => {
    const date = new Date('2026-03-01T13:00:00.000Z'); // Monday in Sydney
    expect(getSydneyDayOfWeek(date)).toBe(1);
  });
});
