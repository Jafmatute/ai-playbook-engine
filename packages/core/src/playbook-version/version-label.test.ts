import { describe, expect, it } from 'vitest';

import { VersionLabel } from '../index.js';

describe('VersionLabel', () => {
  it('accepts a valid label', () => {
    const result = VersionLabel.create('Initial import');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Initial import');
    }
  });

  it('trims outer spaces', () => {
    const result = VersionLabel.create('  Release candidate  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Release candidate');
    }
  });

  it('preserves capitalization', () => {
    const result = VersionLabel.create('Version A v2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Version A v2');
    }
  });

  it.each(['', '   '])('rejects empty after trimming: "%s"', (value) => {
    expect(VersionLabel.create(value)).toMatchObject({
      success: false,
      error: { code: 'VERSION_LABEL_REQUIRED' },
    });
  });

  it('accepts the exact maximum length', () => {
    const value = 'a'.repeat(200);
    const result = VersionLabel.create(value);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(value);
    }
  });

  it('rejects exceeding maximum length', () => {
    const result = VersionLabel.create('a'.repeat(201));

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'VERSION_LABEL_INVALID',
        details: { maximumLength: 200, actualLength: 201 },
      },
    });
  });

  it('compares by exact value', () => {
    const a = VersionLabel.create('Label');
    const b = VersionLabel.create('Label');
    const c = VersionLabel.create('label');

    expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    expect(a.success && c.success && a.value.equals(c.value)).toBe(false);
  });
});
