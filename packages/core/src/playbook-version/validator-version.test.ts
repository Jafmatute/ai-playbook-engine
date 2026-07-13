import { describe, expect, it } from 'vitest';

import { ValidatorVersion } from '../index.js';

describe('ValidatorVersion', () => {
  it('accepts valid version', () => {
    const result = ValidatorVersion.create('validator/v1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('validator/v1');
    }
  });

  it('trims outer spaces', () => {
    const result = ValidatorVersion.create('  playbook-validator/1.0.0  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('playbook-validator/1.0.0');
    }
  });

  it.each(['', '   '])('rejects empty: "%s"', (value) => {
    expect(ValidatorVersion.create(value)).toMatchObject({
      success: false,
      error: { code: 'VALIDATOR_VERSION_REQUIRED' },
    });
  });

  it('accepts exact maximum length', () => {
    const value = 'a'.repeat(100);
    const result = ValidatorVersion.create(value);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(value);
    }
  });

  it('rejects exceeding maximum length', () => {
    const result = ValidatorVersion.create('a'.repeat(101));

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATOR_VERSION_INVALID',
        details: { maximumLength: 100, actualLength: 101 },
      },
    });
  });

  it('preserves capitalization', () => {
    const result = ValidatorVersion.create('Validator/v2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Validator/v2');
    }
  });

  it('equality is exact', () => {
    const a = ValidatorVersion.create('validator/v1');
    const b = ValidatorVersion.create('validator/v1');
    const c = ValidatorVersion.create('Validator/v1');

    expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    expect(a.success && c.success && a.value.equals(c.value)).toBe(false);
  });
});
