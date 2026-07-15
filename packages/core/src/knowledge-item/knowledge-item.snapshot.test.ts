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
  type RestoreKnowledgeItemInput,
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

function validCreateInput(overrides?: Partial<CreateKnowledgeItemInput>): CreateKnowledgeItemInput {
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

function validRestoreInput(
  overrides?: Partial<RestoreKnowledgeItemInput>,
): RestoreKnowledgeItemInput {
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
    validationState: 'pending',
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Snapshot completo
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — complete snapshot', () => {
  const ssk = sourceStableKey('doc:chpt:42');
  const t = title('Chapter 42');
  const s = slug('chapter-42');
  const c = normalizedContent();
  const attrs = createKnowledgeItemAttributes('section');
  const order = displayOrder(3);
  const checksum = contentChecksum(
    '9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  );

  const result = KnowledgeItem.restore(
    validRestoreInput({
      knowledgeItemId: fixtureKnowledgeItemId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      playbookVersionId: fixturePvId,
      type: 'section',
      sourceStableKey: ssk,
      title: t,
      slug: s,
      content: c,
      attributes: attrs,
      sourceReference: sourceReference(),
      parentKnowledgeItemId: fixtureParentId,
      displayOrder: order,
      contentChecksum: checksum,
      validationState: 'valid',
      createdAt: fixtureCreatedAt,
    }),
  );

  if (!result.success) throw new Error('Fixture must be valid.');
  const snapshot = result.value.toSnapshot();

  it('includes knowledgeItemId as string', () => {
    expect(snapshot.knowledgeItemId).toBe(fixtureKnowledgeItemId);
  });

  it('includes workspaceId as string', () => {
    expect(snapshot.workspaceId).toBe(fixtureWorkspaceId);
  });

  it('includes playbookId as string', () => {
    expect(snapshot.playbookId).toBe(fixturePlaybookId);
  });

  it('includes playbookVersionId as string', () => {
    expect(snapshot.playbookVersionId).toBe(fixturePvId);
  });

  it('includes type', () => {
    expect(snapshot.type).toBe('section');
  });

  it('includes sourceStableKey as string', () => {
    expect(snapshot.sourceStableKey).toBe('doc:chpt:42');
  });

  it('includes title as string', () => {
    expect(snapshot.title).toBe('Chapter 42');
  });

  it('includes slug as string', () => {
    expect(snapshot.slug).toBe('chapter-42');
  });

  it('includes content with text property', () => {
    expect(snapshot.content).toEqual({ text: 'Content text' });
  });

  it('includes attributes with type property', () => {
    expect(snapshot.attributes).toEqual({ type: 'section' });
  });

  it('includes sourceReference with three fields', () => {
    expect(snapshot.sourceReference).toEqual({
      provider: 'notion',
      objectType: 'page',
      externalId: 'abc123',
    });
  });

  it('includes parentKnowledgeItemId as string', () => {
    expect(snapshot.parentKnowledgeItemId).toBe(fixtureParentId);
  });

  it('includes displayOrder as number', () => {
    expect(snapshot.displayOrder).toBe(3);
  });

  it('includes contentChecksum with algorithm and value', () => {
    expect(snapshot.contentChecksum).toEqual({
      algorithm: 'sha256',
      value: 'sha256:9999999999abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    });
  });

  it('includes validationState', () => {
    expect(snapshot.validationState).toBe('valid');
  });

  it('includes createdAt as ISO string', () => {
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Valores opcionales
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — optional values', () => {
  it('serialises slug as null', () => {
    const result = KnowledgeItem.create(validCreateInput({ slug: null }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().slug).toBeNull();
  });

  it('serialises parentKnowledgeItemId as null', () => {
    const result = KnowledgeItem.create(validCreateInput({ parentKnowledgeItemId: null }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().parentKnowledgeItemId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Estados históricos
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — historical states', () => {
  it('serialises validationState: pending', () => {
    const result = KnowledgeItem.restore(validRestoreInput({ validationState: 'pending' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('pending');
  });

  it('serialises validationState: valid', () => {
    const result = KnowledgeItem.restore(validRestoreInput({ validationState: 'valid' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('valid');
  });

  it('serialises validationState: invalid', () => {
    const result = KnowledgeItem.restore(validRestoreInput({ validationState: 'invalid' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('invalid');
  });
});

// ---------------------------------------------------------------------------
// Ocho Knowledge Types
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — eight knowledge types', () => {
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

  it.each(knowledgeTypes)('serialises type and attributes.type for %s', (type) => {
    const result = KnowledgeItem.create(
      validCreateInput({
        type,
        attributes: createKnowledgeItemAttributes(type),
      }),
    );
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();
    expect(snapshot.type).toBe(type);
    expect(snapshot.attributes.type).toBe(type);
  });
});

// ---------------------------------------------------------------------------
// Representaciones primitivas
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — primitive representations', () => {
  it('does not contain domain class instances', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();

    const values = [
      snapshot.knowledgeItemId,
      snapshot.workspaceId,
      snapshot.playbookId,
      snapshot.playbookVersionId,
      snapshot.sourceStableKey,
      snapshot.title,
      snapshot.content.text,
      snapshot.createdAt,
    ];

    for (const v of values) {
      expect(typeof v).toBe('string');
    }

    expect(typeof snapshot.displayOrder).toBe('number');
    expect(snapshot.slug === null || typeof snapshot.slug === 'string').toBe(true);
    expect(
      snapshot.parentKnowledgeItemId === null || typeof snapshot.parentKnowledgeItemId === 'string',
    ).toBe(true);
    expect(typeof snapshot.contentChecksum.algorithm).toBe('string');
    expect(typeof snapshot.contentChecksum.value).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — immutability', () => {
  it('freezes the snapshot root', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot())).toBe(true);
  });

  it('freezes snapshot.content', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot().content)).toBe(true);
  });

  it('freezes snapshot.attributes', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot().attributes)).toBe(true);
  });

  it('freezes snapshot.sourceReference', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot().sourceReference)).toBe(true);
  });

  it('freezes snapshot.contentChecksum', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot().contentChecksum)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Independencia del snapshot
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — independence', () => {
  it('returns a new root object on each call', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const item = result.value;
    const first = item.toSnapshot();
    const second = item.toSnapshot();
    expect(first).not.toBe(second);
  });

  it('returns new content object on each call', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const item = result.value;
    const first = item.toSnapshot();
    const second = item.toSnapshot();
    expect(first.content).not.toBe(second.content);
  });

  it('returns new attributes object on each call', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const item = result.value;
    const first = item.toSnapshot();
    const second = item.toSnapshot();
    expect(first.attributes).not.toBe(second.attributes);
  });

  it('returns new sourceReference object on each call', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const item = result.value;
    const first = item.toSnapshot();
    const second = item.toSnapshot();
    expect(first.sourceReference).not.toBe(second.sourceReference);
  });

  it('produces deeply equivalent values', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const item = result.value;
    const first = item.toSnapshot();
    const second = item.toSnapshot();
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// No exposición del estado
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — no state exposure', () => {
  it('snapshot is not extensible', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(() => {
      (result.value.toSnapshot() as unknown as Record<string, unknown>).extra = true;
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Compatibilidad con creación
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — compatibility with create', () => {
  it('created item produces validationState: pending', () => {
    const result = KnowledgeItem.create(validCreateInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// Compatibilidad con restauración
// ---------------------------------------------------------------------------

describe('KnowledgeItem.toSnapshot — compatibility with restore', () => {
  it('restored item with valid state preserves it', () => {
    const result = KnowledgeItem.restore(validRestoreInput({ validationState: 'valid' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('valid');
  });

  it('restored item with invalid state preserves it', () => {
    const result = KnowledgeItem.restore(validRestoreInput({ validationState: 'invalid' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().validationState).toBe('invalid');
  });
});
