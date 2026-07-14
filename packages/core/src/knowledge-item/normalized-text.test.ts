import { describe, expect, it } from 'vitest';

import { NormalizedText } from '../index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('NormalizedText.create', () => {
  it('creates a valid text', () => {
    const result = NormalizedText.create('Hello, world!');

    expect(result.success).toBe(true);
  });

  it('exposes the value via getter', () => {
    const result = NormalizedText.create('Hello, world!');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Hello, world!');
    }
  });

  it('returns the value via toString', () => {
    const result = NormalizedText.create('Hello, world!');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('Hello, world!');
    }
  });
});

// ---------------------------------------------------------------------------
// trim
// ---------------------------------------------------------------------------

describe('NormalizedText — trim', () => {
  it('trims leading whitespace', () => {
    const result = NormalizedText.create('  Hello');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Hello');
    }
  });

  it('trims trailing whitespace', () => {
    const result = NormalizedText.create('Hello  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Hello');
    }
  });

  it('trims multiline outer whitespace', () => {
    const result = NormalizedText.create('\n  First paragraph\n\nSecond paragraph  \n');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('First paragraph\n\nSecond paragraph');
    }
  });

  it('preserves interior whitespace', () => {
    const result = NormalizedText.create('A  B');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('A  B');
    }
  });

  it('preserves interior empty lines', () => {
    const result = NormalizedText.create('Line 1\n\n\nLine 2');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Line 1\n\n\nLine 2');
    }
  });
});

// ---------------------------------------------------------------------------
// allowed text
// ---------------------------------------------------------------------------

describe('NormalizedText — allowed text', () => {
  it.each([
    'Plain text',
    'Multiple words with punctuation.',
    'First line\nSecond line',
    'Column A\tColumn B',
    'Auditoría de arquitectura',
    'Metodología — Desarrollo asistido por IA',
    '模型选择工作流',
    'Emoji: ✅',
  ])('accepts: %s', (value) => {
    const result = NormalizedText.create(value);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe('NormalizedText — empty', () => {
  it.each(['', ' ', '   ', '\t', '\n', '\r\n'])('rejects %j', (value) => {
    const result = NormalizedText.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'NORMALIZED_TEXT_INVALID',
        details: { reason: 'empty' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// too long
// ---------------------------------------------------------------------------

describe('NormalizedText — too long', () => {
  it('accepts exactly 1_000_000 characters', () => {
    const value = 'a'.repeat(1_000_000);
    const result = NormalizedText.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 1_000_001 characters', () => {
    const value = 'a'.repeat(1_000_001);
    const result = NormalizedText.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'NORMALIZED_TEXT_INVALID',
        details: { reason: 'too_long' },
      });
    }
  });

  it('evaluates length after trim', () => {
    const value = '  ' + 'a'.repeat(999_998) + '  ';
    const result = NormalizedText.create(value);

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// allowed control characters
// ---------------------------------------------------------------------------

describe('NormalizedText — allowed control characters', () => {
  it('accepts interior tab', () => {
    const result = NormalizedText.create('Column A\tColumn B');
    expect(result.success).toBe(true);
  });

  it('accepts interior line feed', () => {
    const result = NormalizedText.create('Line 1\nLine 2');
    expect(result.success).toBe(true);
  });

  it('accepts interior carriage return', () => {
    const result = NormalizedText.create('Line 1\rLine 2');
    expect(result.success).toBe(true);
  });

  it('accepts CRLF', () => {
    const result = NormalizedText.create('Line 1\r\nLine 2');
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// disallowed control characters
// ---------------------------------------------------------------------------

describe('NormalizedText — disallowed control characters', () => {
  it.each([
    ['null', '\u0000'],
    ['bell', '\u0007'],
    ['vertical tab', '\u000b'],
    ['form feed', '\u000c'],
    ['unit separator', '\u001f'],
    ['delete', '\u007f'],
  ])('rejects %s', (_, char) => {
    const value = `Text${char}Value`;
    const result = NormalizedText.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'NORMALIZED_TEXT_INVALID',
        details: { reason: 'contains_disallowed_control_character' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('NormalizedText — equality', () => {
  it('considers same normalized value equal', () => {
    const a = NormalizedText.create('Hello');
    const b = NormalizedText.create(' Hello ');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different values unequal', () => {
    const a = NormalizedText.create('Hello');
    const b = NormalizedText.create('World');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('is case-sensitive', () => {
    const a = NormalizedText.create('Hello');
    const b = NormalizedText.create('hello');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('distinguishes LF from CRLF', () => {
    const a = NormalizedText.create('Line 1\nLine 2');
    const b = NormalizedText.create('Line 1\r\nLine 2');
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

describe('NormalizedText — validation order', () => {
  it('returns too_long before contains_disallowed_control_character', () => {
    const value = 'a'.repeat(1_000_001) + '\u0000';
    const result = NormalizedText.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'too_long' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('NormalizedText — immutability', () => {
  it('instance is frozen', () => {
    const result = NormalizedText.create('Text');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = NormalizedText.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = NormalizedText.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
