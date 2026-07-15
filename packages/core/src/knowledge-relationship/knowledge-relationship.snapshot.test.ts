import { describe, expect, it } from 'vitest';

import { parseKnowledgeItemId, parsePlaybookVersionId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  KnowledgeRelationship,
  SourceReference,
  type KnowledgeRelationshipType,
  type CreateKnowledgeRelationshipInput,
  type RestoreKnowledgeRelationshipInput,
} from '../index.js';

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid WorkspaceId fixture.');
  return result.value;
}

function parsedPvId(value: string) {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('Invalid PlaybookVersionId fixture.');
  return result.value;
}

function parsedKiId(value: string) {
  const result = parseKnowledgeItemId(value);
  if (!result.success) throw new Error('Invalid KnowledgeItemId fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid Instant fixture.');
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

const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePvId = parsedPvId('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
const fixtureSourceId = parsedKiId('11111111-2222-3333-4444-555555555555');
const fixtureTargetId = parsedKiId('22222222-3333-4444-5555-666666666666');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');

function createInput(
  overrides?: Partial<CreateKnowledgeRelationshipInput>,
): CreateKnowledgeRelationshipInput {
  return {
    workspaceId: fixtureWsId,
    playbookVersionId: fixturePvId,
    sourceKnowledgeItemId: fixtureSourceId,
    targetKnowledgeItemId: fixtureTargetId,
    type: 'references',
    sourceReference: null,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

function restoreInput(
  overrides?: Partial<RestoreKnowledgeRelationshipInput>,
): RestoreKnowledgeRelationshipInput {
  return {
    workspaceId: fixtureWsId,
    playbookVersionId: fixturePvId,
    sourceKnowledgeItemId: fixtureSourceId,
    targetKnowledgeItemId: fixtureTargetId,
    type: 'references',
    sourceReference: null,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Snapshot completo
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — complete snapshot', () => {
  const ref = sourceReference();
  const result = KnowledgeRelationship.create(
    createInput({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'contains',
      sourceReference: ref,
      createdAt: fixtureCreatedAt,
    }),
  );

  if (!result.success) throw new Error('Fixture must be valid.');
  const snapshot = result.value.toSnapshot();

  it('includes workspaceId as string', () => {
    expect(snapshot.workspaceId).toBe(fixtureWsId);
  });

  it('includes playbookVersionId as string', () => {
    expect(snapshot.playbookVersionId).toBe(fixturePvId);
  });

  it('includes sourceKnowledgeItemId as string', () => {
    expect(snapshot.sourceKnowledgeItemId).toBe(fixtureSourceId);
  });

  it('includes targetKnowledgeItemId as string', () => {
    expect(snapshot.targetKnowledgeItemId).toBe(fixtureTargetId);
  });

  it('includes type', () => {
    expect(snapshot.type).toBe('contains');
  });

  it('includes sourceReference with three fields', () => {
    expect(snapshot.sourceReference).toEqual({
      provider: 'notion',
      objectType: 'page',
      externalId: 'abc123',
    });
  });

  it('includes createdAt as ISO string', () => {
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// SourceReference: null
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — sourceReference null', () => {
  it('serialises sourceReference as null', () => {
    const result = KnowledgeRelationship.create(createInput({ sourceReference: null }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().sourceReference).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Siete tipos
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — seven types', () => {
  const relationshipTypes: KnowledgeRelationshipType[] = [
    'contains',
    'references',
    'implements',
    'uses',
    'evaluates',
    'supports',
    'related_to',
  ];

  it.each(relationshipTypes)('serialises type as %s', (type) => {
    const result = KnowledgeRelationship.create(createInput({ type }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().type).toBe(type);
  });
});

// ---------------------------------------------------------------------------
// Dirección
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — direction', () => {
  it('preserves source and target in received order', () => {
    const result = KnowledgeRelationship.create(
      createInput({
        sourceKnowledgeItemId: fixtureSourceId,
        targetKnowledgeItemId: fixtureTargetId,
      }),
    );
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();
    expect(snapshot.sourceKnowledgeItemId).toBe(fixtureSourceId);
    expect(snapshot.targetKnowledgeItemId).toBe(fixtureTargetId);
  });

  it('produces different snapshots for A→B vs B→A', () => {
    const ab = KnowledgeRelationship.create(
      createInput({
        sourceKnowledgeItemId: fixtureSourceId,
        targetKnowledgeItemId: fixtureTargetId,
      }),
    );
    const ba = KnowledgeRelationship.create(
      createInput({
        sourceKnowledgeItemId: fixtureTargetId,
        targetKnowledgeItemId: fixtureSourceId,
      }),
    );
    if (!ab.success || !ba.success) throw new Error('Fixtures must be valid.');
    const snapAB = ab.value.toSnapshot();
    const snapBA = ba.value.toSnapshot();
    expect(snapAB.sourceKnowledgeItemId).toBe(fixtureSourceId);
    expect(snapAB.targetKnowledgeItemId).toBe(fixtureTargetId);
    expect(snapBA.sourceKnowledgeItemId).toBe(fixtureTargetId);
    expect(snapBA.targetKnowledgeItemId).toBe(fixtureSourceId);
    expect(snapAB.sourceKnowledgeItemId).not.toBe(snapBA.sourceKnowledgeItemId);
  });
});

// ---------------------------------------------------------------------------
// Representaciones primitivas
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — primitive representations', () => {
  it('contains only strings and plain objects', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create(createInput({ sourceReference: ref }));
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();

    expect(typeof snapshot.workspaceId).toBe('string');
    expect(typeof snapshot.playbookVersionId).toBe('string');
    expect(typeof snapshot.sourceKnowledgeItemId).toBe('string');
    expect(typeof snapshot.targetKnowledgeItemId).toBe('string');
    expect(typeof snapshot.type).toBe('string');
    expect(typeof snapshot.createdAt).toBe('string');
    expect(snapshot.sourceReference).not.toBeNull();
    expect(typeof snapshot.sourceReference!.provider).toBe('string');
    expect(typeof snapshot.sourceReference!.objectType).toBe('string');
    expect(typeof snapshot.sourceReference!.externalId).toBe('string');
  });

  it('does not contain SourceReference or Instant instances', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create(createInput({ sourceReference: ref }));
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();

    expect(snapshot.sourceReference).not.toBe(ref);
    expect(snapshot.createdAt).not.toBeInstanceOf(Instant);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — immutability', () => {
  it('freezes the snapshot root', () => {
    const result = KnowledgeRelationship.create(createInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot())).toBe(true);
  });

  it('freezes sourceReference when present', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create(createInput({ sourceReference: ref }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(Object.isFrozen(result.value.toSnapshot().sourceReference)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Independencia
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — independence', () => {
  it('returns a new root object on each call', () => {
    const result = KnowledgeRelationship.create(createInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const relationship = result.value;
    const first = relationship.toSnapshot();
    const second = relationship.toSnapshot();
    expect(first).not.toBe(second);
  });

  it('returns new sourceReference on each call when present', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create(createInput({ sourceReference: ref }));
    if (!result.success) throw new Error('Fixture must be valid.');
    const relationship = result.value;
    const first = relationship.toSnapshot();
    const second = relationship.toSnapshot();
    expect(first.sourceReference).not.toBe(second.sourceReference);
  });

  it('produces deeply equivalent values', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create(createInput({ sourceReference: ref }));
    if (!result.success) throw new Error('Fixture must be valid.');
    const relationship = result.value;
    const first = relationship.toSnapshot();
    const second = relationship.toSnapshot();
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// Compatibilidad con create()
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — compatibility with create', () => {
  it('produces a valid snapshot from created relationship', () => {
    const result = KnowledgeRelationship.create(createInput());
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();
    expect(snapshot.workspaceId).toBe(fixtureWsId);
    expect(snapshot.type).toBe('references');
  });
});

// ---------------------------------------------------------------------------
// Compatibilidad con restore()
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.toSnapshot — compatibility with restore', () => {
  it('preserves type from restored relationship', () => {
    const result = KnowledgeRelationship.restore(restoreInput({ type: 'implements' }));
    if (!result.success) throw new Error('Fixture must be valid.');
    expect(result.value.toSnapshot().type).toBe('implements');
  });

  it('preserves direction from restored relationship', () => {
    const result = KnowledgeRelationship.restore(
      restoreInput({
        sourceKnowledgeItemId: fixtureTargetId,
        targetKnowledgeItemId: fixtureSourceId,
      }),
    );
    if (!result.success) throw new Error('Fixture must be valid.');
    const snapshot = result.value.toSnapshot();
    expect(snapshot.sourceKnowledgeItemId).toBe(fixtureTargetId);
    expect(snapshot.targetKnowledgeItemId).toBe(fixtureSourceId);
  });
});
