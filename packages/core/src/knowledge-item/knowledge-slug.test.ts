import { describe, expect, it } from 'vitest';

import { KnowledgeSlug } from '../index.js';

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('KnowledgeSlug.create', () => {
  it.each(['workflow', 'workflow-1', 'ai-model-selection', 'code-review-workflow', 'section-2026'])(
    'accepts valid slug: %s',
    (value) => {
      const result = KnowledgeSlug.create(value);

      expect(result.success).toBe(true);
    },
  );

  it('exposes the value via getter', () => {
    const result = KnowledgeSlug.create('ai-model-selection');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('ai-model-selection');
    }
  });

  it('returns the value via toString', () => {
    const result = KnowledgeSlug.create('ai-model-selection');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('ai-model-selection');
    }
  });

  it('trims leading whitespace', () => {
    const result = KnowledgeSlug.create('  workflow');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('workflow');
    }
  });

  it('trims trailing whitespace', () => {
    const result = KnowledgeSlug.create('workflow  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('workflow');
    }
  });

  it('trims both ends', () => {
    const result = KnowledgeSlug.create('  workflow  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('workflow');
    }
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe('KnowledgeSlug — empty', () => {
  it.each(['', ' ', '   ', '\t', '\n'])('rejects %j', (value) => {
    const result = KnowledgeSlug.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_SLUG_INVALID',
        details: { reason: 'empty' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// too long
// ---------------------------------------------------------------------------

describe('KnowledgeSlug — too long', () => {
  it('accepts exactly 128 characters', () => {
    const value = 'a'.repeat(128);
    const result = KnowledgeSlug.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 129 characters', () => {
    const value = 'a'.repeat(129);
    const result = KnowledgeSlug.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_SLUG_INVALID',
        details: { reason: 'too_long' },
      });
    }
  });

  it('evaluates length after trim', () => {
    const value = '  ' + 'a'.repeat(126) + '  ';
    const result = KnowledgeSlug.create(value);

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// invalid format
// ---------------------------------------------------------------------------

describe('KnowledgeSlug — invalid format', () => {
  it.each([
    'Workflow',
    'workflow_',
    'workflow--test',
    '-workflow',
    'workflow-',
    'workflow test',
    'workflow/test',
    'workflow.test',
    'workflow:test',
    'metodología',
    'workflow#',
  ])('rejects %s', (value) => {
    const result = KnowledgeSlug.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_SLUG_INVALID',
        details: { reason: 'invalid_format' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('KnowledgeSlug — equality', () => {
  it('considers same normalized value equal', () => {
    const a = KnowledgeSlug.create('workflow');
    const b = KnowledgeSlug.create(' workflow ');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different slugs unequal', () => {
    const a = KnowledgeSlug.create('workflow');
    const b = KnowledgeSlug.create('methodology');
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

describe('KnowledgeSlug — validation order', () => {
  it('returns too_long before invalid_format', () => {
    const value = 'a'.repeat(129) + '-B';
    const result = KnowledgeSlug.create(value);

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

describe('KnowledgeSlug — immutability', () => {
  it('instance is frozen', () => {
    const result = KnowledgeSlug.create('workflow');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = KnowledgeSlug.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeSlug.create('');
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
