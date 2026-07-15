import { describe, expect, it } from 'vitest';

import { parseKnowledgeItemId, parsePlaybookVersionId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  KnowledgeRelationship,
  SourceReference,
  type KnowledgeRelationshipType,
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

// ---------------------------------------------------------------------------
// Creación válida
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.create — valid', () => {
  it('creates a valid relationship', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
  });

  const relationshipTypes: KnowledgeRelationshipType[] = [
    'contains',
    'references',
    'implements',
    'uses',
    'evaluates',
    'supports',
    'related_to',
  ];

  it.each(relationshipTypes)('works with %s type', (type) => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type,
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
  });

  it('accepts sourceReference: null', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
  });

  it('accepts a SourceReference instance', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: ref,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.sourceReference).toBe(ref);
    }
  });
});

// ---------------------------------------------------------------------------
// Dirección
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.create — direction', () => {
  it('preserves source and target order', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.sourceKnowledgeItemId).toBe(fixtureSourceId);
      expect(result.value.targetKnowledgeItemId).toBe(fixtureTargetId);
    }
  });

  it('does not swap source and target', () => {
    const source = fixtureSourceId;
    const target = fixtureTargetId;

    const ab = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: source,
      targetKnowledgeItemId: target,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    const ba = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: target,
      targetKnowledgeItemId: source,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(ab.success).toBe(true);
    expect(ba.success).toBe(true);
    if (ab.success && ba.success) {
      expect(ab.value.sourceKnowledgeItemId).toBe(source);
      expect(ab.value.targetKnowledgeItemId).toBe(target);
      expect(ba.value.sourceKnowledgeItemId).toBe(target);
      expect(ba.value.targetKnowledgeItemId).toBe(source);
    }
  });
});

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship — getters', () => {
  const ref = sourceReference();
  const result = KnowledgeRelationship.create({
    workspaceId: fixtureWsId,
    playbookVersionId: fixturePvId,
    sourceKnowledgeItemId: fixtureSourceId,
    targetKnowledgeItemId: fixtureTargetId,
    type: 'contains',
    sourceReference: ref,
    createdAt: fixtureCreatedAt,
  });

  if (!result.success) throw new Error('Fixture must be valid.');
  const relationship = result.value;

  it('returns workspaceId', () => {
    expect(relationship.workspaceId).toBe(fixtureWsId);
  });

  it('returns playbookVersionId', () => {
    expect(relationship.playbookVersionId).toBe(fixturePvId);
  });

  it('returns sourceKnowledgeItemId', () => {
    expect(relationship.sourceKnowledgeItemId).toBe(fixtureSourceId);
  });

  it('returns targetKnowledgeItemId', () => {
    expect(relationship.targetKnowledgeItemId).toBe(fixtureTargetId);
  });

  it('returns type', () => {
    expect(relationship.type).toBe('contains');
  });

  it('returns sourceReference instance', () => {
    expect(relationship.sourceReference).toBe(ref);
  });

  it('returns createdAt', () => {
    expect(relationship.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Autorrelación
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.create — self-reference', () => {
  const relationshipTypes: KnowledgeRelationshipType[] = [
    'contains',
    'references',
    'implements',
    'uses',
    'evaluates',
    'supports',
    'related_to',
  ];

  it.each(relationshipTypes)('rejects self-reference for %s', (type) => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureSourceId,
      type,
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(false);
  });

  it('returns KNOWLEDGE_RELATIONSHIP_SELF_REFERENCE error', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureSourceId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result).toMatchObject({
      success: false,
      error: { code: 'KNOWLEDGE_RELATIONSHIP_SELF_REFERENCE' },
    });
  });

  it('includes knowledgeItemId and relationshipType in details', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureSourceId,
      type: 'supports',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        details: {
          knowledgeItemId: fixtureSourceId,
          relationshipType: 'supports',
        },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad del error
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship — error immutability', () => {
  it('error root is frozen', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureSourceId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureSourceId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad de entidad
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship — entity immutability', () => {
  it('entity is frozen', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Ausencia de API prematura
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship — no premature API', () => {
  it('does not expose reverse', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).reverse).toBeUndefined();
    }
  });

  it('does not expose archive', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).archive).toBeUndefined();
    }
  });

  it('does not expose changeType', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).changeType).toBeUndefined();
    }
  });

  it('does not expose replaceTarget', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).replaceTarget).toBeUndefined();
    }
  });

  it('does not expose toSnapshot', () => {
    const result = KnowledgeRelationship.create({
      workspaceId: fixtureWsId,
      playbookVersionId: fixturePvId,
      sourceKnowledgeItemId: fixtureSourceId,
      targetKnowledgeItemId: fixtureTargetId,
      type: 'references',
      sourceReference: null,
      createdAt: fixtureCreatedAt,
    });

    if (result.success) {
      expect((result.value as unknown as Record<string, unknown>).toSnapshot).toBeUndefined();
    }
  });

});
