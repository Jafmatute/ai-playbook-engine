import { describe, expect, it } from 'vitest';

import type {
  KnowledgeItemId,
  KnowledgeRelationshipType,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  Instant,
  KnowledgeRelationship,
  parseKnowledgeItemId,
  parsePlaybookVersionId,
  parseWorkspaceId,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { KnowledgeRelationshipRepository } from './knowledge-relationship-repository.js';

// ---------------------------------------------------------------------------
// Stub result types
// ---------------------------------------------------------------------------

type ListBySourceItemStubResult =
  | {
      readonly kind: 'knowledgeRelationships';
      readonly knowledgeRelationships: readonly KnowledgeRelationship[];
    }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListBySourceItemCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
  sourceKnowledgeItemId: KnowledgeItemId;
}>;

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubKnowledgeRelationshipRepository implements KnowledgeRelationshipRepository {
  readonly #result: ListBySourceItemStubResult;
  #call: ListBySourceItemCall | null = null;

  private constructor(result: ListBySourceItemStubResult) {
    this.#result = result;
  }

  static returningKnowledgeRelationships(
    knowledgeRelationships: readonly KnowledgeRelationship[],
  ): StubKnowledgeRelationshipRepository {
    return new StubKnowledgeRelationshipRepository({
      kind: 'knowledgeRelationships',
      knowledgeRelationships: Object.freeze([...knowledgeRelationships]),
    });
  }

  static returningNoKnowledgeRelationships(): StubKnowledgeRelationshipRepository {
    return new StubKnowledgeRelationshipRepository({
      kind: 'knowledgeRelationships',
      knowledgeRelationships: Object.freeze([]),
    });
  }

  static returningListBySourceItemError(
    error: PersistenceOperationFailedError,
  ): StubKnowledgeRelationshipRepository {
    return new StubKnowledgeRelationshipRepository({ kind: 'error', error });
  }

  get listBySourceItemCall(): ListBySourceItemCall | null {
    return this.#call;
  }

  async listBySourceItem(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    sourceKnowledgeItemId: KnowledgeItemId,
  ): Promise<Result<readonly KnowledgeRelationship[], PersistenceOperationFailedError>> {
    this.#call = Object.freeze({ workspaceId, playbookVersionId, sourceKnowledgeItemId });

    switch (this.#result.kind) {
      case 'knowledgeRelationships': {
        return ok(this.#result.knowledgeRelationships);
      }
      case 'error': {
        return err(this.#result.error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

interface KnowledgeRelationshipFixtureOptions {
  readonly workspaceId: string;
  readonly playbookVersionId: string;
  readonly sourceKnowledgeItemId: string;
  readonly targetKnowledgeItemId: string;
  readonly type: KnowledgeRelationshipType;
  readonly createdAt: string;
}

function createValidKnowledgeRelationship(
  options?: Partial<KnowledgeRelationshipFixtureOptions>,
): KnowledgeRelationship {
  const workspaceIdRaw = options?.workspaceId ?? '00000000-0000-0000-0000-000000000001';
  const workspaceIdResult = parseWorkspaceId(workspaceIdRaw);
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000002';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const sourceKnowledgeItemIdRaw =
    options?.sourceKnowledgeItemId ?? '00000000-0000-0000-0000-00000000000a';
  const sourceKnowledgeItemIdResult = parseKnowledgeItemId(sourceKnowledgeItemIdRaw);
  if (!sourceKnowledgeItemIdResult.success) {
    throw new Error('Expected a valid knowledge item ID fixture.');
  }

  const targetKnowledgeItemIdRaw =
    options?.targetKnowledgeItemId ?? '00000000-0000-0000-0000-00000000000b';
  const targetKnowledgeItemIdResult = parseKnowledgeItemId(targetKnowledgeItemIdRaw);
  if (!targetKnowledgeItemIdResult.success) {
    throw new Error('Expected a valid knowledge item ID fixture.');
  }

  const typeRaw = options?.type ?? 'references';
  const createdAtRaw = options?.createdAt ?? '2026-07-15T10:00:00.000Z';
  const createdAtResult = Instant.parse(createdAtRaw);
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const result = KnowledgeRelationship.create({
    workspaceId: workspaceIdResult.value,
    playbookVersionId: playbookVersionIdResult.value,
    sourceKnowledgeItemId: sourceKnowledgeItemIdResult.value,
    targetKnowledgeItemId: targetKnowledgeItemIdResult.value,
    type: typeRaw,
    sourceReference: null,
    createdAt: createdAtResult.value,
  });
  if (!result.success) {
    throw new Error('Expected a valid knowledge relationship fixture.');
  }

  return result.value;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KnowledgeRelationshipRepository', () => {
  describe('listBySourceItem — relationships found', () => {
    it('returns all source relationships for the item within the version', async () => {
      const relationshipA = createValidKnowledgeRelationship({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        sourceKnowledgeItemId: '00000000-0000-0000-0000-00000000000a',
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000b',
        type: 'references',
        createdAt: '2026-07-15T10:00:00.000Z',
      });
      const relationshipB = createValidKnowledgeRelationship({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        sourceKnowledgeItemId: '00000000-0000-0000-0000-00000000000a',
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000c',
        type: 'contains',
        createdAt: '2026-07-15T11:00:00.000Z',
      });

      expect(relationshipA.type).not.toBe(relationshipB.type);

      expect(relationshipB.createdAt.compare(relationshipA.createdAt)).toBeGreaterThan(0);

      expect(relationshipA.targetKnowledgeItemId).not.toBe(relationshipB.targetKnowledgeItemId);

      const repository = StubKnowledgeRelationshipRepository.returningKnowledgeRelationships([
        relationshipA,
        relationshipB,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toBe(relationshipA);
      expect(result.value[1]).toBe(relationshipB);

      for (const relationship of result.value) {
        expect(relationship.workspaceId).toBe(workspaceId.value);
        expect(relationship.playbookVersionId).toBe(playbookVersionId.value);
        expect(relationship.sourceKnowledgeItemId).toBe(sourceItemId.value);
      }

      expect(result.value[0]?.targetKnowledgeItemId).not.toBe(
        result.value[1]?.targetKnowledgeItemId,
      );

      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — no relationships', () => {
    it('returns a frozen empty array when there are no relationships', async () => {
      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const relationshipA = createValidKnowledgeRelationship({
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000b',
        type: 'references',
      });
      const relationshipB = createValidKnowledgeRelationship({
        sourceKnowledgeItemId: '00000000-0000-0000-0000-00000000000a',
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000c',
        type: 'contains',
        createdAt: '2026-07-15T11:00:00.000Z',
      });

      const configured: KnowledgeRelationship[] = [relationshipA];
      const repository =
        StubKnowledgeRelationshipRepository.returningKnowledgeRelationships(configured);
      configured.push(relationshipB);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toBe(relationshipA);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — knowledge item does not exist', () => {
    it('returns a frozen empty array when the source knowledge item does not exist', async () => {
      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const nonExistentItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        nonExistentItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — wrong workspace', () => {
    it('returns a frozen empty array when queried from a different workspace', async () => {
      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceB.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — wrong playbook version', () => {
    it('returns a frozen empty array when queried from a different playbook version', async () => {
      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const otherVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000f');
      if (!otherVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        otherVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — item appears only as target', () => {
    it('returns a frozen empty array when the item only appears as a target, not source', async () => {
      const incomingRelationship = createValidKnowledgeRelationship({
        sourceKnowledgeItemId: '00000000-0000-0000-0000-00000000000a',
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000b',
      });

      expect(incomingRelationship.sourceKnowledgeItemId).not.toBe(
        incomingRelationship.targetKnowledgeItemId,
      );

      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const targetOnlyId = incomingRelationship.targetKnowledgeItemId;

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        targetOnlyId,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — another item has relationships', () => {
    it('returns a frozen empty array when only another item has outgoing relationships', async () => {
      const queriedSourceResult = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!queriedSourceResult.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const otherSourceResult = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000c');
      if (!otherSourceResult.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const otherSourceRelationship = createValidKnowledgeRelationship({
        sourceKnowledgeItemId: '00000000-0000-0000-0000-00000000000c',
        targetKnowledgeItemId: '00000000-0000-0000-0000-00000000000d',
      });

      expect(queriedSourceResult.value).not.toBe(otherSourceResult.value);

      expect(otherSourceRelationship.sourceKnowledgeItemId).toBe(otherSourceResult.value);

      expect(otherSourceRelationship.sourceKnowledgeItemId).not.toBe(queriedSourceResult.value);

      const repository = StubKnowledgeRelationshipRepository.returningNoKnowledgeRelationships();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        queriedSourceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listBySourceItem — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('knowledgeRelationship.listBySourceItem');
      const repository = StubKnowledgeRelationshipRepository.returningListBySourceItemError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('knowledgeRelationship.listBySourceItem');
    });
  });

  describe('listBySourceItem — argument capture', () => {
    it('captures the workspaceId, playbookVersionId, and sourceKnowledgeItemId from the last call', async () => {
      const relationship = createValidKnowledgeRelationship();
      const repository = StubKnowledgeRelationshipRepository.returningKnowledgeRelationships([
        relationship,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceItemId = parseKnowledgeItemId('00000000-0000-0000-0000-00000000000a');
      if (!sourceItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      await repository.listBySourceItem(
        workspaceId.value,
        playbookVersionId.value,
        sourceItemId.value,
      );

      const call = repository.listBySourceItemCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookVersionId).toBe(playbookVersionId.value);
      expect(call.sourceKnowledgeItemId).toBe(sourceItemId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listBySourceItem — accepts typed IDs', () => {
    it('compiles with WorkspaceId, PlaybookVersionId, and KnowledgeItemId parameter types', () => {
      const relationship = createValidKnowledgeRelationship();
      const repository = StubKnowledgeRelationshipRepository.returningKnowledgeRelationships([
        relationship,
      ]);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
        sourceKnowledgeItemId: KnowledgeItemId,
      ) => Promise<Result<readonly KnowledgeRelationship[], PersistenceOperationFailedError>> = (
        wsId,
        pvId,
        sourceId,
      ) => repository.listBySourceItem(wsId, pvId, sourceId);

      void _acceptsTypedIds;
    });
  });
});
