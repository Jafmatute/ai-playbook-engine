import { describe, expect, it } from 'vitest';

import { Instant } from './index.js';

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  return result.value;
}

describe('Instant', () => {
  it('parses a UTC instant and canonicalizes milliseconds', () => {
    expect(instant('2026-07-12T10:20:30Z').toString()).toBe('2026-07-12T10:20:30.000Z');
  });

  it('normalizes a valid offset to UTC', () => {
    expect(instant('2026-07-12T12:20:30+02:00').toString()).toBe('2026-07-12T10:20:30.000Z');
  });

  it.each(['invalid', '2026-02-30T10:20:30Z'])('rejects invalid values: %s', (value) => {
    const result = Instant.parse(value);

    expect(result).toMatchObject({ success: false, error: { code: 'INVALID_INSTANT' } });
  });

  it('rejects invalid Date values', () => {
    expect(Instant.fromDate(new Date('invalid'))).toMatchObject({
      success: false,
      error: { code: 'INVALID_INSTANT' },
    });
  });

  it('compares and checks equality by instant', () => {
    const earlier = instant('2026-07-12T10:20:29Z');
    const equal = instant('2026-07-12T12:20:29+02:00');
    const later = instant('2026-07-12T10:20:30Z');

    expect(earlier.equals(equal)).toBe(true);
    expect(earlier.compare(equal)).toBe(0);
    expect(earlier.compare(later)).toBe(-1);
    expect(later.compare(earlier)).toBe(1);
  });

  it('copies Date input rather than retaining its mutable reference', () => {
    const date = new Date('2026-07-12T10:20:30.000Z');
    const result = Instant.fromDate(date);
    if (!result.success) {
      throw new Error('Expected a valid date fixture.');
    }

    date.setUTCFullYear(2030);

    expect(result.value.toString()).toBe('2026-07-12T10:20:30.000Z');
  });
});
