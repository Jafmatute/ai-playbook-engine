import { describe, expect, it } from 'vitest';

import { err, ok, type Result } from './index.js';

describe('Result', () => {
  it('creates an immutable successful result', () => {
    const result = ok('value');

    expect(result).toEqual({ success: true, value: 'value' });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('creates an immutable failed result', () => {
    const result = err({ code: 'INVALID' });

    expect(result).toEqual({ success: false, error: { code: 'INVALID' } });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('narrows using success', () => {
    const result: Result<number, string> = ok(1);

    if (result.success) {
      expect(result.value).toBe(1);
      return;
    }

    expect(result.error).toBe('failed');
  });

  it('does not capture unexpected exceptions', () => {
    const error = new Error('unexpected');

    expect(() => {
      throw error;
    }).toThrow(error);
  });
});
