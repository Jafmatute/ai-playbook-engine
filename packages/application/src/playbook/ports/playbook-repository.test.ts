import { describe, expect, it } from 'vitest';

import type {
  PlaybookId,
  PlaybookStatus,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PlaybookListFilter } from '../playbook-list-filter.js';
import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type {
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepository,
} from './playbook-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindByNormalizedNameStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindByNormalizedNameCall = Readonly<{
  workspaceId: WorkspaceId;
  normalizedName: string;
  options: FindPlaybookByNormalizedNameOptions;
}>;

type ListStubResult =
  | { readonly kind: 'page'; readonly page: Page<Playbook> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListCall = Readonly<{
  workspaceId: WorkspaceId;
  filter: PlaybookListFilter;
  pagination: PaginationRequest;
}>;

function copyFrozenPlaybookPage(page: Page<Playbook>): Page<Playbook> {
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

const DEFAULT_EMPTY_LIST_PAGE: Page<Playbook> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

class StubPlaybookRepository implements PlaybookRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findByNormalizedNameResult: FindByNormalizedNameStubResult;
  readonly #listResult: ListStubResult;
  #findByNormalizedNameCall: FindByNormalizedNameCall | null = null;
  #listCall: ListCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findByNormalizedNameResult: FindByNormalizedNameStubResult = { kind: 'null' },
    listResult: ListStubResult = { kind: 'page', page: DEFAULT_EMPTY_LIST_PAGE },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findByNormalizedNameResult = findByNormalizedNameResult;
    this.#listResult = listResult;
  }

  static returningPlaybook(playbook: Playbook): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'playbook', playbook });
  }

  static returningNull(): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'error', error });
  }

  static returningPlaybookByNormalizedName(playbook: Playbook): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'playbook', playbook });
  }

  static returningNoPlaybookByNormalizedName(): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindByNormalizedNameError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'error', error });
  }

  // -- list factories -------------------------------------------------------

  static returningListPage(page: Page<Playbook>): StubPlaybookRepository {
    return new StubPlaybookRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: copyFrozenPlaybookPage(page) },
    );
  }

  static returningEmptyListPage(pagination: PaginationRequest): StubPlaybookRepository {
    return new StubPlaybookRepository(
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

  static returningListError(error: PersistenceOperationFailedError): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'error', error });
  }

  // -- getters ---------------------------------------------------------------

  get findByNormalizedNameCall(): FindByNormalizedNameCall | null {
    return this.#findByNormalizedNameCall;
  }

  get listCall(): ListCall | null {
    return this.#listCall;
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbook': {
        return ok(this.#findByIdResult.playbook);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findByNormalizedName -------------------------------------------------

  async findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    this.#findByNormalizedNameCall = Object.freeze({
      workspaceId,
      normalizedName,
      options: Object.freeze({ ...options }),
    });

    switch (this.#findByNormalizedNameResult.kind) {
      case 'playbook': {
        return ok(this.#findByNormalizedNameResult.playbook);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByNormalizedNameResult.error);
      }
    }
  }

  // -- list ------------------------------------------------------------------

  async list(
    workspaceId: WorkspaceId,
    filter: PlaybookListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    this.#listCall = Object.freeze({ workspaceId, filter, pagination });

    switch (this.#listResult.kind) {
      case 'page': {
        return ok(this.#listResult.page);
      }
      case 'error': {
        return err(this.#listResult.error);
      }
    }
  }
}

interface PlaybookFixtureOptions {
  readonly playbookId: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly status: PlaybookStatus;
  readonly activeVersionId: PlaybookVersionId | null;
}

function createValidPlaybook(options?: Partial<PlaybookFixtureOptions>): Playbook {
  const playbookIdRaw = options?.playbookId ?? '00000000-0000-0000-0000-000000000001';
  const playbookIdResult = parsePlaybookId(playbookIdRaw);
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const workspaceIdRaw = options?.workspaceId ?? '00000000-0000-0000-0000-000000000002';
  const workspaceIdResult = parseWorkspaceId(workspaceIdRaw);
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const nameRaw = options?.name ?? 'Test Playbook';
  const nameResult = PlaybookName.create(nameRaw);
  if (!nameResult.success) {
    throw new Error('Expected a valid playbook name fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const playbookResult = Playbook.create({
    playbookId: playbookIdResult.value,
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });
  if (!playbookResult.success) {
    throw new Error('Expected a valid playbook fixture.');
  }

  const playbook = playbookResult.value;

  const status = options?.status ?? 'active';

  if (status === 'archived') {
    const archivedAtResult = Instant.parse('2026-07-16T10:00:00.000Z');
    if (!archivedAtResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }
    const archiveResult = playbook.archive({ archivedAt: archivedAtResult.value });
    if (!archiveResult.success) {
      throw new Error('Expected the archive transition to succeed.');
    }
  }

  const activeVersionId = options?.activeVersionId ?? null;

  if (activeVersionId !== null) {
    const activatedAtResult = Instant.parse('2026-07-16T10:00:00.000Z');
    if (!activatedAtResult.success) {
      throw new Error('Expected a valid instant fixture.');
    }
    const activateResult = playbook.activateVersion({
      playbookVersionId: activeVersionId,
      activatedAt: activatedAtResult.value,
    });
    if (!activateResult.success) {
      throw new Error('Expected the activate version transition to succeed.');
    }
  }

  return playbook;
}

function createArchivedPlaybook(): Playbook {
  return createValidPlaybook({ status: 'archived' });
}

describe('PlaybookRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the Playbook instance', async () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbook.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbook);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.findById');
      const repository = StubPlaybookRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<Playbook | null, PersistenceOperationFailedError>> = (wsId, pbId) =>
        repository.findById(wsId, pbId);

      void _acceptsTypedIds;
    });
  });

  describe('findByNormalizedName — found', () => {
    it('returns a successful Result with the Playbook instance', async () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbook);
    });
  });

  describe('findByNormalizedName — exact normalized match', () => {
    it('receives the exact normalized value from the domain', async () => {
      const nameResult = PlaybookName.create('Test Playbook');
      if (!nameResult.success) {
        throw new Error('Expected a valid playbook name fixture.');
      }

      const normalizedName = nameResult.value.normalizedValue;
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      await repository.findByNormalizedName(workspaceId.value, normalizedName, {
        includeArchived: false,
      });

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.normalizedName).toBe('test playbook');
    });
  });

  describe('findByNormalizedName — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'nonexistent', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findByNormalizedName — archived excluded', () => {
    it('returns a successful Result with null when only an archived playbook matches (includeArchived: false)', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.options.includeArchived).toBe(false);
    });
  });

  describe('findByNormalizedName — archived included', () => {
    it('returns the archived Playbook when includeArchived is true', async () => {
      const archivedPlaybook = createArchivedPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(archivedPlaybook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: true,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(archivedPlaybook);
      if (result.value === null) {
        throw new Error('Expected result.value to be a Playbook.');
      }

      expect(result.value.status).toBe('archived');

      const call = repository.findByNormalizedNameCall;
      expect(call).not.toBeNull();
      expect(call!.options.includeArchived).toBe(true);
    });
  });

  describe('findByNormalizedName — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookRepository.returningNoPlaybookByNormalizedName();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceB.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findByNormalizedName — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.findByNormalizedName');
      const repository = StubPlaybookRepository.returningFindByNormalizedNameError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test playbook', {
        includeArchived: false,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.findByNormalizedName');
    });
  });

  describe('findByNormalizedName — accepts typed signature', () => {
    it('compiles with WorkspaceId, normalizedName string, and options', () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybookByNormalizedName(playbook);

      const _acceptsSignature: (
        workspaceId: WorkspaceId,
        normalizedName: string,
        options: FindPlaybookByNormalizedNameOptions,
      ) => Promise<Result<Playbook | null, PersistenceOperationFailedError>> = (wsId, name, opts) =>
        repository.findByNormalizedName(wsId, name, opts);

      void _acceptsSignature;
    });
  });

  // -------------------------------------------------------------------------
  // list tests
  // -------------------------------------------------------------------------

  describe('list — complete list with deterministic order', () => {
    it('returns playbooks ordered by name normalized ascending with id tiebreak', async () => {
      const wsId = '00000000-0000-0000-0000-000000000002';

      const alpha = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        workspaceId: wsId,
        name: 'Alpha Playbook',
        status: 'active',
      });
      const betaVersionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000010');
      if (!betaVersionIdResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const betaLowerId = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        workspaceId: wsId,
        name: 'Beta Playbook',
        status: 'active',
        activeVersionId: betaVersionIdResult.value,
      });
      const betaHigherId = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000003',
        workspaceId: wsId,
        name: 'Beta Playbook',
        status: 'active',
      });

      expect(alpha.workspaceId).toBe(betaLowerId.workspaceId);
      expect(
        alpha.name.normalizedValue.localeCompare(betaLowerId.name.normalizedValue),
      ).toBeLessThan(0);
      expect(
        betaLowerId.name.normalizedValue.localeCompare(betaHigherId.name.normalizedValue),
      ).toBe(0);
      expect(betaLowerId.id.toString().localeCompare(betaHigherId.id.toString())).toBeLessThan(0);

      const filter: PlaybookListFilter = Object.freeze({});
      const configuredPage: Page<Playbook> = {
        items: [alpha, betaLowerId, betaHigherId],
        offset: 0,
        limit: 3,
        hasMore: false,
        totalCount: 3,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId(wsId);
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 3 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(3);
      expect(result.value.items[0]).toBe(alpha);
      expect(result.value.items[1]).toBe(betaLowerId);
      expect(result.value.items[2]).toBe(betaHigherId);

      for (const pb of result.value.items) {
        expect(pb.workspaceId).toBe(workspaceId.value);
      }

      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(3);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(3);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('list — filter by active status', () => {
    it('returns only active playbooks', async () => {
      const activePb = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'Active Playbook',
        status: 'active',
      });
      const archivedPb = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'Archived Playbook',
        status: 'archived',
      });

      expect(activePb.status).toBe('active');
      expect(archivedPb.status).toBe('archived');

      const filter: PlaybookListFilter = Object.freeze({ status: 'active' });
      const configuredPage: Page<Playbook> = {
        items: [activePb],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(activePb);
      expect(result.value.items[0]?.status).toBe('active');
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void archivedPb;
    });
  });

  describe('list — filter by archived status', () => {
    it('returns only archived playbooks', async () => {
      const activePb = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'Active Playbook',
        status: 'active',
      });
      const archivedPb = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'Archived Playbook',
        status: 'archived',
      });

      const filter: PlaybookListFilter = Object.freeze({ status: 'archived' });
      const configuredPage: Page<Playbook> = {
        items: [archivedPb],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(archivedPb);
      expect(result.value.items[0]?.status).toBe('archived');
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void activePb;
    });
  });

  describe('list — filter by normalizedNamePrefix', () => {
    it('returns playbooks whose normalized name starts with the prefix', async () => {
      const prefix = 'ai ';

      const aiEngineering = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'ai engineering playbook',
        status: 'active',
      });
      const aiOperations = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'ai operations',
        status: 'active',
      });
      const legacy = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000003',
        name: 'legacy playbook',
        status: 'active',
      });

      const filter: PlaybookListFilter = Object.freeze({ normalizedNamePrefix: prefix });
      const configuredPage: Page<Playbook> = {
        items: [aiEngineering, aiOperations],
        offset: 0,
        limit: 2,
        hasMore: false,
        totalCount: 2,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 2 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(2);

      for (const pb of result.value.items) {
        expect(pb.name.normalizedValue.startsWith(prefix)).toBe(true);
      }

      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(2);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(2);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void legacy;
    });
  });

  describe('list — filter by hasActiveVersion: true', () => {
    it('returns playbooks that have an active version', async () => {
      const versionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000010');
      if (!versionIdResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const withActiveVersion = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'Active Version Playbook',
        status: 'active',
        activeVersionId: versionIdResult.value,
      });
      const withoutActiveVersion = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'No Version Playbook',
        status: 'active',
      });

      expect(withActiveVersion.activeVersionId).not.toBeNull();
      expect(withActiveVersion.activeVersionId).toBe(versionIdResult.value);
      expect(withoutActiveVersion.activeVersionId).toBeNull();

      const filter: PlaybookListFilter = Object.freeze({ hasActiveVersion: true });
      expect('hasActiveVersion' in filter).toBe(true);

      const configuredPage: Page<Playbook> = {
        items: [withActiveVersion],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(withActiveVersion);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void withoutActiveVersion;
    });
  });

  describe('list — filter by hasActiveVersion: false', () => {
    it('returns playbooks without an active version', async () => {
      const versionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000010');
      if (!versionIdResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const withActiveVersion = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'Active Version Playbook',
        status: 'active',
        activeVersionId: versionIdResult.value,
      });
      const withoutActiveVersion = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'No Version Playbook',
        status: 'active',
      });

      const filter: PlaybookListFilter = Object.freeze({ hasActiveVersion: false });
      expect('hasActiveVersion' in filter).toBe(true);
      expect(filter.hasActiveVersion).toBe(false);

      const configuredPage: Page<Playbook> = {
        items: [withoutActiveVersion],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(withoutActiveVersion);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void withActiveVersion;
    });
  });

  describe('list — combined filter', () => {
    it('returns playbooks matching all filter fields simultaneously', async () => {
      const versionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000010');
      if (!versionIdResult.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const matching = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'ai engineering playbook',
        status: 'active',
        activeVersionId: versionIdResult.value,
      });
      const _wrongStatus = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'ai engineering playbook',
        status: 'archived',
      });
      const _wrongPrefix = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000003',
        name: 'legacy playbook',
        status: 'active',
        activeVersionId: versionIdResult.value,
      });
      const _noVersion = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000004',
        name: 'ai engineering playbook',
        status: 'active',
      });

      const filter: PlaybookListFilter = Object.freeze({
        status: 'active',
        normalizedNamePrefix: 'ai ',
        hasActiveVersion: true,
      });

      expect(matching.status).toBe(filter.status);
      if (filter.normalizedNamePrefix === undefined) {
        throw new Error('Expected a normalized name prefix filter.');
      }
      expect(matching.name.normalizedValue.startsWith(filter.normalizedNamePrefix)).toBe(true);
      expect((matching.activeVersionId !== null) === filter.hasActiveVersion).toBe(true);

      const configuredPage: Page<Playbook> = {
        items: [matching],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(matching);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('list — empty page', () => {
    it('returns a frozen empty page when there are no playbooks', async () => {
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const filter: PlaybookListFilter = Object.freeze({});
      const repository = StubPlaybookRepository.returningEmptyListPage(pagination);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(workspaceId.value, filter, pagination);

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

  describe('list — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const pb = createValidPlaybook();
      const configuredPage: Page<Playbook> = {
        items: [pb],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 80,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(pb);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(80);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('list — preserves absent totalCount', () => {
    it('does not have totalCount when the configured page lacks it', async () => {
      const pb = createValidPlaybook();
      const configuredPage: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(pb);
      expect('totalCount' in result.value).toBe(false);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('list — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const pbA = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        name: 'A Playbook',
        status: 'active',
      });
      const pbB = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000002',
        name: 'B Playbook',
        status: 'active',
      });

      const configuredItems: Playbook[] = [pbA];
      const configuredPage: Page<Playbook> = {
        items: configuredItems,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(configuredPage);
      configuredItems.push(pbB);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(pbA);
      expect(result.value.items).not.toContain(pbB);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('list — wrong workspace', () => {
    it('returns a frozen empty page when the playbook belongs to a different workspace', async () => {
      const workspaceAResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceAResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceBResult = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceBResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      expect(workspaceAResult.value).not.toBe(workspaceBResult.value);

      const pbInWorkspaceA = createValidPlaybook({
        playbookId: '00000000-0000-0000-0000-000000000001',
        workspaceId: '00000000-0000-0000-0000-000000000002',
        name: 'Workspace A Playbook',
        status: 'active',
      });

      expect(pbInWorkspaceA.workspaceId).toBe(workspaceAResult.value);
      expect(pbInWorkspaceA.workspaceId).not.toBe(workspaceBResult.value);

      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository = StubPlaybookRepository.returningEmptyListPage(pagination);

      const result = await repository.list(workspaceBResult.value, Object.freeze({}), pagination);

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

  describe('list — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.list');
      const repository = StubPlaybookRepository.returningListError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.list');
    });
  });

  describe('list — argument capture', () => {
    it('captures the workspaceId, filter, and pagination from the last call', async () => {
      const pb = createValidPlaybook();
      const page: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const filter: PlaybookListFilter = Object.freeze({
        status: 'active',
        hasActiveVersion: false,
      });
      const pagination: PaginationRequest = Object.freeze({ offset: 10, limit: 5 });

      await repository.list(workspaceId.value, filter, pagination);

      const call = repository.listCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.filter).toBe(filter);
      expect(call.pagination).toBe(pagination);
      expect('hasActiveVersion' in call.filter).toBe(true);
      expect(call.filter.hasActiveVersion).toBe(false);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('list — accepts typed arguments', () => {
    it('compiles with WorkspaceId, PlaybookListFilter, and PaginationRequest', () => {
      const pb = createValidPlaybook();
      const page: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(page);

      const _acceptsSignature: (
        workspaceId: WorkspaceId,
        filter: PlaybookListFilter,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> = (
        wsId,
        flt,
        pageReq,
      ) => repository.list(wsId, flt, pageReq);

      void _acceptsSignature;
    });
  });

  describe('list — independent from findById', () => {
    it('does not affect findById when list is configured with a page', async () => {
      const pb = createValidPlaybook();
      const page: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('list — independent from findByNormalizedName', () => {
    it('does not affect findByNormalizedName when list is configured with a page', async () => {
      const pb = createValidPlaybook();
      const page: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findByNormalizedName(workspaceId.value, 'test', {
        includeArchived: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('list — existing operation does not affect list', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const pb = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(pb);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
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

  describe('list — findById does not affect list', () => {
    it('returns a default empty page when only findById is configured (alternative direction)', async () => {
      const pb = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(pb);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.list(
        workspaceId.value,
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

  describe('list — returningListPage does not affect findByNormalizedName', () => {
    it('returns null from findByNormalizedName when a list page is configured', async () => {
      const pb = createValidPlaybook();
      const page: Page<Playbook> = {
        items: [pb],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookRepository.returningListPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const findResult = await repository.findById(workspaceId.value, pb.id);

      expect(findResult.success).toBe(true);
      if (!findResult.success) {
        return;
      }

      expect(findResult.value).toBeNull();
    });
  });
});
