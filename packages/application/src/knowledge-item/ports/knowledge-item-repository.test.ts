import { describe, expect, it } from 'vitest';

import type { KnowledgeItemId, PlaybookVersionId, WorkspaceId } from '@ai-playbook-engine/core';
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

type FindBySourceStableKeyStubResult =
  | {
      readonly kind: 'knowledgeItem';
      readonly knowledgeItem: KnowledgeItem;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySourceStableKeyCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
  sourceStableKey: SourceStableKey;
}>;

type CountByVersionStubResult =
  | { readonly kind: 'count'; readonly count: number }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type CountByVersionCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
}>;

class StubKnowledgeItemRepository implements KnowledgeItemRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySourceStableKeyResult: FindBySourceStableKeyStubResult;
  readonly #countByVersionResult: CountByVersionStubResult;
  #findBySourceStableKeyCall: FindBySourceStableKeyCall | null = null;
  #countByVersionCall: CountByVersionCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySourceStableKeyResult: FindBySourceStableKeyStubResult,
    countByVersionResult: CountByVersionStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySourceStableKeyResult = findBySourceStableKeyResult;
    this.#countByVersionResult = countByVersionResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningKnowledgeItem(knowledgeItem: KnowledgeItem): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'knowledgeItem', knowledgeItem },
      { kind: 'null' },
      { kind: 'count', count: 0 },
    );
  }

  static returningNull(): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
    );
  }

  static returningError(error: PersistenceOperationFailedError): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'error', error },
      { kind: 'null' },
      { kind: 'count', count: 0 },
    );
  }

  // -- findBySourceStableKey factories --------------------------------------

  static returningKnowledgeItemBySourceStableKey(
    knowledgeItem: KnowledgeItem,
  ): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'knowledgeItem', knowledgeItem },
      { kind: 'count', count: 0 },
    );
  }

  static returningNoKnowledgeItemBySourceStableKey(): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
    );
  }

  static returningFindBySourceStableKeyError(
    error: PersistenceOperationFailedError,
  ): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'error', error },
      { kind: 'count', count: 0 },
    );
  }

  // -- countByVersion factories ---------------------------------------------

  static returningKnowledgeItemCount(count: number): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count },
    );
  }

  static returningNoKnowledgeItems(): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
    );
  }

  static returningCountByVersionError(
    error: PersistenceOperationFailedError,
  ): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- countByVersion -------------------------------------------------------

  get countByVersionCall(): CountByVersionCall | null {
    return this.#countByVersionCall;
  }

  async countByVersion(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<number, PersistenceOperationFailedError>> {
    this.#countByVersionCall = Object.freeze({ workspaceId, playbookVersionId });

    switch (this.#countByVersionResult.kind) {
      case 'count': {
        return ok(this.#countByVersionResult.count);
      }
      case 'error': {
        return err(this.#countByVersionResult.error);
      }
    }
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _knowledgeItemId: KnowledgeItemId,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'knowledgeItem': {
        return ok(this.#findByIdResult.knowledgeItem);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findBySourceStableKey ------------------------------------------------

  get findBySourceStableKeyCall(): FindBySourceStableKeyCall | null {
    return this.#findBySourceStableKeyCall;
  }

  async findBySourceStableKey(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    sourceStableKey: SourceStableKey,
  ): Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>> {
    this.#findBySourceStableKeyCall = Object.freeze({
      workspaceId,
      playbookVersionId,
      sourceStableKey,
    });

    switch (this.#findBySourceStableKeyResult.kind) {
      case 'knowledgeItem': {
        return ok(this.#findBySourceStableKeyResult.knowledgeItem);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findBySourceStableKeyResult.error);
      }
    }
  }
}

interface KnowledgeItemFixtureOptions {
  readonly knowledgeItemId: string;
  readonly playbookVersionId: string;
  readonly sourceStableKey: string;
}

function createValidKnowledgeItem(options?: Partial<KnowledgeItemFixtureOptions>): KnowledgeItem {
  const knowledgeItemIdRaw = options?.knowledgeItemId ?? '00000000-0000-0000-0000-000000000001';
  const knowledgeItemIdResult = parseKnowledgeItemId(knowledgeItemIdRaw);
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

  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000004';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const sourceStableKeyRaw = options?.sourceStableKey ?? 'src-stable-key-001';
  const sourceStableKeyResult = SourceStableKey.create(sourceStableKeyRaw);
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

  describe('findBySourceStableKey — independence from findById', () => {
    it('does not affect the default null result of findById', async () => {
      const knowledgeItem = createValidKnowledgeItem({
        sourceStableKey: 'section:independence',
      });
      const repository =
        StubKnowledgeItemRepository.returningKnowledgeItemBySourceStableKey(knowledgeItem);
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

  // -------------------------------------------------------------------------
  // findBySourceStableKey
  // -------------------------------------------------------------------------

  describe('findBySourceStableKey — found', () => {
    it('returns the KnowledgeItem matching the source stable key within the version', async () => {
      const knowledgeItem = createValidKnowledgeItem({
        playbookVersionId: '00000000-0000-0000-0000-000000000004',
        sourceStableKey: 'section:introduction',
      });
      const repository =
        StubKnowledgeItemRepository.returningKnowledgeItemBySourceStableKey(knowledgeItem);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(knowledgeItem);
      expect(knowledgeItem.playbookVersionId).toBe(playbookVersionId.value);
      expect(knowledgeItem.sourceStableKey.value).toBe('section:introduction');
    });
  });

  describe('findBySourceStableKey — key not found', () => {
    it('returns a successful Result with null when the key does not exist', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItemBySourceStableKey();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:nonexistent');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySourceStableKey — version not found', () => {
    it('returns a successful Result with null when the playbook version does not exist', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItemBySourceStableKey();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        nonExistentVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySourceStableKey — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItemBySourceStableKey();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceB.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySourceStableKey — same key in different version', () => {
    it('returns only the item for the queried version', async () => {
      const versionAItem = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
        sourceStableKey: 'section:introduction',
      });
      const versionBItem = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-00000000000b',
        sourceStableKey: 'section:introduction',
      });

      expect(versionAItem.playbookVersionId).not.toBe(versionBItem.playbookVersionId);
      expect(versionAItem.sourceStableKey.value).toBe(versionBItem.sourceStableKey.value);

      const repository =
        StubKnowledgeItemRepository.returningKnowledgeItemBySourceStableKey(versionAItem);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionAId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!versionAId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        versionAId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(versionAItem);
      expect(result.value).not.toBe(versionBItem);
    });
  });

  describe('findBySourceStableKey — different key in same version', () => {
    it('returns null when querying a key that does not match the stored item', async () => {
      const storedItem = createValidKnowledgeItem({
        playbookVersionId: '00000000-0000-0000-0000-000000000004',
        sourceStableKey: 'section:introduction',
      });
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItemBySourceStableKey();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const otherKeyResult = SourceStableKey.create('section:conclusion');
      if (!otherKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      void storedItem;

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        otherKeyResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySourceStableKey — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('knowledgeItem.findBySourceStableKey');
      const repository = StubKnowledgeItemRepository.returningFindBySourceStableKeyError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('knowledgeItem.findBySourceStableKey');
    });
  });

  describe('findBySourceStableKey — argument capture', () => {
    it('captures the workspaceId, playbookVersionId, and sourceStableKey from the last call', async () => {
      const knowledgeItem = createValidKnowledgeItem({
        sourceStableKey: 'section:capture-test',
      });
      const repository =
        StubKnowledgeItemRepository.returningKnowledgeItemBySourceStableKey(knowledgeItem);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:capture-test');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      const call = repository.findBySourceStableKeyCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookVersionId).toBe(playbookVersionId.value);
      expect(call!.sourceStableKey).toBe(sourceStableKeyResult.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findBySourceStableKey — accepts typed IDs', () => {
    it('compiles with WorkspaceId, PlaybookVersionId, and SourceStableKey parameter types', () => {
      const knowledgeItem = createValidKnowledgeItem();
      const repository =
        StubKnowledgeItemRepository.returningKnowledgeItemBySourceStableKey(knowledgeItem);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
        sourceStableKey: SourceStableKey,
      ) => Promise<Result<KnowledgeItem | null, PersistenceOperationFailedError>> = (
        wsId,
        pvId,
        ssk,
      ) => repository.findBySourceStableKey(wsId, pvId, ssk);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // countByVersion
  // -------------------------------------------------------------------------

  describe('countByVersion — positive count', () => {
    it('returns the number of KnowledgeItems for the version', async () => {
      const repository = StubKnowledgeItemRepository.returningKnowledgeItemCount(3);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(3);
    });
  });

  describe('countByVersion — no items', () => {
    it('returns 0 when the version has no KnowledgeItems', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItems();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(0);
    });
  });

  describe('countByVersion — version not found', () => {
    it('returns 0 when the playbook version does not exist', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItems();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceId.value, nonExistentVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(0);
    });
  });

  describe('countByVersion — wrong workspace', () => {
    it('returns 0 when queried from a different workspace', async () => {
      const repository = StubKnowledgeItemRepository.returningNoKnowledgeItems();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceB.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(0);
    });
  });

  describe('countByVersion — items in another version', () => {
    it('returns the count for the queried version, unaffected by other versions', async () => {
      const repository = StubKnowledgeItemRepository.returningKnowledgeItemCount(2);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionAId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!versionAId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceId.value, versionAId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(2);
    });
  });

  describe('countByVersion — independence from other operations', () => {
    it('does not affect findById and findBySourceStableKey defaults', async () => {
      const repository = StubKnowledgeItemRepository.returningKnowledgeItemCount(4);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const knowledgeItemId = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
      if (!knowledgeItemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const sourceStableKeyResult = SourceStableKey.create('section:introduction');
      if (!sourceStableKeyResult.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const findByIdResult = await repository.findById(workspaceId.value, knowledgeItemId.value);
      const findBySourceStableKeyResult = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        sourceStableKeyResult.value,
      );

      expect(findByIdResult.success).toBe(true);
      if (!findByIdResult.success) {
        return;
      }
      expect(findByIdResult.value).toBeNull();

      expect(findBySourceStableKeyResult.success).toBe(true);
      if (!findBySourceStableKeyResult.success) {
        return;
      }
      expect(findBySourceStableKeyResult.value).toBeNull();
    });
  });

  describe('countByVersion — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('knowledgeItem.countByVersion');
      const repository = StubKnowledgeItemRepository.returningCountByVersionError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.countByVersion(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('knowledgeItem.countByVersion');
    });
  });

  describe('countByVersion — argument capture', () => {
    it('captures the workspaceId and playbookVersionId from the last call', async () => {
      const repository = StubKnowledgeItemRepository.returningKnowledgeItemCount(5);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      await repository.countByVersion(workspaceId.value, playbookVersionId.value);

      const call = repository.countByVersionCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookVersionId).toBe(playbookVersionId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('countByVersion — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const repository = StubKnowledgeItemRepository.returningKnowledgeItemCount(1);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<number, PersistenceOperationFailedError>> = (wsId, pvId) =>
        repository.countByVersion(wsId, pvId);

      void _acceptsTypedIds;
    });
  });
});
