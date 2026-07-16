import { describe, expect, it } from 'vitest';

import type { KnowledgeItemId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  ContentChecksum,
  createKnowledgeItemAttributes,
  DisplayOrder,
  Instant,
  KnowledgeItem,
  KnowledgeSlug,
  KnowledgeTitle,
  NormalizedContent,
  NormalizedText,
  parseKnowledgeItemId,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
  SourceReference,
  SourceStableKey,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { KnowledgeItemRepository } from './knowledge-item-repository.js';

type FindByIdStubResult =
  | {
      readonly kind: 'knowledgeItem';
      readonly knowledgeItem: KnowledgeItem;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubKnowledgeItemRepository implements KnowledgeItemRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
  }

  static returningKnowledgeItem(knowledgeItem: KnowledgeItem): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository({ kind: 'knowledgeItem', knowledgeItem });
  }

  static returningNull(): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _knowledgeItemId: KnowledgeItemId,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'knowledgeItem': {
        return ok(this.#result.knowledgeItem);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#result.error);
      }
    }
  }
}

function createValidKnowledgeItem(): KnowledgeItem {
  const knowledgeItemIdResult = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
  if (!knowledgeItemIdResult.success) {
    throw new Error('Expected a valid knowledge item ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000003');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const playbookVersionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const sourceStableKeyResult = SourceStableKey.create('src-stable-key-001');
  if (!sourceStableKeyResult.success) {
    throw new Error('Expected a valid source stable key fixture.');
  }

  const titleResult = KnowledgeTitle.create('Test Knowledge Item');
  if (!titleResult.success) {
    throw new Error('Expected a valid knowledge title fixture.');
  }

  const slugResult = KnowledgeSlug.create('test-knowledge-item');
  if (!slugResult.success) {
    throw new Error('Expected a valid knowledge slug fixture.');
  }

  const normalizedTextResult = NormalizedText.create('Normalized content text.');
  if (!normalizedTextResult.success) {
    throw new Error('Expected a valid normalized text fixture.');
  }

  const normalizedContent = NormalizedContent.create({
    text: normalizedTextResult.value,
  });

  const sourceReferenceResult = SourceReference.create({
    provider: 'notion',
    objectType: 'page',
    externalId: 'abc123',
  });
  if (!sourceReferenceResult.success) {
    throw new Error('Expected a valid source reference fixture.');
  }

  const displayOrderResult = DisplayOrder.create(0);
  if (!displayOrderResult.success) {
    throw new Error('Expected a valid display order fixture.');
  }

  const contentChecksumResult = ContentChecksum.create(
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  );
  if (!contentChecksumResult.success) {
    throw new Error('Expected a valid content checksum fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const attributes = createKnowledgeItemAttributes('section');

  const result = KnowledgeItem.create({
    knowledgeItemId: knowledgeItemIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    playbookVersionId: playbookVersionIdResult.value,
    type: 'section',
    sourceStableKey: sourceStableKeyResult.value,
    title: titleResult.value,
    slug: slugResult.value,
    content: normalizedContent,
    attributes,
    sourceReference: sourceReferenceResult.value,
    parentKnowledgeItemId: null,
    displayOrder: displayOrderResult.value,
    contentChecksum: contentChecksumResult.value,
    createdAt: createdAtResult.value,
  });
  if (!result.success) {
    throw new Error('Expected a valid knowledge item fixture.');
  }

  return result.value;
}

describe('KnowledgeItemRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the KnowledgeItem instance', async () => {
      const knowledgeItem = createValidKnowledgeItem();
      const repository = StubKnowledgeItemRepository.returningKnowledgeItem(knowledgeItem);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, knowledgeItem.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(knowledgeItem);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubKnowledgeItemRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const knowledgeItemId = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
      if (!knowledgeItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, knowledgeItemId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the item belongs to a different workspace', async () => {
      const repository = StubKnowledgeItemRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const knowledgeItemId = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
      if (!knowledgeItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, knowledgeItemId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('knowledgeItem.findById');
      const repository = StubKnowledgeItemRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const knowledgeItemId = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
      if (!knowledgeItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, knowledgeItemId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('knowledgeItem.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and KnowledgeItemId parameter types', () => {
      const knowledgeItem = createValidKnowledgeItem();
      const repository = StubKnowledgeItemRepository.returningKnowledgeItem(knowledgeItem);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        knowledgeItemId: KnowledgeItemId,
      ) => Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>> = (wsId, kiId) =>
        repository.findById(wsId, kiId);

      void _acceptsTypedIds;
    });
  });
});
