import { describe, expect, it } from 'vitest';

import {
  parseKnowledgeItemId,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
} from '../identifiers.js';
import { Instant } from '../instant.js';
import { ContentChecksum } from '../playbook-version/content-checksum.js';
import {
  KnowledgeItem,
  KnowledgeTitle,
  KnowledgeSlug,
  SourceStableKey,
  DisplayOrder,
  SourceReference,
  NormalizedText,
  NormalizedContent,
  createKnowledgeItemAttributes,
  type KnowledgeType,
  type RestoreKnowledgeItemInput,
} from '../index.js';

function parsedId(value: string) {
  const result = parseKnowledgeItemId(value);
  if (!result.success) throw new Error('Invalid id fixture.');
  return result.value;
}

function parsedPvId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('Invalid pv id fixture.');
  return result.value;
}

function parsedPbId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid pb id fixture.');
  return result.value;
}

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid ws id fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid instant fixture.');
  return result.value;
}

function contentChecksum(
  value = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
): ContentChecksum {
  const result = ContentChecksum.create({ algorithm: 'sha256', value });
  if (!result.success) throw new Error('Invalid checksum fixture.');
  return result.value;
}

function title(value = 'AI Model Selection'): KnowledgeTitle {
  const result = KnowledgeTitle.create(value);
  if (!result.success) throw new Error('Invalid title fixture.');
  return result.value;
}

function slug(value: string): KnowledgeSlug {
  const result = KnowledgeSlug.create(value);
  if (!result.success) throw new Error('Invalid slug fixture.');
  return result.value;
}

function sourceStableKey(value = 'page:abc123'): SourceStableKey {
  const result = SourceStableKey.create(value);
  if (!result.success) throw new Error('Invalid ssk fixture.');
  return result.value;
}

function displayOrder(value = 0): DisplayOrder {
  const result = DisplayOrder.create(value);
  if (!result.success) throw new Error('Invalid order fixture.');
  return result.value;
}

function sourceReference(): SourceReference {
  const result = SourceReference.create({
    provider: 'notion',
    objectType: 'page',
    externalId: 'abc123',
  });
  if (!result.success) throw new Error('Invalid source reference fixture.');
  return result.value;
}

function normalizedText(value = 'Content text'): NormalizedText {
  const result = NormalizedText.create(value);
  if (!result.success) throw new Error('Invalid normalized text fixture.');
  return result.value;
}

function normalizedContent(): NormalizedContent {
  return NormalizedContent.create({ text: normalizedText() });
}

const fixtureId = parsedId('11111111-2222-3333-4444-555555555555');
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePbId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixturePvId = parsedPvId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
const fixtureParentId = parsedId('22222222-3333-4444-5555-666666666666');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');

function restoreInput(overrides?: Partial<RestoreKnowledgeItemInput>): RestoreKnowledgeItemInput {
  return {
    knowledgeItemId: fixtureId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    playbookVersionId: fixturePvId,
    type: 'workflow',
    sourceStableKey: sourceStableKey(),
    title: title(),
    slug: null,
    content: normalizedContent(),
    attributes: createKnowledgeItemAttributes('workflow'),
    sourceReference: sourceReference(),
    parentKnowledgeItemId: null,
    displayOrder: displayOrder(),
    contentChecksum: contentChecksum(),
    validationState: 'pending',
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// valid restoration
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — valid states', () => {
  it('restores a pending item', () => {
    const result = KnowledgeItem.restore(restoreInput({ validationState: 'pending' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validationState).toBe('pending');
    }
  });

  it('restores a valid item', () => {
    const result = KnowledgeItem.restore(restoreInput({ validationState: 'valid' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validationState).toBe('valid');
    }
  });

  it('restores an invalid item', () => {
    const result = KnowledgeItem.restore(restoreInput({ validationState: 'invalid' }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validationState).toBe('invalid');
    }
  });

  const knowledgeTypes: KnowledgeType[] = [
    'section',
    'methodology',
    'workflow',
    'prompt_definition',
    'criterion',
    'decision_matrix',
    'audit_definition',
    'reference_document',
  ];

  it.each(knowledgeTypes)('works with %s type', (type) => {
    const result = KnowledgeItem.restore(
      restoreInput({
        type,
        attributes: createKnowledgeItemAttributes(type),
      }),
    );

    expect(result.success).toBe(true);
  });

  it('preserves slug: null', () => {
    const result = KnowledgeItem.restore(restoreInput({ slug: null }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.slug).toBeNull();
    }
  });

  it('preserves a slug', () => {
    const s = slug('custom-slug');
    const result = KnowledgeItem.restore(restoreInput({ slug: s }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.slug).toBe(s);
    }
  });

  it('preserves parent null', () => {
    const result = KnowledgeItem.restore(restoreInput({ parentKnowledgeItemId: null }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.parentKnowledgeItemId).toBeNull();
    }
  });

  it('preserves a parent ID', () => {
    const result = KnowledgeItem.restore(restoreInput({ parentKnowledgeItemId: fixtureParentId }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.parentKnowledgeItemId).toBe(fixtureParentId);
    }
  });
});

// ---------------------------------------------------------------------------
// exact preservation
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — exact preservation', () => {
  const ref = sourceReference();
  const ssk = sourceStableKey();
  const t = title('Exact Title');
  const s = slug('exact-slug');
  const c = normalizedContent();
  const attrs = createKnowledgeItemAttributes('section');
  const order = displayOrder(7);
  const checksum = contentChecksum(
    '9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  );
  const input = restoreInput({
    knowledgeItemId: fixtureId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    playbookVersionId: fixturePvId,
    type: 'section',
    sourceStableKey: ssk,
    title: t,
    slug: s,
    content: c,
    attributes: attrs,
    sourceReference: ref,
    parentKnowledgeItemId: fixtureParentId,
    displayOrder: order,
    contentChecksum: checksum,
    validationState: 'valid',
    createdAt: fixtureCreatedAt,
  });

  const result = KnowledgeItem.restore(input);
  if (!result.success) throw new Error('Fixture must be valid.');
  const item = result.value;

  it('preserves knowledgeItemId', () => {
    expect(item.id).toBe(fixtureId);
  });

  it('preserves workspaceId', () => {
    expect(item.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    expect(item.playbookId).toBe(fixturePbId);
  });

  it('preserves playbookVersionId', () => {
    expect(item.playbookVersionId).toBe(fixturePvId);
  });

  it('preserves type', () => {
    expect(item.type).toBe('section');
  });

  it('preserves sourceStableKey instance', () => {
    expect(item.sourceStableKey).toBe(ssk);
  });

  it('preserves title instance', () => {
    expect(item.title).toBe(t);
  });

  it('preserves slug instance', () => {
    expect(item.slug).toBe(s);
  });

  it('preserves content instance', () => {
    expect(item.content).toBe(c);
  });

  it('preserves attributes instance', () => {
    expect(item.attributes).toBe(attrs);
  });

  it('preserves sourceReference instance', () => {
    expect(item.sourceReference).toBe(ref);
  });

  it('preserves parentKnowledgeItemId', () => {
    expect(item.parentKnowledgeItemId).toBe(fixtureParentId);
  });

  it('preserves displayOrder instance', () => {
    expect(item.displayOrder).toBe(order);
  });

  it('preserves contentChecksum instance', () => {
    expect(item.contentChecksum).toBe(checksum);
  });

  it('preserves validationState exactly', () => {
    expect(item.validationState).toBe('valid');
  });

  it('preserves createdAt', () => {
    expect(item.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// invalid attributes
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — invalid attributes', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty object', {}],
    ['array', []],
    ['unknown type', { type: 'unknown' }],
    ['extra properties', { type: 'workflow', steps: [] }],
  ])('rejects %s', (_label, attributes) => {
    const input = restoreInput({ attributes, validationState: 'pending' });
    const result = KnowledgeItem.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_ITEM_RESTORATION_STATE_INVALID',
        details: { field: 'attributes', reason: 'invalid_attributes' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// attributes type mismatch
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — attributes type mismatch', () => {
  it('rejects mismatch between type and attributes.type', () => {
    const result = KnowledgeItem.restore(
      restoreInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    expect(result.success).toBe(false);
  });

  it('returns appropriate error', () => {
    const result = KnowledgeItem.restore(
      restoreInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'KNOWLEDGE_ITEM_RESTORATION_STATE_INVALID',
        details: {
          field: 'attributes',
          reason: 'attributes_type_mismatch',
          knowledgeType: 'workflow',
          attributesType: 'methodology',
        },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// unknown validation state
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — unknown validation state', () => {
  it.each([
    ['empty string', ''],
    ['Pending', 'Pending'],
    ['VALID', 'VALID'],
    ['validated', 'validated'],
    ['failed', 'failed'],
    ['leading space', ' pending'],
    ['trailing space', 'pending '],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, validationState) => {
    const result = KnowledgeItem.restore(restoreInput({ validationState }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_ITEM_RESTORATION_STATE_INVALID',
        details: {
          field: 'validationState',
          reason: 'unknown_validation_state',
          currentValue: validationState,
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// validation priority
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — validation priority', () => {
  it('returns invalid_attributes before attributes_type_mismatch', () => {
    const result = KnowledgeItem.restore(
      restoreInput({
        attributes: { type: 'unknown' },
        validationState: 'pending',
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'invalid_attributes' },
      });
    }
  });

  it('returns attributes_type_mismatch before unknown_validation_state', () => {
    const result = KnowledgeItem.restore(
      restoreInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
        validationState: 'bogus',
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { reason: 'attributes_type_mismatch' },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('KnowledgeItem.restore — immutability', () => {
  it('restored item is frozen', () => {
    const result = KnowledgeItem.restore(restoreInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = KnowledgeItem.restore(restoreInput({ validationState: 'bogus' }));
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeItem.restore(restoreInput({ validationState: 'bogus' }));
    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
