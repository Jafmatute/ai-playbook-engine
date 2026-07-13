import { describe, expect, it } from 'vitest';

import { ContentChecksum } from '../index.js';

const hex64 = 'a'.repeat(64);

describe('ContentChecksum', () => {
  it('accepts valid sha256 checksum', () => {
    const result = ContentChecksum.create({ algorithm: 'sha256', value: hex64 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.algorithm).toBe('sha256');
      expect(result.value.value).toBe(hex64);
    }
  });

  it('normalizes uppercase to lowercase', () => {
    const result = ContentChecksum.create({ algorithm: 'sha256', value: 'A'.repeat(64) });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('a'.repeat(64));
    }
  });

  it('accepts valid uppercase hex', () => {
    const result = ContentChecksum.create({
      algorithm: 'sha256',
      value: 'ABCDEF0123456789'.repeat(4),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('abcdef0123456789'.repeat(4));
    }
  });

  it('rejects empty', () => {
    expect(ContentChecksum.create({ algorithm: 'sha256', value: '' })).toMatchObject({
      success: false,
      error: {
        code: 'CONTENT_CHECKSUM_INVALID',
        details: { reason: 'empty', algorithm: 'sha256', actualLength: 0 },
      },
    });
  });

  it('rejects surrounding whitespace', () => {
    expect(ContentChecksum.create({ algorithm: 'sha256', value: ` ${hex64}` })).toMatchObject({
      success: false,
      error: { details: { reason: 'surrounding_whitespace' } },
    });

    expect(ContentChecksum.create({ algorithm: 'sha256', value: `${hex64} ` })).toMatchObject({
      success: false,
      error: { details: { reason: 'surrounding_whitespace' } },
    });
  });

  it('rejects short length', () => {
    expect(ContentChecksum.create({ algorithm: 'sha256', value: 'a'.repeat(63) })).toMatchObject({
      success: false,
      error: {
        code: 'CONTENT_CHECKSUM_INVALID',
        details: { reason: 'invalid_length', actualLength: 63, expectedLength: 64 },
      },
    });
  });

  it('rejects long length', () => {
    expect(ContentChecksum.create({ algorithm: 'sha256', value: 'a'.repeat(65) })).toMatchObject({
      success: false,
      error: { details: { reason: 'invalid_length', actualLength: 65 } },
    });
  });

  it('rejects non-hex characters', () => {
    expect(
      ContentChecksum.create({ algorithm: 'sha256', value: 'z' + 'a'.repeat(63) }),
    ).toMatchObject({
      success: false,
      error: { details: { reason: 'invalid_format' } },
    });
  });

  it('rejects internal space — 64 chars with space inside', () => {
    const fixture = 'a'.repeat(32) + ' ' + 'a'.repeat(31);

    expect(fixture).toHaveLength(64);
    expect(ContentChecksum.create({ algorithm: 'sha256', value: fixture })).toMatchObject({
      success: false,
      error: {
        code: 'CONTENT_CHECKSUM_INVALID',
        details: { reason: 'invalid_format' },
      },
    });
  });

  it('rejects internal tab — 64 chars with tab inside', () => {
    const fixture = 'a'.repeat(30) + '\t' + 'a'.repeat(33);

    expect(fixture).toHaveLength(64);
    expect(ContentChecksum.create({ algorithm: 'sha256', value: fixture })).toMatchObject({
      success: false,
      error: {
        code: 'CONTENT_CHECKSUM_INVALID',
        details: { reason: 'invalid_format' },
      },
    });
  });

  it('rejects unknown algorithm', () => {
    expect(ContentChecksum.create({ algorithm: 'md5', value: hex64 })).toMatchObject({
      success: false,
      error: {
        code: 'CONTENT_CHECKSUM_INVALID',
        details: { reason: 'unsupported_algorithm', algorithm: 'md5' },
      },
    });
  });

  it('equals same checksum', () => {
    const a = ContentChecksum.create({ algorithm: 'sha256', value: hex64 });
    const b = ContentChecksum.create({ algorithm: 'sha256', value: hex64 });

    expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
  });

  it('not equals different content', () => {
    const a = ContentChecksum.create({ algorithm: 'sha256', value: 'a'.repeat(64) });
    const b = ContentChecksum.create({ algorithm: 'sha256', value: 'b'.repeat(64) });

    expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
  });

  it('serializes as algorithm:value', () => {
    const result = ContentChecksum.create({ algorithm: 'sha256', value: hex64 });

    expect(result.success && result.value.toString()).toBe(`sha256:${hex64}`);
  });
});
