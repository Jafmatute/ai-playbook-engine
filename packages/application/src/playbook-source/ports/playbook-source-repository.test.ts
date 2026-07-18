import { describe, expect, it } from 'vitest';

import type {
  PlaybookId,
  PlaybookSourceId,
  PlaybookSourceStatus,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseWorkspaceId,
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookSourceRepository } from './playbook-source-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'playbookSource'; readonly playbookSource: PlaybookSource }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindEnabledByPlaybookIdStubResult =
  | { readonly kind: 'playbookSource'; readonly playbookSource: PlaybookSource }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByPlaybookIdStubResult =
  | { readonly kind: 'page'; readonly page: Page<PlaybookSource> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByPlaybookIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
  pagination: PaginationRequest;
}>;

function copyFrozenPlaybookSourcePage(page: Page<PlaybookSource>): Page<PlaybookSource> {
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

const DEFAULT_EMPTY_PLAYBOOK_SOURCE_PAGE: Page<PlaybookSource> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

class StubPlaybookSourceRepository implements PlaybookSourceRepository {
  async insert(_source: PlaybookSource): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findEnabledByPlaybookIdResult: FindEnabledByPlaybookIdStubResult;
  readonly #listByPlaybookIdResult: ListByPlaybookIdStubResult;
  #listByPlaybookIdCall: ListByPlaybookIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findEnabledByPlaybookIdResult: FindEnabledByPlaybookIdStubResult = { kind: 'null' },
    listByPlaybookIdResult: ListByPlaybookIdStubResult = {
      kind: 'page',
      page: DEFAULT_EMPTY_PLAYBOOK_SOURCE_PAGE,
    },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findEnabledByPlaybookIdResult = findEnabledByPlaybookIdResult;
    this.#listByPlaybookIdResult = listByPlaybookIdResult;
  }

  static returningPlaybookSource(playbookSource: PlaybookSource): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'playbookSource', playbookSource });
  }

  static returningNull(): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'error', error });
  }

  static returningEnabledPlaybookSource(
    playbookSource: PlaybookSource,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository(
      { kind: 'null' },
      { kind: 'playbookSource', playbookSource },
    );
  }

  static returningNoEnabledPlaybookSource(): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindEnabledError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' }, { kind: 'error', error });
  }

  static returningPlaybookSourcePage(page: Page<PlaybookSource>): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: copyFrozenPlaybookSourcePage(page) },
    );
  }

  static returningEmptyPlaybookSourcePage(
    pagination: PaginationRequest,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository(
      { kind: 'null' },
      { kind: 'null' },
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

  static returningListByPlaybookIdError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  get listByPlaybookIdCall(): ListByPlaybookIdCall | null {
    return this.#listByPlaybookIdCall;
  }

  async findById(
    _workspaceId: WorkspaceId,
    _playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbookSource': {
        return ok(this.#findByIdResult.playbookSource);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  async findEnabledByPlaybookId(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    switch (this.#findEnabledByPlaybookIdResult.kind) {
      case 'playbookSource': {
        return ok(this.#findEnabledByPlaybookIdResult.playbookSource);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findEnabledByPlaybookIdResult.error);
      }
    }
  }

  async listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>> {
    this.#listByPlaybookIdCall = Object.freeze({ workspaceId, playbookId, pagination });

    switch (this.#listByPlaybookIdResult.kind) {
      case 'page': {
        return ok(this.#listByPlaybookIdResult.page);
      }
      case 'error': {
        return err(this.#listByPlaybookIdResult.error);
      }
    }
  }
}

interface PlaybookSourceFixtureOptions {
  readonly playbookSourceId: string;
  readonly workspaceId: string;
  readonly playbookId: string;
  readonly externalRootReference: string;
  readonly configurationReference: string;
  readonly createdAt: string;
  readonly status: PlaybookSourceStatus;
}

function createValidPlaybookSource(
  options?: Partial<PlaybookSourceFixtureOptions>,
): PlaybookSource {
  const playbookSourceIdRaw = options?.playbookSourceId ?? '00000000-0000-0000-0000-000000000001';
  const playbookSourceIdResult = parsePlaybookSourceId(playbookSourceIdRaw);
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const workspaceIdRaw = options?.workspaceId ?? '00000000-0000-0000-0000-000000000002';
  const workspaceIdResult = parseWorkspaceId(workspaceIdRaw);
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdRaw = options?.playbookId ?? '00000000-0000-0000-0000-000000000003';
  const playbookIdResult = parsePlaybookId(playbookIdRaw);
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const externalRootRefResult = PlaybookSourceExternalRootReference.create(
    options?.externalRootReference ?? 'https://example.com/root',
  );
  if (!externalRootRefResult.success) {
    throw new Error('Expected a valid external root reference fixture.');
  }

  const configRefResult = PlaybookSourceConfigurationReference.create(
    options?.configurationReference ?? 'config-ref-001',
  );
  if (!configRefResult.success) {
    throw new Error('Expected a valid configuration reference fixture.');
  }

  const createdAtResult = Instant.parse(options?.createdAt ?? '2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const source = PlaybookSource.create({
    playbookSourceId: playbookSourceIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    type: 'notion',
    externalRootReference: externalRootRefResult.value,
    configurationReference: configRefResult.value,
    createdAt: createdAtResult.value,
  });

  const status = options?.status ?? 'enabled';

  if (status === 'disabled') {
    const disableResult = source.disable();
    if (!disableResult.success) {
      throw new Error('Expected the disable transition to succeed.');
    }
  }

  return source;
}

function createDisabledPlaybookSource(): PlaybookSource {
  return createValidPlaybookSource({ status: 'disabled' });
}

describe('PlaybookSourceRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the PlaybookSource instance', async () => {
      const playbookSource = createValidPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningPlaybookSource(playbookSource);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSource.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookSource);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSourceId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the source belongs to a different workspace', async () => {
      const repository = StubPlaybookSourceRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookSourceId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookSource.findById');
      const repository = StubPlaybookSourceRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSourceId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookSource.findById');
    });
  });

  describe('findEnabledByPlaybookId — enabled source found', () => {
    it('returns a successful Result with the enabled PlaybookSource instance', async () => {
      const playbookSource = createValidPlaybookSource();
      const repository =
        StubPlaybookSourceRepository.returningEnabledPlaybookSource(playbookSource);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookSource);
      if (result.value === null) {
        throw new Error('Expected result.value to be a PlaybookSource.');
      }

      expect(result.value.status).toBe('enabled');
    });
  });

  describe('findEnabledByPlaybookId — no enabled sources', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — only disabled source', () => {
    it('returns a successful Result with null when only a disabled source exists', async () => {
      const disabledSource = createDisabledPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
      void disabledSource;
    });
  });

  describe('findEnabledByPlaybookId — playbook does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000005');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookSource.findEnabledByPlaybookId');
      const repository = StubPlaybookSourceRepository.returningFindEnabledError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookSource.findEnabledByPlaybookId');
    });
  });

  describe('findEnabledByPlaybookId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbookSource = createValidPlaybookSource();
      const repository =
        StubPlaybookSourceRepository.returningEnabledPlaybookSource(playbookSource);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> = (wsId, pbId) =>
        repository.findEnabledByPlaybookId(wsId, pbId);

      void _acceptsTypedIds;
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookSourceId parameter types', () => {
      const playbookSource = createValidPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningPlaybookSource(playbookSource);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
      ) => Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> = (wsId, psId) =>
        repository.findById(wsId, psId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // listByPlaybookId tests
  // -------------------------------------------------------------------------

  describe('listByPlaybookId — enabled and disabled sources', () => {
    it('returns a page with both the enabled and a historical disabled source', async () => {
      const enabledSource = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        externalRootReference: 'https://example.com/root-a',
        configurationReference: 'config-ref-a',
        createdAt: '2026-07-15T10:00:00.000Z',
        status: 'enabled',
      });
      const disabledSource = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000002',
        externalRootReference: 'https://example.com/root-b',
        configurationReference: 'config-ref-b',
        createdAt: '2026-07-15T11:00:00.000Z',
        status: 'disabled',
      });

      expect(enabledSource.workspaceId).toBe(disabledSource.workspaceId);
      expect(enabledSource.playbookId).toBe(disabledSource.playbookId);
      expect(enabledSource.id).not.toBe(disabledSource.id);
      expect(enabledSource.status).toBe('enabled');
      expect(disabledSource.status).toBe('disabled');
      expect(enabledSource.externalRootReference.equals(disabledSource.externalRootReference)).toBe(
        false,
      );
      expect(
        enabledSource.configurationReference.equals(disabledSource.configurationReference),
      ).toBe(false);
      expect(disabledSource.createdAt.compare(enabledSource.createdAt)).toBeGreaterThan(0);

      const configuredPage: Page<PlaybookSource> = {
        items: [enabledSource, disabledSource],
        offset: 0,
        limit: 2,
        hasMore: false,
        totalCount: 2,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 2 });

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
        pagination,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(2);
      expect(result.value.items[0]).toBe(enabledSource);
      expect(result.value.items[1]).toBe(disabledSource);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(2);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(2);

      for (const source of result.value.items) {
        expect(source.workspaceId).toBe(workspaceId.value);
        expect(source.playbookId).toBe(playbookId.value);
      }

      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — empty page', () => {
    it('returns a frozen empty page when there are no sources', async () => {
      const repository = StubPlaybookSourceRepository.returningEmptyPlaybookSourcePage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
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

  describe('listByPlaybookId — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const source = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-07-15T10:00:00.000Z',
      });

      const configuredPage: Page<PlaybookSource> = {
        items: [source],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 60,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(source);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(60);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const enabledSource = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-07-15T10:00:00.000Z',
        status: 'enabled',
      });
      const disabledSource = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000002',
        createdAt: '2026-07-15T11:00:00.000Z',
        status: 'disabled',
      });

      const configuredItems: PlaybookSource[] = [enabledSource];
      const configuredPage: Page<PlaybookSource> = {
        items: configuredItems,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(configuredPage);
      configuredItems.push(disabledSource);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(enabledSource);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — playbook does not exist', () => {
    it('returns a frozen empty page when the playbook does not exist', async () => {
      const repository = StubPlaybookSourceRepository.returningEmptyPlaybookSourcePage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000000f');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        nonExistentPlaybookId.value,
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

  describe('listByPlaybookId — wrong workspace', () => {
    it('returns a frozen empty page when queried from a different workspace', async () => {
      const repository = StubPlaybookSourceRepository.returningEmptyPlaybookSourcePage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceB.value,
        playbookId.value,
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

  describe('listByPlaybookId — another playbook has sources', () => {
    it('returns a frozen empty page when only another playbook has sources', async () => {
      const queriedPlaybookIdResult = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!queriedPlaybookIdResult.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const otherPlaybookIdResult = parsePlaybookId('00000000-0000-0000-0000-00000000000c');
      if (!otherPlaybookIdResult.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const otherPlaybookSource = createValidPlaybookSource({
        playbookId: '00000000-0000-0000-0000-00000000000c',
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        status: 'enabled',
      });

      expect(queriedPlaybookIdResult.value).not.toBe(otherPlaybookIdResult.value);
      expect(otherPlaybookSource.playbookId).toBe(otherPlaybookIdResult.value);
      expect(otherPlaybookSource.playbookId).not.toBe(queriedPlaybookIdResult.value);

      const repository = StubPlaybookSourceRepository.returningEmptyPlaybookSourcePage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        queriedPlaybookIdResult.value,
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

  describe('listByPlaybookId — independent from findById', () => {
    it('does not affect findById when listByPlaybookId is configured with sources', async () => {
      const source = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        status: 'enabled',
      });
      const page: Page<PlaybookSource> = {
        items: [source],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(page);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSourceId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookId — independent from findEnabledByPlaybookId', () => {
    it('does not affect findEnabledByPlaybookId when listByPlaybookId is configured with sources', async () => {
      const source = createValidPlaybookSource({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        status: 'enabled',
      });
      const page: Page<PlaybookSource> = {
        items: [source],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(page);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookId — existing operation does not affect list', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const source = createValidPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningPlaybookSource(source);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
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

  describe('listByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookSource.listByPlaybookId');
      const repository = StubPlaybookSourceRepository.returningListByPlaybookIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookSource.listByPlaybookId');
    });
  });

  describe('listByPlaybookId — argument capture', () => {
    it('captures the workspaceId, playbookId, and pagination from the last call', async () => {
      const source = createValidPlaybookSource();
      const page: Page<PlaybookSource> = {
        items: [source],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });

      await repository.listByPlaybookId(workspaceId.value, playbookId.value, pagination);

      const call = repository.listByPlaybookIdCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookId).toBe(playbookId.value);
      expect(call.pagination).toBe(pagination);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listByPlaybookId — accepts typed arguments', () => {
    it('compiles with WorkspaceId, PlaybookId, and PaginationRequest parameter types', () => {
      const source = createValidPlaybookSource();
      const page: Page<PlaybookSource> = {
        items: [source],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookSourceRepository.returningPlaybookSourcePage(page);

      const _acceptsTypedArguments: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
        pageRequest,
      ) => repository.listByPlaybookId(wsId, pbId, pageRequest);

      void _acceptsTypedArguments;
    });
  });
});
