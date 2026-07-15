import { describe, expect, it } from 'vitest';

import { parseKnowledgeItemId, parsePlaybookVersionId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  KnowledgeRelationship,
  SourceReference,
  type KnowledgeRelationshipType,
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
// Restauración válida
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — valid', () => {
  it('restores a valid relationship', () => {
    const result = KnowledgeRelationship.restore(restoreInput());

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
    const result = KnowledgeRelationship.restore(restoreInput({ type }));

    expect(result.success).toBe(true);
  });

  it('preserves sourceReference: null', () => {
    const result = KnowledgeRelationship.restore(restoreInput({ sourceReference: null }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.sourceReference).toBeNull();
    }
  });

  it('preserves a SourceReference instance', () => {
    const ref = sourceReference();
    const result = KnowledgeRelationship.restore(restoreInput({ sourceReference: ref }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.sourceReference).toBe(ref);
    }
  });
});

// ---------------------------------------------------------------------------
// Conservación exacta
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — exact preservation', () => {
  const ref = sourceReference();
  const input = restoreInput({
    workspaceId: fixtureWsId,
    playbookVersionId: fixturePvId,
    sourceKnowledgeItemId: fixtureSourceId,
    targetKnowledgeItemId: fixtureTargetId,
    type: 'contains',
    sourceReference: ref,
    createdAt: fixtureCreatedAt,
  });

  const result = KnowledgeRelationship.restore(input);
  if (!result.success) throw new Error('Fixture must be valid.');
  const relationship = result.value;

  it('preserves workspaceId', () => {
    expect(relationship.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookVersionId', () => {
    expect(relationship.playbookVersionId).toBe(fixturePvId);
  });

  it('preserves sourceKnowledgeItemId', () => {
    expect(relationship.sourceKnowledgeItemId).toBe(fixtureSourceId);
  });

  it('preserves targetKnowledgeItemId', () => {
    expect(relationship.targetKnowledgeItemId).toBe(fixtureTargetId);
  });

  it('preserves type', () => {
    expect(relationship.type).toBe('contains');
  });

  it('preserves sourceReference instance', () => {
    expect(relationship.sourceReference).toBe(ref);
  });

  it('preserves createdAt', () => {
    expect(relationship.createdAt.equals(fixtureCreatedAt)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tipo desconocido
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — unknown type', () => {
  it.each([
    ['empty string', ''],
    ['uppercase Contains', 'Contains'],
    ['all uppercase REFERENCES', 'REFERENCES'],
    ['leading whitespace', ' contains'],
    ['trailing whitespace', 'contains '],
    ['hyphen variant', 'related-to'],
    ['camelCase variant', 'relatedTo'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, type) => {
    const result = KnowledgeRelationship.restore(restoreInput({ type }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_RELATIONSHIP_RESTORATION_STATE_INVALID',
        details: {
          field: 'type',
          reason: 'unknown_relationship_type',
          currentValue: type,
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Autorrelación
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — self-reference', () => {
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
    const result = KnowledgeRelationship.restore(
      restoreInput({
        sourceKnowledgeItemId: fixtureSourceId,
        targetKnowledgeItemId: fixtureSourceId,
        type,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_RELATIONSHIP_RESTORATION_STATE_INVALID',
        details: {
          field: 'targetKnowledgeItemId',
          reason: 'self_reference',
          knowledgeItemId: fixtureSourceId,
          relationshipType: type,
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Prioridad
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — validation priority', () => {
  it('returns unknown_relationship_type before self_reference', () => {
    const result = KnowledgeRelationship.restore(
      restoreInput({
        sourceKnowledgeItemId: fixtureSourceId,
        targetKnowledgeItemId: fixtureSourceId,
        type: 'bogus',
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'KNOWLEDGE_RELATIONSHIP_RESTORATION_STATE_INVALID',
        details: {
          field: 'type',
          reason: 'unknown_relationship_type',
          currentValue: 'bogus',
        },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Sin reparación
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — no repair', () => {
  it('does not convert uppercase to lowercase', () => {
    const result = KnowledgeRelationship.restore(restoreInput({ type: 'References' }));

    expect(result.success).toBe(false);
  });

  it('does not swap source and target', () => {
    const result = KnowledgeRelationship.restore(
      restoreInput({
        sourceKnowledgeItemId: fixtureSourceId,
        targetKnowledgeItemId: fixtureTargetId,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.sourceKnowledgeItemId).toBe(fixtureSourceId);
      expect(result.value.targetKnowledgeItemId).toBe(fixtureTargetId);
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('KnowledgeRelationship.restore — immutability', () => {
  it('restored entity is frozen', () => {
    const result = KnowledgeRelationship.restore(restoreInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = KnowledgeRelationship.restore(restoreInput({ type: 'bogus' }));

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = KnowledgeRelationship.restore(restoreInput({ type: 'bogus' }));

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
