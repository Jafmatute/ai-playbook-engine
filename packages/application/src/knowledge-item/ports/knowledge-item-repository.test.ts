import { describe, expect, it } from 'vitest';

import type {
  KnowledgeItemId,
  KnowledgeType,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
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

import type { KnowledgeItemListFilter } from '../knowledge-item-list-filter.js';
import type { Page, PaginationRequest } from '../../pagination/index.js';
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

type ListByVersionStubResult =
  | { readonly kind: 'page'; readonly page: Page<KnowledgeItem> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByVersionCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
  filter: KnowledgeItemListFilter;
  pagination: PaginationRequest;
}>;

function copyFrozenKnowledgeItemPage(page: Page<KnowledgeItem>): Page<KnowledgeItem> {
  const items = Object.freeze([...page.items]);

  if (page.totalCount === undefined) {
    return Object.freeze({ items, offset: page.offset, limit: page.limit, hasMore: page.hasMore });
  }

  return Object.freeze({
    items,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
    totalCount: page.totalCount,
  });
}

const DEFAULT_EMPTY_LIST_BY_VERSION_PAGE: Page<KnowledgeItem> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

class StubKnowledgeItemRepository implements KnowledgeItemRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySourceStableKeyResult: FindBySourceStableKeyStubResult;
  readonly #countByVersionResult: CountByVersionStubResult;
  readonly #listByVersionResult: ListByVersionStubResult;
  #findBySourceStableKeyCall: FindBySourceStableKeyCall | null = null;
  #countByVersionCall: CountByVersionCall | null = null;
  #listByVersionCall: ListByVersionCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySourceStableKeyResult: FindBySourceStableKeyStubResult,
    countByVersionResult: CountByVersionStubResult,
    listByVersionResult: ListByVersionStubResult = {
      kind: 'page',
      page: DEFAULT_EMPTY_LIST_BY_VERSION_PAGE,
    },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySourceStableKeyResult = findBySourceStableKeyResult;
    this.#countByVersionResult = countByVersionResult;
    this.#listByVersionResult = listByVersionResult;
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

  // -- listByVersion factories -----------------------------------------------

  static returningListByVersionPage(page: Page<KnowledgeItem>): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
      { kind: 'page', page: copyFrozenKnowledgeItemPage(page) },
    );
  }

  static returningEmptyListByVersionPage(
    pagination: PaginationRequest,
  ): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
      {
        kind: 'page',
        page: Object.freeze({
          items: Object.freeze([]),
          offset: pagination.offset,
          limit: pagination.limit,
          hasMore: false,
          totalCount: 0,
        }),
      },
    );
  }

  static returningListByVersionError(
    error: PersistenceOperationFailedError,
  ): StubKnowledgeItemRepository {
    return new StubKnowledgeItemRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'count', count: 0 },
      { kind: 'error', error },
    );
  }

  // -- listByVersion ---------------------------------------------------------

  get listByVersionCall(): ListByVersionCall | null {
    return this.#listByVersionCall;
  }

  async listByVersion(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
    filter: KnowledgeItemListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<KnowledgeItem>, PersistenceOperationFailedError>> {
    this.#listByVersionCall = Object.freeze({ workspaceId, playbookVersionId, filter, pagination });

    switch (this.#listByVersionResult.kind) {
      case 'page': {
        return ok(this.#listByVersionResult.page);
      }
      case 'error': {
        return err(this.#listByVersionResult.error);
      }
    }
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
  readonly type: KnowledgeType;
  readonly parentKnowledgeItemId: string | null;
  readonly title: string;
  readonly displayOrder: number;
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

  const titleRaw = options?.title ?? 'Test Knowledge Item';
  const titleResult = KnowledgeTitle.create(titleRaw);
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

  const displayOrderRaw = options?.displayOrder ?? 0;
  const displayOrderResult = DisplayOrder.create(displayOrderRaw);
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

  const type = options?.type ?? 'section';
  const attributes = createKnowledgeItemAttributes(type);

  let parentParsed: KnowledgeItemId | null = null;
  const parentRaw = options?.parentKnowledgeItemId;
  if (parentRaw !== undefined && parentRaw !== null) {
    const parentResult = parseKnowledgeItemId(parentRaw);
    if (!parentResult.success) {
      throw new Error('Expected a valid parent knowledge item ID fixture.');
    }
    parentParsed = parentResult.value;
  }

  const result = KnowledgeItem.create({
    knowledgeItemId: knowledgeItemIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    playbookVersionId: playbookVersionIdResult.value,
    type,
    sourceStableKey: sourceStableKeyResult.value,
    title: titleResult.value,
    slug: slugResult.value,
    content: normalizedContent,
    attributes,
    sourceReference: sourceReferenceResult.value,
    parentKnowledgeItemId: parentParsed,
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

  // -------------------------------------------------------------------------
  // listByVersion tests
  // -------------------------------------------------------------------------

  describe('listByVersion — complete list with deterministic order', () => {
    it('returns items ordered by displayOrder ascending with id tiebreak', async () => {
      const pvId = '00000000-0000-0000-0000-000000000004';

      const first = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: pvId,
        displayOrder: 0,
      });
      const second = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: pvId,
        displayOrder: 1,
      });
      const third = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000003',
        playbookVersionId: pvId,
        displayOrder: 1,
      });

      expect(first.workspaceId).toBe(second.workspaceId);
      expect(second.workspaceId).toBe(third.workspaceId);
      expect(first.playbookVersionId).toBe(second.playbookVersionId);
      expect(second.playbookVersionId).toBe(third.playbookVersionId);
      expect(first.id).not.toBe(second.id);
      expect(second.id).not.toBe(third.id);
      expect(first.displayOrder.value).toBe(0);
      expect(second.displayOrder.value).toBe(1);
      expect(third.displayOrder.value).toBe(1);
      expect(second.id.toString().localeCompare(third.id.toString())).toBeLessThan(0);

      const filter: KnowledgeItemListFilter = Object.freeze({});
      const configuredPage: Page<KnowledgeItem> = {
        items: [first, second, third],
        offset: 0,
        limit: 3,
        hasMore: false,
        totalCount: 3,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId(pvId);
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 3 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(3);
      expect(result.value.items[0]).toBe(first);
      expect(result.value.items[1]).toBe(second);
      expect(result.value.items[2]).toBe(third);

      for (const item of result.value.items) {
        expect(item.workspaceId).toBe(workspaceId.value);
        expect(item.playbookVersionId).toBe(playbookVersionId.value);
      }

      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(3);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(3);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — filter by type', () => {
    it('returns a page filtered by a specific type', async () => {
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        type: 'workflow',
      });
      expect(item.type).toBe('workflow');

      const filter: KnowledgeItemListFilter = Object.freeze({ type: 'workflow' });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(item);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — filter by parent', () => {
    it('returns items that have the given parentKnowledgeItemId', async () => {
      const parent = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });
      const child = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        parentKnowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 1,
      });

      expect(child.parentKnowledgeItemId).toBe(parent.id);

      const filter: KnowledgeItemListFilter = Object.freeze({
        parentKnowledgeItemId: parent.id,
      });
      const configuredPage: Page<KnowledgeItem> = {
        items: [child],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(child);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — filter root items', () => {
    it('returns only root items when parentKnowledgeItemId is null', async () => {
      const rootItem = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        parentKnowledgeItemId: null,
        displayOrder: 0,
      });
      const childItem = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        parentKnowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 1,
      });

      expect(rootItem.parentKnowledgeItemId).toBeNull();
      expect(childItem.parentKnowledgeItemId).not.toBeNull();

      const filter: KnowledgeItemListFilter = Object.freeze({ parentKnowledgeItemId: null });
      expect('parentKnowledgeItemId' in filter).toBe(true);

      const configuredPage: Page<KnowledgeItem> = {
        items: [rootItem],
        offset: 0,
        limit: 2,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 2 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(rootItem);
      expect(result.value.items).not.toContain(childItem);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — filter by title', () => {
    it('returns items that have the given title', async () => {
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        title: 'Prompt Review Workflow',
      });
      const title = item.title;

      expect(item.title).toBe(title);
      expect(item.title.equals(title)).toBe(true);

      const filter: KnowledgeItemListFilter = Object.freeze({ title });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(item);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByVersion — filter by sourceStableKey', () => {
    it('returns items that have the given sourceStableKey', async () => {
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        sourceStableKey: 'notion:block:workflow-review',
      });
      const sourceStableKey = item.sourceStableKey;

      expect(item.sourceStableKey).toBe(sourceStableKey);
      expect(item.sourceStableKey.equals(sourceStableKey)).toBe(true);

      const filter: KnowledgeItemListFilter = Object.freeze({ sourceStableKey });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(item);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByVersion — combined filter', () => {
    it('returns a page when all filter fields match semantically', async () => {
      const parent = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        type: 'workflow',
        parentKnowledgeItemId: '00000000-0000-0000-0000-000000000001',
        title: 'Prompt Review Workflow',
        sourceStableKey: 'notion:block:workflow-review',
        displayOrder: 1,
      });

      expect(item.type).toBe('workflow');
      expect(item.parentKnowledgeItemId).toBe(parent.id);
      expect(item.title.equals(item.title)).toBe(true);
      expect(item.sourceStableKey.equals(item.sourceStableKey)).toBe(true);

      const filter: KnowledgeItemListFilter = Object.freeze({
        type: item.type,
        parentKnowledgeItemId: item.parentKnowledgeItemId,
        title: item.title,
        sourceStableKey: item.sourceStableKey,
      });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(item);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — empty page', () => {
    it('returns a frozen empty page when there are no items', async () => {
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const filter: KnowledgeItemListFilter = Object.freeze({});
      const repository = StubKnowledgeItemRepository.returningEmptyListByVersionPage(pagination);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        pagination,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 60,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        Object.freeze({}),
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(item);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(60);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — preserves absent totalCount', () => {
    it('does not have totalCount when the configured page lacks it', async () => {
      const item = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });
      const configuredPage: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(item);
      expect('totalCount' in result.value).toBe(false);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const itemA = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });
      const itemB = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000002',
        displayOrder: 1,
      });

      const configuredItems: KnowledgeItem[] = [itemA];
      const configuredPage: Page<KnowledgeItem> = {
        items: configuredItems,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(configuredPage);
      configuredItems.push(itemB);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(itemA);
      expect(result.value.items).not.toContain(itemB);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — version does not exist', () => {
    it('returns a frozen empty page when the version does not exist', async () => {
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository = StubKnowledgeItemRepository.returningEmptyListByVersionPage(pagination);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        nonExistentVersionId.value,
        Object.freeze({}),
        pagination,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — wrong workspace', () => {
    it('returns a frozen empty page when the item belongs to a different workspace', async () => {
      const workspaceAResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceAResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceBResult = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceBResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      expect(workspaceAResult.value).not.toBe(workspaceBResult.value);

      const itemInWorkspaceA = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        displayOrder: 0,
      });

      expect(itemInWorkspaceA.workspaceId).toBe(workspaceAResult.value);
      expect(itemInWorkspaceA.workspaceId).not.toBe(workspaceBResult.value);

      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository = StubKnowledgeItemRepository.returningEmptyListByVersionPage(pagination);
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceBResult.value,
        playbookVersionId.value,
        Object.freeze({}),
        pagination,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — another version has items', () => {
    it('returns a frozen empty page when only another version has items', async () => {
      const queriedVersionResult = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!queriedVersionResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const otherVersionResult = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000c');
      if (!otherVersionResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const otherItem = createValidKnowledgeItem({
        knowledgeItemId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000c',
        displayOrder: 0,
      });

      expect(queriedVersionResult.value).not.toBe(otherVersionResult.value);
      expect(otherItem.playbookVersionId).toBe(otherVersionResult.value);
      expect(otherItem.playbookVersionId).not.toBe(queriedVersionResult.value);

      const repository = StubKnowledgeItemRepository.returningEmptyListByVersionPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        queriedVersionResult.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — independent from findById', () => {
    it('does not affect findById when listByVersion is configured', async () => {
      const item = createValidKnowledgeItem();
      const page: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const itemId = parseKnowledgeItemId('00000000-0000-0000-0000-000000000001');
      if (!itemId.success) {
        throw new Error('Expected a valid knowledge item ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, itemId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByVersion — independent from findBySourceStableKey', () => {
    it('does not affect findBySourceStableKey when listByVersion is configured', async () => {
      const item = createValidKnowledgeItem();
      const page: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const ssk = SourceStableKey.create('src-stable-key-001');
      if (!ssk.success) {
        throw new Error('Expected a valid source stable key fixture.');
      }

      const result = await repository.findBySourceStableKey(
        workspaceId.value,
        playbookVersionId.value,
        ssk.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByVersion — independent from countByVersion', () => {
    it('does not affect countByVersion when listByVersion is configured', async () => {
      const item = createValidKnowledgeItem();
      const page: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(page);
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

  describe('listByVersion — existing operation does not affect list', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const item = createValidKnowledgeItem();
      const repository = StubKnowledgeItemRepository.returningKnowledgeItem(item);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByVersion — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('knowledgeItem.listByVersion');
      const repository = StubKnowledgeItemRepository.returningListByVersionError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('knowledgeItem.listByVersion');
    });
  });

  describe('listByVersion — argument capture', () => {
    it('captures the workspaceId, playbookVersionId, filter, and pagination', async () => {
      const item = createValidKnowledgeItem();
      const page: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000004');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }
      const filter: KnowledgeItemListFilter = Object.freeze({ type: 'section' });
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });

      await repository.listByVersion(
        workspaceId.value,
        playbookVersionId.value,
        filter,
        pagination,
      );

      const call = repository.listByVersionCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookVersionId).toBe(playbookVersionId.value);
      expect(call.filter).toBe(filter);
      expect(call.pagination).toBe(pagination);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listByVersion — accepts typed arguments', () => {
    it('compiles with WorkspaceId, PlaybookVersionId, KnowledgeItemListFilter, and PaginationRequest', () => {
      const item = createValidKnowledgeItem();
      const page: Page<KnowledgeItem> = {
        items: [item],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubKnowledgeItemRepository.returningListByVersionPage(page);

      const _acceptsTypedArguments: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
        filter: KnowledgeItemListFilter,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<KnowledgeItem>, PersistenceOperationFailedError>> = (
        wsId,
        versionId,
        itemFilter,
        pageRequest,
      ) => repository.listByVersion(wsId, versionId, itemFilter, pageRequest);

      void _acceptsTypedArguments;
    });
  });
});
