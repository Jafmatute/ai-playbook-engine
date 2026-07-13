import { describe, expect, it } from 'vitest';

import { KnowledgeTitle } from '../index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('KnowledgeTitle.create', () => {
  it('creates a valid title', () => {
    const result = KnowledgeTitle.create('AI Model Selection');

    expect(result.success).toBe(true);
  });

  it('exposes the value via getter', () => {
    const result = KnowledgeTitle.create('AI Model Selection');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('AI Model Selection');
    }
  });

  it('returns the value via toString', () => {
    const result = KnowledgeTitle.create('AI Model Selection');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('AI Model Selection');
    }
  });

  it('trims leading whitespace', () => {
    const result = KnowledgeTitle.create('  AI Model Selection');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('AI Model Selection');
    }
  });

  it('trims trailing whitespace', () => {
    const result = KnowledgeTitle.create('AI Model Selection  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('AI Model Selection');
    }
  });

  it('trims both ends', () => {
    const result = KnowledgeTitle.create('  AI Model Selection  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('AI Model Selection');
    }
  });

  it('preserves interior whitespace', () => {
    const result = KnowledgeTitle.create('Workflow: Code Review');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('Workflow: Code Review');
    }
  });

  it.each([
    'AI Model Selection',
    'Workflow: Code Review',
    'Auditoría de arquitectura',
    'Metodología — Desarrollo asistido por IA',
    'Criterio #1: Seguridad',
    '模型选择工作流',
  ])('accepts human text: %s', (value) => {
    const result = KnowledgeTitle.create(value);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe('KnowledgeTitle — empty', () => {
  it.each(['', ' ', '   ', '\t', '\n'])('rejects %j', (value) => {
    const result = KnowledgeTitle.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_TITLE_INVALID',
        details: { reason: 'empty' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// too long
// ---------------------------------------------------------------------------

describe('KnowledgeTitle — too long', () => {
  it('accepts exactly 256 characters', () => {
    const value = 'a'.repeat(256);
    const result = KnowledgeTitle.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 257 characters', () => {
    const value = 'a'.repeat(257);
    const result = KnowledgeTitle.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_TITLE_INVALID',
        details: { reason: 'too_long' },
      });
    }
  });

  it('evaluates length after trim', () => {
    const value = '  ' + 'a'.repeat(254) + '  ';
    const result = KnowledgeTitle.create(value);

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// control characters
// ---------------------------------------------------------------------------

describe('KnowledgeTitle — control characters', () => {
  it('rejects null character', () => {
    const result = KnowledgeTitle.create('Title\u0000Value');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_TITLE_INVALID',
        details: { reason: 'contains_control_character' },
      });
    }
  });

  it('rejects tab character', () => {
    const result = KnowledgeTitle.create('Title\tValue');
    expect(result.success).toBe(false);
  });

  it('rejects newline character', () => {
    const result = KnowledgeTitle.create('Title\nValue');
    expect(result.success).toBe(false);
  });

  it('rejects carriage return', () => {
    const result = KnowledgeTitle.create('Title\rValue');
    expect(result.success).toBe(false);
  });

  it('rejects U+007F (delete)', () => {
    const result = KnowledgeTitle.create('Title\u007fValue');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('KnowledgeTitle — equality', () => {
  it('considers same normalized value equal', () => {
    const a = KnowledgeTitle.create('Workflow');
    const b = KnowledgeTitle.create(' Workflow ');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different values unequal', () => {
    const a = KnowledgeTitle.create('Workflow');
    const b = KnowledgeTitle.create('Methodology');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('is case-sensitive', () => {
    const a = KnowledgeTitle.create('Workflow');
    const b = KnowledgeTitle.create('workflow');
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

describe('KnowledgeTitle — validation order', () => {
  it('returns too_long before contains_control_character', () => {
    const value = 'a'.repeat(257) + '\u0000';
    const result = KnowledgeTitle.create(value);

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

describe('KnowledgeTitle — immutability', () => {
  it('instance is frozen', () => {
    const result = KnowledgeTitle.create('Workflow');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = KnowledgeTitle.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeTitle.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
