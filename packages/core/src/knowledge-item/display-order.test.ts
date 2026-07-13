import { describe, expect, it } from 'vitest';

import { DisplayOrder } from '../index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('DisplayOrder.create', () => {
  it.each([0, 1, 10, 1000, Number.MAX_SAFE_INTEGER])('accepts %d', (value) => {
    const result = DisplayOrder.create(value);

    expect(result.success).toBe(true);
  });

  it('exposes the value via getter', () => {
    const result = DisplayOrder.create(5);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(5);
    }
  });

  it('returns the value via toString', () => {
    const result = DisplayOrder.create(5);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('5');
    }
  });
});

// ---------------------------------------------------------------------------
// not finite
// ---------------------------------------------------------------------------

describe('DisplayOrder — not finite', () => {
  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects %s',
    (value) => {
      const result = DisplayOrder.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'DISPLAY_ORDER_INVALID',
          details: { reason: 'not_finite' },
        });
      }
    },
  );
});

// ---------------------------------------------------------------------------
// not integer
// ---------------------------------------------------------------------------

describe('DisplayOrder — not integer', () => {
  it.each([0.1, 1.5, -2.5])('rejects %s', (value) => {
    const result = DisplayOrder.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'DISPLAY_ORDER_INVALID',
        details: { reason: 'not_integer' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// negative
// ---------------------------------------------------------------------------

describe('DisplayOrder — negative', () => {
  it.each([-1, -100])('rejects %d', (value) => {
    const result = DisplayOrder.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'DISPLAY_ORDER_INVALID',
        details: { reason: 'negative' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// unsafe integer
// ---------------------------------------------------------------------------

describe('DisplayOrder — unsafe integer', () => {
  it('rejects MAX_SAFE_INTEGER + 1', () => {
    const result = DisplayOrder.create(Number.MAX_SAFE_INTEGER + 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'DISPLAY_ORDER_INVALID',
        details: { reason: 'unsafe_integer' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// validation order
// ---------------------------------------------------------------------------

describe('DisplayOrder — validation order', () => {
  it('returns not_integer for -1.5 before negative', () => {
    const result = DisplayOrder.create(-1.5);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'not_integer' },
      });
    }
  });

  it('returns negative before unsafe_integer', () => {
    const result = DisplayOrder.create(Number.MIN_SAFE_INTEGER - 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'negative' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('DisplayOrder — equality', () => {
  it('considers same value equal', () => {
    const a = DisplayOrder.create(3);
    const b = DisplayOrder.create(3);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different values unequal', () => {
    const a = DisplayOrder.create(1);
    const b = DisplayOrder.create(2);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// compare
// ---------------------------------------------------------------------------

describe('DisplayOrder — compare', () => {
  it('returns negative when this < other', () => {
    const a = DisplayOrder.create(1);
    const b = DisplayOrder.create(2);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.compare(b.value)).toBeLessThan(0);
    }
  });

  it('returns positive when this > other', () => {
    const a = DisplayOrder.create(2);
    const b = DisplayOrder.create(1);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.compare(b.value)).toBeGreaterThan(0);
    }
  });

  it('returns zero when equal', () => {
    const a = DisplayOrder.create(2);
    const b = DisplayOrder.create(2);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.compare(b.value)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('DisplayOrder — immutability', () => {
  it('instance is frozen', () => {
    const result = DisplayOrder.create(0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = DisplayOrder.create(Number.NaN);
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = DisplayOrder.create(Number.NaN);
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
