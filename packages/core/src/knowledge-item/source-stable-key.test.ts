import { describe, expect, it } from 'vitest';

import { SourceStableKey } from '../index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('SourceStableKey.create', () => {
  it('creates a valid key', () => {
    const result = SourceStableKey.create('page:abc123');

    expect(result.success).toBe(true);
  });

  it('exposes the value via getter', () => {
    const result = SourceStableKey.create('page:abc123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('page:abc123');
    }
  });

  it('returns the value via toString', () => {
    const result = SourceStableKey.create('page:abc123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('page:abc123');
    }
  });

  it('trims leading whitespace', () => {
    const result = SourceStableKey.create('  page:abc123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('page:abc123');
    }
  });

  it('trims trailing whitespace', () => {
    const result = SourceStableKey.create('page:abc123  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('page:abc123');
    }
  });

  it('trims both ends', () => {
    const result = SourceStableKey.create('  page:abc123  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('page:abc123');
    }
  });

  it('preserves interior whitespace', () => {
    const result = SourceStableKey.create('Section A / Workflow 2');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Section A / Workflow 2');
    }
  });

  it.each([
    'notion:page:abc123',
    'page/abc/child/def',
    'Section A / Workflow 2',
    'área:metodología',
    '知识:工作流',
  ])('accepts provider-neutral value: %s', (value) => {
    const result = SourceStableKey.create(value);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe('SourceStableKey — empty', () => {
  it.each(['', ' ', '   ', '\t', '\n'])('rejects %j', (value) => {
    const result = SourceStableKey.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_STABLE_KEY_INVALID',
        details: { reason: 'empty' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// too long
// ---------------------------------------------------------------------------

describe('SourceStableKey — too long', () => {
  it('accepts exactly 512 characters', () => {
    const value = 'a'.repeat(512);
    const result = SourceStableKey.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 513 characters', () => {
    const value = 'a'.repeat(513);
    const result = SourceStableKey.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_STABLE_KEY_INVALID',
        details: { reason: 'too_long' },
      });
    }
  });

  it('evaluates length after trim', () => {
    const value = '  ' + 'a'.repeat(511) + '  ';
    const result = SourceStableKey.create(value);

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// control characters
// ---------------------------------------------------------------------------

describe('SourceStableKey — control characters', () => {
  it('rejects null character', () => {
    const result = SourceStableKey.create('page:\u0000abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_STABLE_KEY_INVALID',
        details: { reason: 'contains_control_character' },
      });
    }
  });

  it('rejects tab character', () => {
    const result = SourceStableKey.create('page:\tabc');
    expect(result.success).toBe(false);
  });

  it('rejects newline character', () => {
    const result = SourceStableKey.create('page:\nabc');
    expect(result.success).toBe(false);
  });

  it('rejects carriage return', () => {
    const result = SourceStableKey.create('page:\rabc');
    expect(result.success).toBe(false);
  });

  it('rejects U+007F (delete)', () => {
    const result = SourceStableKey.create('page:\u007fabc');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// case sensitivity
// ---------------------------------------------------------------------------

describe('SourceStableKey — case sensitivity', () => {
  it('considers page:abc and page:ABC different', () => {
    const a = SourceStableKey.create('page:abc');
    const b = SourceStableKey.create('page:ABC');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('SourceStableKey — equality', () => {
  it('considers same normalized value equal', () => {
    const a = SourceStableKey.create('page:abc123');
    const b = SourceStableKey.create(' page:abc123 ');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different values unequal', () => {
    const a = SourceStableKey.create('page:abc');
    const b = SourceStableKey.create('page:def');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// validation order
// ---------------------------------------------------------------------------

describe('SourceStableKey — validation order', () => {
  it('returns too_long before contains_control_character', () => {
    const value = 'a'.repeat(513) + '\u0000';
    const result = SourceStableKey.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'too_long' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// error immutability
// ---------------------------------------------------------------------------

describe('SourceStableKey — error immutability', () => {
  it('error root is frozen', () => {
    const result = SourceStableKey.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = SourceStableKey.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
