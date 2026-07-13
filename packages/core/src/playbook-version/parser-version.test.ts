import { describe, expect, it } from 'vitest';

import { ParserVersion } from '../index.js';

describe('ParserVersion', () => {
  it('accepts valid version', () => {
    const result = ParserVersion.create('notion-parser/v1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('notion-parser/v1');
    }
  });

  it('trims outer spaces', () => {
    const result = ParserVersion.create('  notion-source-parser/1.0.0  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('notion-source-parser/1.0.0');
    }
  });

  it.each(['', '   '])('rejects empty: "%s"', (value) => {
    expect(ParserVersion.create(value)).toMatchObject({
      success: false,
      error: { code: 'PARSER_VERSION_REQUIRED' },
    });
  });

  it('accepts exact maximum length', () => {
    const value = 'a'.repeat(100);
    const result = ParserVersion.create(value);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(value);
    }
  });

  it('rejects exceeding maximum length', () => {
    const result = ParserVersion.create('a'.repeat(101));

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'PARSER_VERSION_INVALID',
        details: { maximumLength: 100, actualLength: 101 },
      },
    });
  });

  it('preserves capitalization', () => {
    const result = ParserVersion.create('Notion-Parser/v2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Notion-Parser/v2');
    }
  });

  it('equality is exact', () => {
    const a = ParserVersion.create('notion-parser/v1');
    const b = ParserVersion.create('notion-parser/v1');
    const c = ParserVersion.create('Notion-Parser/v1');

    expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    expect(a.success && c.success && a.value.equals(c.value)).toBe(false);
  });
});
