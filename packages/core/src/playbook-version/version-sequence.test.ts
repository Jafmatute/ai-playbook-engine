import { describe, expect, it } from 'vitest';

import { VersionSequence } from '../index.js';

describe('VersionSequence', () => {
  it('accepts 1', () => {
    const result = VersionSequence.create(1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(1);
    }
  });

  it('accepts a positive integer greater than 1', () => {
    const result = VersionSequence.create(42);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(42);
    }
  });

  it('rejects 0', () => {
    expect(VersionSequence.create(0)).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_SEQUENCE_INVALID',
        details: { receivedValue: 0, minimumValue: 1, reason: 'below_minimum' },
      },
    });
  });

  it.each([-1, -100])('rejects negative values: %s', (value) => {
    expect(VersionSequence.create(value)).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_SEQUENCE_INVALID',
        details: { reason: 'below_minimum' },
      },
    });
  });

  it.each([1.5, 0.1, -0.5])('rejects decimals: %s', (value) => {
    expect(VersionSequence.create(value)).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_SEQUENCE_INVALID',
        details: { reason: 'not_integer' },
      },
    });
  });

  it('rejects NaN', () => {
    expect(VersionSequence.create(NaN)).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_SEQUENCE_INVALID',
        details: { reason: 'not_finite' },
      },
    });
  });

  it('rejects Infinity', () => {
    expect(VersionSequence.create(Infinity)).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_SEQUENCE_INVALID',
        details: { reason: 'not_finite' },
      },
    });
  });

  it('compares equal', () => {
    const a = VersionSequence.create(5);
    const b = VersionSequence.create(5);

    expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
  });

  it('compares less', () => {
    const a = VersionSequence.create(3);
    const b = VersionSequence.create(7);

    expect(a.success && b.success && a.value.compare(b.value)).toBe(-1);
  });

  it('compares greater', () => {
    const a = VersionSequence.create(9);
    const b = VersionSequence.create(2);

    expect(a.success && b.success && a.value.compare(b.value)).toBe(1);
  });

  it('serializes with toString', () => {
    const result = VersionSequence.create(123);

    expect(result.success && result.value.toString()).toBe('123');
  });
});
