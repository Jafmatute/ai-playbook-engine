import { describe, expect, it } from 'vitest';

import { SourceReference, type CreateSourceReferenceInput } from '../index.js';

function validInput(overrides?: Partial<CreateSourceReferenceInput>): CreateSourceReferenceInput {
  return {
    provider: 'notion',
    objectType: 'page',
    externalId: 'abc123',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('SourceReference.create', () => {
  it('creates a valid reference', () => {
    const result = SourceReference.create(validInput());

    expect(result.success).toBe(true);
  });

  it('exposes provider via getter', () => {
    const result = SourceReference.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.provider).toBe('notion');
    }
  });

  it('exposes objectType via getter', () => {
    const result = SourceReference.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.objectType).toBe('page');
    }
  });

  it('exposes externalId via getter', () => {
    const result = SourceReference.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalId).toBe('abc123');
    }
  });

  it('toString produces provider:objectType:externalId', () => {
    const result = SourceReference.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('notion:page:abc123');
    }
  });
});

// ---------------------------------------------------------------------------
// trim
// ---------------------------------------------------------------------------

describe('SourceReference — trim', () => {
  it('trims provider', () => {
    const result = SourceReference.create(validInput({ provider: '  notion  ' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.provider).toBe('notion');
    }
  });

  it('trims objectType', () => {
    const result = SourceReference.create(validInput({ objectType: '  page  ' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.objectType).toBe('page');
    }
  });

  it('trims externalId', () => {
    const result = SourceReference.create(validInput({ externalId: '  abc123  ' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.externalId).toBe('abc123');
    }
  });
});

// ---------------------------------------------------------------------------
// valid formats
// ---------------------------------------------------------------------------

describe('SourceReference — valid provider', () => {
  it.each(['notion', 'google_drive', 'custom-source', 'provider1'])(
    'accepts provider %s',
    (provider) => {
      const result = SourceReference.create(validInput({ provider }));
      expect(result.success).toBe(true);
    },
  );
});

describe('SourceReference — valid objectType', () => {
  it.each(['page', 'database_item', 'custom-object', 'block1'])(
    'accepts objectType %s',
    (objectType) => {
      const result = SourceReference.create(validInput({ objectType }));
      expect(result.success).toBe(true);
    },
  );
});

describe('SourceReference — valid externalId', () => {
  it.each([
    'ABC-123',
    '550e8400-e29b-41d4-a716-446655440000',
    'folder/item/42',
    'urn:example:item:123',
    'identifier with spaces',
  ])('accepts externalId %s', (externalId) => {
    const result = SourceReference.create(validInput({ externalId }));
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// empty fields
// ---------------------------------------------------------------------------

describe('SourceReference — empty fields', () => {
  it.each(['', ' ', '   ', '\t', '\n'])('rejects empty provider %j', (value) => {
    const result = SourceReference.create(validInput({ provider: value }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_REFERENCE_INVALID',
        details: { field: 'provider', reason: 'empty' },
      });
    }
  });

  it.each(['', ' ', '   ', '\t', '\n'])('rejects empty objectType %j', (value) => {
    const result = SourceReference.create(validInput({ objectType: value }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_REFERENCE_INVALID',
        details: { field: 'objectType', reason: 'empty' },
      });
    }
  });

  it.each(['', ' ', '   ', '\t', '\n'])('rejects empty externalId %j', (value) => {
    const result = SourceReference.create(validInput({ externalId: value }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_REFERENCE_INVALID',
        details: { field: 'externalId', reason: 'empty' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// too long
// ---------------------------------------------------------------------------

describe('SourceReference — too long', () => {
  it('accepts provider of exactly 64 characters', () => {
    const result = SourceReference.create(validInput({ provider: 'a'.repeat(64) }));
    expect(result.success).toBe(true);
  });

  it('rejects provider of 65 characters', () => {
    const result = SourceReference.create(validInput({ provider: 'a'.repeat(65) }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'provider', reason: 'too_long' },
      });
    }
  });

  it('accepts objectType of exactly 64 characters', () => {
    const result = SourceReference.create(validInput({ objectType: 'a'.repeat(64) }));
    expect(result.success).toBe(true);
  });

  it('rejects objectType of 65 characters', () => {
    const result = SourceReference.create(validInput({ objectType: 'a'.repeat(65) }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'objectType', reason: 'too_long' },
      });
    }
  });

  it('accepts externalId of exactly 512 characters', () => {
    const result = SourceReference.create(validInput({ externalId: 'a'.repeat(512) }));
    expect(result.success).toBe(true);
  });

  it('rejects externalId of 513 characters', () => {
    const result = SourceReference.create(validInput({ externalId: 'a'.repeat(513) }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'externalId', reason: 'too_long' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// invalid format — provider
// ---------------------------------------------------------------------------

describe('SourceReference — invalid provider format', () => {
  it.each(['Notion', '1notion', 'notion provider', 'notion.', 'notion/'])(
    'rejects provider %s',
    (provider) => {
      const result = SourceReference.create(validInput({ provider }));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'SOURCE_REFERENCE_INVALID',
          details: { field: 'provider', reason: 'invalid_format' },
        });
      }
    },
  );
});

// ---------------------------------------------------------------------------
// invalid format — objectType
// ---------------------------------------------------------------------------

describe('SourceReference — invalid objectType format', () => {
  it.each(['Page', '1page', 'page type', 'page.', 'page/'])(
    'rejects objectType %s',
    (objectType) => {
      const result = SourceReference.create(validInput({ objectType }));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'SOURCE_REFERENCE_INVALID',
          details: { field: 'objectType', reason: 'invalid_format' },
        });
      }
    },
  );
});

// ---------------------------------------------------------------------------
// control characters in externalId
// ---------------------------------------------------------------------------

describe('SourceReference — control characters in externalId', () => {
  it.each([
    ['null', 'abc\u0000def'],
    ['tab', 'abc\tdef'],
    ['newline', 'abc\ndef'],
    ['carriage return', 'abc\rdef'],
    ['U+007F', 'abc\u007fdef'],
  ])('rejects %s', (_, value) => {
    const result = SourceReference.create(validInput({ externalId: value }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'SOURCE_REFERENCE_INVALID',
        details: { field: 'externalId', reason: 'invalid_format' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// validation order
// ---------------------------------------------------------------------------

describe('SourceReference — validation order', () => {
  it('returns provider error before objectType error', () => {
    const result = SourceReference.create(validInput({ provider: 'Notion', objectType: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'provider' },
      });
    }
  });

  it('returns objectType error before externalId error', () => {
    const result = SourceReference.create(validInput({ objectType: 'Page', externalId: '' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'objectType' },
      });
    }
  });

  it('returns too_long before invalid_format for externalId', () => {
    const value = 'a'.repeat(513) + '\u0000';
    const result = SourceReference.create(validInput({ externalId: value }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'externalId', reason: 'too_long' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// equality
// ---------------------------------------------------------------------------

describe('SourceReference — equality', () => {
  it('considers same values equal', () => {
    const a = SourceReference.create(validInput());
    const b = SourceReference.create(validInput());
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers different provider unequal', () => {
    const a = SourceReference.create(validInput({ provider: 'notion' }));
    const b = SourceReference.create(validInput({ provider: 'confluence' }));
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('considers different objectType unequal', () => {
    const a = SourceReference.create(validInput({ objectType: 'page' }));
    const b = SourceReference.create(validInput({ objectType: 'database' }));
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('considers different externalId unequal', () => {
    const a = SourceReference.create(validInput({ externalId: 'abc' }));
    const b = SourceReference.create(validInput({ externalId: 'def' }));
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('is case-sensitive for externalId', () => {
    const a = SourceReference.create(validInput({ externalId: 'ABC' }));
    const b = SourceReference.create(validInput({ externalId: 'abc' }));
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('SourceReference — immutability', () => {
  it('instance is frozen', () => {
    const result = SourceReference.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = SourceReference.create(validInput({ provider: '' }));
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = SourceReference.create(validInput({ provider: '' }));
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
