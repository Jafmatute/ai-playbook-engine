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
  type CreateKnowledgeItemInput,
} from '../index.js';

function parsedId(value: string) {
  const result = parseKnowledgeItemId(value);
  if (!result.success) throw new Error('Invalid KnowledgeItemId fixture.');
  return result.value;
}

function parsedPvId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('Invalid PlaybookVersionId fixture.');
  return result.value;
}

function parsedPbId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid PlaybookId fixture.');
  return result.value;
}

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid WorkspaceId fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid Instant fixture.');
  return result.value;
}

function contentChecksum(
  value = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
): ContentChecksum {
  const result = ContentChecksum.create(`sha256:${value}`);
  if (!result.success) throw new Error('Invalid ContentChecksum fixture.');
  return result.value;
}

function title(value = 'AI Model Selection'): KnowledgeTitle {
  const result = KnowledgeTitle.create(value);
  if (!result.success) throw new Error('Invalid KnowledgeTitle fixture.');
  return result.value;
}

function slug(value: string): KnowledgeSlug {
  const result = KnowledgeSlug.create(value);
  if (!result.success) throw new Error('Invalid KnowledgeSlug fixture.');
  return result.value;
}

function sourceStableKey(value = 'page:abc123'): SourceStableKey {
  const result = SourceStableKey.create(value);
  if (!result.success) throw new Error('Invalid SourceStableKey fixture.');
  return result.value;
}

function displayOrder(value = 0): DisplayOrder {
  const result = DisplayOrder.create(value);
  if (!result.success) throw new Error('Invalid DisplayOrder fixture.');
  return result.value;
}

function sourceReference(): SourceReference {
  const result = SourceReference.create({
    provider: 'notion',
    objectType: 'page',
    externalId: 'abc123',
  });
  if (!result.success) throw new Error('Invalid SourceReference fixture.');
  return result.value;
}

function normalizedText(value = 'Content text'): NormalizedText {
  const result = NormalizedText.create(value);
  if (!result.success) throw new Error('Invalid NormalizedText fixture.');
  return result.value;
}

function normalizedContent(): NormalizedContent {
  return NormalizedContent.create({ text: normalizedText() });
}

const fixtureKnowledgeItemId = parsedId('11111111-2222-3333-4444-555555555555');
const fixtureWorkspaceId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePlaybookId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixturePvId = parsedPvId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
const fixtureParentId = parsedId('22222222-3333-4444-5555-666666666666');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');

function validInput(overrides?: Partial<CreateKnowledgeItemInput>): CreateKnowledgeItemInput {
  return {
    knowledgeItemId: fixtureKnowledgeItemId,
    workspaceId: fixtureWorkspaceId,
    playbookId: fixturePlaybookId,
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
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe('KnowledgeItem.create', () => {
  it('creates a knowledge item', () => {
    const result = KnowledgeItem.create(validInput());

    expect(result.success).toBe(true);
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
    const result = KnowledgeItem.create(
      validInput({
        type,
        attributes: createKnowledgeItemAttributes(type),
      }),
    );

    expect(result.success).toBe(true);
  });

  it('accepts slug: null', () => {
    const result = KnowledgeItem.create(validInput({ slug: null }));

    expect(result.success).toBe(true);
  });

  it('accepts a KnowledgeSlug', () => {
    const result = KnowledgeItem.create(validInput({ slug: slug('ai-model-selection') }));

    expect(result.success).toBe(true);
  });

  it('accepts parentKnowledgeItemId: null', () => {
    const result = KnowledgeItem.create(validInput({ parentKnowledgeItemId: null }));

    expect(result.success).toBe(true);
  });

  it('accepts a parent ID', () => {
    const result = KnowledgeItem.create(validInput({ parentKnowledgeItemId: fixtureParentId }));

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// initial state
// ---------------------------------------------------------------------------

describe('KnowledgeItem — initial state', () => {
  it('starts with validationState pending', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.validationState).toBe('pending');
    }
  });
});

// ---------------------------------------------------------------------------
// getters
// ---------------------------------------------------------------------------

describe('KnowledgeItem — getters', () => {
  const result = KnowledgeItem.create(validInput());
  if (!result.success) throw new Error('Fixture must be valid.');
  const item = result.value;

  it('returns id', () => {
    expect(item.id).toBe(fixtureKnowledgeItemId);
  });

  it('returns workspaceId', () => {
    expect(item.workspaceId).toBe(fixtureWorkspaceId);
  });

  it('returns playbookId', () => {
    expect(item.playbookId).toBe(fixturePlaybookId);
  });

  it('returns playbookVersionId', () => {
    expect(item.playbookVersionId).toBe(fixturePvId);
  });

  it('returns type', () => {
    expect(item.type).toBe('workflow');
  });

  it('returns sourceStableKey as instance', () => {
    const key = sourceStableKey();
    const input = validInput({ sourceStableKey: key });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.sourceStableKey).toBe(key);
    }
  });

  it('returns title as instance', () => {
    const t = title('Custom');
    const input = validInput({ title: t });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.title).toBe(t);
    }
  });

  it('returns slug as null when not provided', () => {
    expect(item.slug).toBeNull();
  });

  it('returns slug as instance when provided', () => {
    const s = slug('custom-slug');
    const input = validInput({ slug: s });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.slug).toBe(s);
    }
  });

  it('returns content as instance', () => {
    const c = normalizedContent();
    const input = validInput({ content: c });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.content).toBe(c);
    }
  });

  it('returns attributes as instance', () => {
    const attrs = createKnowledgeItemAttributes('section');
    const input = validInput({ type: 'section', attributes: attrs });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.attributes).toBe(attrs);
    }
  });

  it('returns sourceReference as instance', () => {
    const ref = sourceReference();
    const input = validInput({ sourceReference: ref });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.sourceReference).toBe(ref);
    }
  });

  it('returns parentKnowledgeItemId as null when not provided', () => {
    expect(item.parentKnowledgeItemId).toBeNull();
  });

  it('returns parentKnowledgeItemId as instance when provided', () => {
    const input = validInput({ parentKnowledgeItemId: fixtureParentId });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.parentKnowledgeItemId).toBe(fixtureParentId);
    }
  });

  it('returns displayOrder as instance', () => {
    const order = displayOrder(5);
    const input = validInput({ displayOrder: order });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.displayOrder).toBe(order);
    }
  });

  it('returns contentChecksum as instance', () => {
    const checksum = contentChecksum();
    const input = validInput({ contentChecksum: checksum });
    const created = KnowledgeItem.create(input);
    if (created.success) {
      expect(created.value.contentChecksum).toBe(checksum);
    }
  });

  it('returns createdAt', () => {
    expect(item.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// attributes mismatch
// ---------------------------------------------------------------------------

describe('KnowledgeItem — attributes type mismatch', () => {
  it('rejects mismatch between type and attributes type', () => {
    const result = KnowledgeItem.create(
      validInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    expect(result.success).toBe(false);
  });

  it('returns KNOWLEDGE_ITEM_ATTRIBUTES_TYPE_MISMATCH', () => {
    const result = KnowledgeItem.create(
      validInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: 'KNOWLEDGE_ITEM_ATTRIBUTES_TYPE_MISMATCH' },
    });
  });

  it('reports both types in details', () => {
    const result = KnowledgeItem.create(
      validInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        details: {
          knowledgeType: 'workflow',
          attributesType: 'methodology',
        },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// immutability
// ---------------------------------------------------------------------------

describe('KnowledgeItem — immutability', () => {
  it('entity is frozen', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = KnowledgeItem.create(
      validInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeItem.create(
      validInput({
        type: 'workflow',
        attributes: createKnowledgeItemAttributes('methodology'),
      }),
    );

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// no mutation API
// ---------------------------------------------------------------------------

describe('KnowledgeItem — no mutation API', () => {
  it('does not expose rename', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).rename).toBeUndefined();
    }
  });

  it('does not expose changeSlug', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).changeSlug).toBeUndefined();
    }
  });

  it('does not expose markValid', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).markValid).toBeUndefined();
    }
  });

  it('does not expose markInvalid', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).markInvalid).toBeUndefined();
    }
  });

  it('does not expose archive', () => {
    const result = KnowledgeItem.create(validInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).archive).toBeUndefined();
    }
  });
});
