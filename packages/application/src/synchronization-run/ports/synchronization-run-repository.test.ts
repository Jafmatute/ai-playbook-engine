import { describe, expect, it } from 'vitest';

import type { PlaybookSourceId, SynchronizationRunId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseSynchronizationSnapshotId,
  parseWorkspaceId,
  SynchronizationFailure,
  SynchronizationRun,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { SynchronizationRunListFilter } from '../synchronization-run-list-filter.js';
import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { SynchronizationRunRepository } from './synchronization-run-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'synchronizationRun'; readonly synchronizationRun: SynchronizationRun }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindActiveByPlaybookSourceIdStubResult =
  | { readonly kind: 'synchronizationRun'; readonly synchronizationRun: SynchronizationRun }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindActiveByPlaybookSourceIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
}>;

type FindLatestCompletedByPlaybookSourceIdStubResult =
  | { readonly kind: 'synchronizationRun'; readonly synchronizationRun: SynchronizationRun }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestCompletedByPlaybookSourceIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
}>;

type FindStaleRunningStubResult =
  | { readonly kind: 'page'; readonly page: Page<SynchronizationRun> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindStaleRunningCall = Readonly<{
  workspaceId: WorkspaceId;
  olderThan: Instant;
  pagination: PaginationRequest;
}>;

type ListByPlaybookSourceIdStubResult =
  | { readonly kind: 'page'; readonly page: Page<SynchronizationRun> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByPlaybookSourceIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
  filter: SynchronizationRunListFilter;
  pagination: PaginationRequest;
}>;

function copyFrozenSynchronizationRunPage(
  page: Page<SynchronizationRun>,
): Page<SynchronizationRun> {
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

const DEFAULT_EMPTY_STALE_RUNNING_PAGE: Page<SynchronizationRun> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

const DEFAULT_EMPTY_LIST_BY_PLAYBOOK_SOURCE_ID_PAGE: Page<SynchronizationRun> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

class StubSynchronizationRunRepository implements SynchronizationRunRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult;
  readonly #findLatestCompletedResult: FindLatestCompletedByPlaybookSourceIdStubResult;
  readonly #findStaleRunningResult: FindStaleRunningStubResult;
  readonly #listByPlaybookSourceIdResult: ListByPlaybookSourceIdStubResult;
  #findActiveByPlaybookSourceIdCall: FindActiveByPlaybookSourceIdCall | null = null;
  #findLatestCompletedCall: FindLatestCompletedByPlaybookSourceIdCall | null = null;
  #findStaleRunningCall: FindStaleRunningCall | null = null;
  #listByPlaybookSourceIdCall: ListByPlaybookSourceIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult = { kind: 'null' },
    findLatestCompletedResult: FindLatestCompletedByPlaybookSourceIdStubResult = { kind: 'null' },
    findStaleRunningResult: FindStaleRunningStubResult = {
      kind: 'page',
      page: DEFAULT_EMPTY_STALE_RUNNING_PAGE,
    },
    listByPlaybookSourceIdResult: ListByPlaybookSourceIdStubResult = {
      kind: 'page',
      page: DEFAULT_EMPTY_LIST_BY_PLAYBOOK_SOURCE_ID_PAGE,
    },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findActiveByPlaybookSourceIdResult = findActiveByPlaybookSourceIdResult;
    this.#findLatestCompletedResult = findLatestCompletedResult;
    this.#findStaleRunningResult = findStaleRunningResult;
    this.#listByPlaybookSourceIdResult = listByPlaybookSourceIdResult;
  }

  static returningSynchronizationRun(
    synchronizationRun: SynchronizationRun,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository({
      kind: 'synchronizationRun',
      synchronizationRun,
    });
  }

  static returningNull(): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository({ kind: 'error', error });
  }

  static returningActiveSynchronizationRun(
    synchronizationRun: SynchronizationRun,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'synchronizationRun', synchronizationRun },
    );
  }

  static returningNoActiveSynchronizationRun(): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindActiveError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository({ kind: 'null' }, { kind: 'error', error });
  }

  // -- findLatestCompletedByPlaybookSourceId factories ----------------------

  static returningLatestCompletedSynchronizationRun(
    synchronizationRun: SynchronizationRun,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'synchronizationRun', synchronizationRun },
    );
  }

  static returningNoLatestCompletedSynchronizationRun(): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  static returningFindLatestCompletedError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- findStaleRunning factories -------------------------------------------

  static returningStaleRunningPage(
    page: Page<SynchronizationRun>,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: copyFrozenSynchronizationRunPage(page) },
    );
  }

  static returningEmptyStaleRunningPage(
    pagination: PaginationRequest,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
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

  static returningFindStaleRunningError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- listByPlaybookSourceId factories ---------------------------------------

  static returningListByPlaybookSourceIdPage(
    page: Page<SynchronizationRun>,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: DEFAULT_EMPTY_STALE_RUNNING_PAGE },
      { kind: 'page', page: copyFrozenSynchronizationRunPage(page) },
    );
  }

  static returningEmptyListByPlaybookSourceIdPage(
    pagination: PaginationRequest,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: DEFAULT_EMPTY_STALE_RUNNING_PAGE },
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

  static returningListByPlaybookSourceIdError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationRunRepository {
    return new StubSynchronizationRunRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: DEFAULT_EMPTY_STALE_RUNNING_PAGE },
      { kind: 'error', error },
    );
  }

  // -- getters ---------------------------------------------------------------

  get findActiveByPlaybookSourceIdCall(): FindActiveByPlaybookSourceIdCall | null {
    return this.#findActiveByPlaybookSourceIdCall;
  }

  get findLatestCompletedCall(): FindLatestCompletedByPlaybookSourceIdCall | null {
    return this.#findLatestCompletedCall;
  }

  get findStaleRunningCall(): FindStaleRunningCall | null {
    return this.#findStaleRunningCall;
  }

  get listByPlaybookSourceIdCall(): ListByPlaybookSourceIdCall | null {
    return this.#listByPlaybookSourceIdCall;
  }

  // -- findById --------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _synchronizationRunId: SynchronizationRunId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'synchronizationRun': {
        return ok(this.#findByIdResult.synchronizationRun);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findActiveByPlaybookSourceId ------------------------------------------

  async findActiveByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> {
    this.#findActiveByPlaybookSourceIdCall = Object.freeze({
      workspaceId,
      playbookSourceId,
    });

    switch (this.#findActiveByPlaybookSourceIdResult.kind) {
      case 'synchronizationRun': {
        return ok(this.#findActiveByPlaybookSourceIdResult.synchronizationRun);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findActiveByPlaybookSourceIdResult.error);
      }
    }
  }

  // -- findLatestCompletedByPlaybookSourceId ---------------------------------

  async findLatestCompletedByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> {
    this.#findLatestCompletedCall = Object.freeze({ workspaceId, playbookSourceId });

    switch (this.#findLatestCompletedResult.kind) {
      case 'synchronizationRun': {
        return ok(this.#findLatestCompletedResult.synchronizationRun);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestCompletedResult.error);
      }
    }
  }

  // -- findStaleRunning ------------------------------------------------------

  async findStaleRunning(
    workspaceId: WorkspaceId,
    olderThan: Instant,
    pagination: PaginationRequest,
  ): Promise<Result<Page<SynchronizationRun>, PersistenceOperationFailedError>> {
    this.#findStaleRunningCall = Object.freeze({ workspaceId, olderThan, pagination });

    switch (this.#findStaleRunningResult.kind) {
      case 'page': {
        return ok(this.#findStaleRunningResult.page);
      }
      case 'error': {
        return err(this.#findStaleRunningResult.error);
      }
    }
  }

  // -- listByPlaybookSourceId -------------------------------------------------

  async listByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
    filter: SynchronizationRunListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<SynchronizationRun>, PersistenceOperationFailedError>> {
    this.#listByPlaybookSourceIdCall = Object.freeze({
      workspaceId,
      playbookSourceId,
      filter,
      pagination,
    });

    switch (this.#listByPlaybookSourceIdResult.kind) {
      case 'page': {
        return ok(this.#listByPlaybookSourceIdResult.page);
      }
      case 'error': {
        return err(this.#listByPlaybookSourceIdResult.error);
      }
    }
  }
}

function createValidSynchronizationRun(): SynchronizationRun {
  const synchronizationRunIdResult = parseSynchronizationRunId(
    '00000000-0000-0000-0000-000000000001',
  );
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000003');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const playbookSourceIdResult = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  return SynchronizationRun.create({
    synchronizationRunId: synchronizationRunIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    playbookSourceId: playbookSourceIdResult.value,
    createdAt: createdAtResult.value,
  });
}

interface SynchronizationRunFixtureOptions {
  readonly synchronizationRunId: string;
  readonly playbookSourceId: string;
  readonly synchronizationSnapshotId: string;
  readonly createdAt: string;
  readonly startedAt: string;
  readonly completedAt: string;
}

function createCompletedSynchronizationRun(
  options?: Partial<SynchronizationRunFixtureOptions>,
): SynchronizationRun {
  const synchronizationRunIdRaw =
    options?.synchronizationRunId ?? '00000000-0000-0000-0000-000000000001';
  const synchronizationRunIdResult = parseSynchronizationRunId(synchronizationRunIdRaw);
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000003');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const playbookSourceIdRaw = options?.playbookSourceId ?? '00000000-0000-0000-0000-000000000004';
  const playbookSourceIdResult = parsePlaybookSourceId(playbookSourceIdRaw);
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const createdAtRaw = options?.createdAt ?? '2026-07-15T10:00:00.000Z';
  const createdAtResult = Instant.parse(createdAtRaw);
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const run = SynchronizationRun.create({
    synchronizationRunId: synchronizationRunIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    playbookSourceId: playbookSourceIdResult.value,
    createdAt: createdAtResult.value,
  });

  const startedAtRaw = options?.startedAt ?? '2026-07-15T10:00:00.000Z';
  const startedAtResult = Instant.parse(startedAtRaw);
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const startResult = run.start({ startedAt: startedAtResult.value });
  if (!startResult.success) {
    throw new Error('Expected the start transition to succeed.');
  }

  const completedAtRaw = options?.completedAt ?? '2026-07-15T11:00:00.000Z';
  const completedAtResult = Instant.parse(completedAtRaw);
  if (!completedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const snapshotIdRaw =
    options?.synchronizationSnapshotId ?? '00000000-0000-0000-0000-000000000010';
  const snapshotIdResult = parseSynchronizationSnapshotId(snapshotIdRaw);
  if (!snapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const completeResult = run.complete({
    completedAt: completedAtResult.value,
    synchronizationSnapshotId: snapshotIdResult.value,
  });
  if (!completeResult.success) {
    throw new Error('Expected the complete transition to succeed.');
  }

  return run;
}

function createFailedSynchronizationRun(): SynchronizationRun {
  const run = createValidSynchronizationRun();

  const startedAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const startResult = run.start({ startedAt: startedAtResult.value });
  if (!startResult.success) {
    throw new Error('Expected the start transition to succeed.');
  }

  const failureResult = SynchronizationFailure.create({
    code: 'SYNC_ERROR',
    message: 'Synchronization failed.',
    stage: 'retrieval',
    retryable: true,
    externalReference: null,
  });
  if (!failureResult.success) {
    throw new Error('Expected a valid synchronization failure fixture.');
  }

  const failedAtResult = Instant.parse('2026-07-15T11:00:00.000Z');
  if (!failedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const failResult = run.fail({
    failedAt: failedAtResult.value,
    failure: failureResult.value,
  });
  if (!failResult.success) {
    throw new Error('Expected the fail transition to succeed.');
  }

  return run;
}

interface RunningSynchronizationRunFixtureOptions {
  readonly synchronizationRunId: string;
  readonly workspaceId: string;
  readonly playbookId: string;
  readonly playbookSourceId: string;
  readonly createdAt: string;
  readonly startedAt: string;
}

function parseOlderThanInstant(): Instant {
  const result = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!result.success) {
    throw new Error('Expected a valid instant fixture.');
  }
  return result.value;
}

function createRunningSynchronizationRun(
  options?: Partial<RunningSynchronizationRunFixtureOptions>,
): SynchronizationRun {
  const synchronizationRunIdRaw =
    options?.synchronizationRunId ?? '00000000-0000-0000-0000-000000000001';
  const synchronizationRunIdResult = parseSynchronizationRunId(synchronizationRunIdRaw);
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
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

  const playbookSourceIdRaw = options?.playbookSourceId ?? '00000000-0000-0000-0000-000000000004';
  const playbookSourceIdResult = parsePlaybookSourceId(playbookSourceIdRaw);
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const startedAtRaw = options?.startedAt ?? '2026-07-15T10:00:00.000Z';
  const startedAtResult = Instant.parse(startedAtRaw);
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  // createdAt must be before startedAt for the start transition to succeed
  const createdAtRaw = options?.createdAt ?? '2026-07-15T07:00:00.000Z';
  const createdAtResult = Instant.parse(createdAtRaw);
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const run = SynchronizationRun.create({
    synchronizationRunId: synchronizationRunIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    playbookSourceId: playbookSourceIdResult.value,
    createdAt: createdAtResult.value,
  });

  const startResult = run.start({ startedAt: startedAtResult.value });
  if (!startResult.success) {
    throw new Error('Expected the start transition to succeed.');
  }

  return run;
}

describe('SynchronizationRunRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the SynchronizationRun instance', async () => {
      const synchronizationRun = createValidSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningSynchronizationRun(synchronizationRun);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationRun.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(synchronizationRun);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubSynchronizationRunRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationRunId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the run belongs to a different workspace', async () => {
      const repository = StubSynchronizationRunRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, synchronizationRunId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationRun.findById');
      const repository = StubSynchronizationRunRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationRunId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('synchronizationRun.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and SynchronizationRunId parameter types', () => {
      const synchronizationRun = createValidSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningSynchronizationRun(synchronizationRun);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        synchronizationRunId: SynchronizationRunId,
      ) => Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> = (
        wsId,
        srId,
      ) => repository.findById(wsId, srId);

      void _acceptsTypedIds;
    });
  });

  describe('findActiveByPlaybookSourceId — active found', () => {
    it('returns a successful Result with the active SynchronizationRun instance', async () => {
      const synchronizationRun = createValidSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningActiveSynchronizationRun(synchronizationRun);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(synchronizationRun);
    });
  });

  describe('findActiveByPlaybookSourceId — no runs', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findActiveByPlaybookSourceId — only completed runs', () => {
    it('returns a successful Result with null when only completed runs exist', async () => {
      const completedRun = createCompletedSynchronizationRun();
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
      void completedRun;
    });
  });

  describe('findActiveByPlaybookSourceId — only failed runs', () => {
    it('returns a successful Result with null when only failed runs exist', async () => {
      const failedRun = createFailedSynchronizationRun();
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
      void failedRun;
    });
  });

  describe('findActiveByPlaybookSourceId — source does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000006');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findActiveByPlaybookSourceId — wrong workspace', () => {
    it('returns a successful Result with null when the source belongs to a different workspace', async () => {
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceB.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findActiveByPlaybookSourceId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationRun.findActiveByPlaybookSourceId');
      const repository = StubSynchronizationRunRepository.returningFindActiveError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe(
        'synchronizationRun.findActiveByPlaybookSourceId',
      );
    });
  });

  describe('findActiveByPlaybookSourceId — captures arguments', () => {
    it('captures the exact workspaceId and playbookSourceId', async () => {
      const repository = StubSynchronizationRunRepository.returningNoActiveSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      await repository.findActiveByPlaybookSourceId(workspaceId.value, playbookSourceId.value);

      const call = repository.findActiveByPlaybookSourceIdCall;
      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookSourceId).toBe(playbookSourceId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findActiveByPlaybookSourceId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookSourceId parameter types', () => {
      const synchronizationRun = createValidSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningActiveSynchronizationRun(synchronizationRun);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
      ) => Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> = (
        wsId,
        psId,
      ) => repository.findActiveByPlaybookSourceId(wsId, psId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findLatestCompletedByPlaybookSourceId
  // -------------------------------------------------------------------------

  describe('findLatestCompletedByPlaybookSourceId — found', () => {
    it('returns the most recently completed SynchronizationRun for the source', async () => {
      const olderCompletedRun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-07-15T09:00:00.000Z',
        startedAt: '2026-07-15T09:00:00.000Z',
        completedAt: '2026-07-15T10:00:00.000Z',
      });
      const latestCompletedRun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000020',
        createdAt: '2026-07-15T11:00:00.000Z',
        startedAt: '2026-07-15T11:00:00.000Z',
        completedAt: '2026-07-15T12:00:00.000Z',
      });

      expect(olderCompletedRun.status).toBe('completed');
      expect(latestCompletedRun.status).toBe('completed');
      expect(olderCompletedRun.playbookSourceId).toBe(latestCompletedRun.playbookSourceId);
      expect(olderCompletedRun.id).not.toBe(latestCompletedRun.id);
      expect(olderCompletedRun.synchronizationSnapshotId).not.toBe(
        latestCompletedRun.synchronizationSnapshotId,
      );

      const olderCompletedAt = olderCompletedRun.completedAt;
      const latestCompletedAt = latestCompletedRun.completedAt;
      if (olderCompletedAt === null || latestCompletedAt === null) {
        throw new Error('Expected completed run fixtures.');
      }
      expect(latestCompletedAt.compare(olderCompletedAt)).toBeGreaterThan(0);

      const repository =
        StubSynchronizationRunRepository.returningLatestCompletedSynchronizationRun(
          latestCompletedRun,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      const latest = result.value;
      if (latest === null) {
        throw new Error('Expected a SynchronizationRun.');
      }

      expect(latest).toBe(latestCompletedRun);
      expect(latest).not.toBe(olderCompletedRun);
      expect(latest.status).toBe('completed');
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — no runs', () => {
    it('returns a successful Result with null when no runs exist', async () => {
      const repository =
        StubSynchronizationRunRepository.returningNoLatestCompletedSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — no completed runs', () => {
    it('returns null when only pending, running, or failed runs exist', async () => {
      const pendingRunId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000010');
      if (!pendingRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }
      const wsId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!wsId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const pbId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!pbId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const psId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!psId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const createdAt = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!createdAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const pendingRun = SynchronizationRun.create({
        synchronizationRunId: pendingRunId.value,
        workspaceId: wsId.value,
        playbookId: pbId.value,
        playbookSourceId: psId.value,
        createdAt: createdAt.value,
      });
      expect(pendingRun.status).toBe('pending');

      const runningRunId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000011');
      if (!runningRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }
      const runningRun = SynchronizationRun.create({
        synchronizationRunId: runningRunId.value,
        workspaceId: wsId.value,
        playbookId: pbId.value,
        playbookSourceId: psId.value,
        createdAt: createdAt.value,
      });
      const startedAt = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!startedAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const startResult = runningRun.start({ startedAt: startedAt.value });
      if (!startResult.success) {
        throw new Error('Expected start transition to succeed.');
      }
      expect(runningRun.status).toBe('running');

      const failedRun = createFailedSynchronizationRun();
      expect(failedRun.status).toBe('failed');

      const repository =
        StubSynchronizationRunRepository.returningNoLatestCompletedSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — source does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationRunRepository.returningNoLatestCompletedSynchronizationRun();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        nonExistentSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository =
        StubSynchronizationRunRepository.returningNoLatestCompletedSynchronizationRun();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceB.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — another source has more recent run', () => {
    it('returns only the run for the queried source', async () => {
      const sourceARun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000010',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        createdAt: '2026-07-15T09:00:00.000Z',
        startedAt: '2026-07-15T09:00:00.000Z',
        completedAt: '2026-07-15T10:00:00.000Z',
      });
      const newerSourceBRun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000020',
        playbookSourceId: '00000000-0000-0000-0000-00000000000b',
        createdAt: '2026-07-15T11:00:00.000Z',
        startedAt: '2026-07-15T11:00:00.000Z',
        completedAt: '2026-07-15T12:00:00.000Z',
      });

      expect(sourceARun.playbookSourceId).not.toBe(newerSourceBRun.playbookSourceId);

      const sourceACompletedAt = sourceARun.completedAt;
      const sourceBCompletedAt = newerSourceBRun.completedAt;
      if (sourceACompletedAt === null || sourceBCompletedAt === null) {
        throw new Error('Expected completed run fixtures.');
      }
      expect(sourceBCompletedAt.compare(sourceACompletedAt)).toBeGreaterThan(0);

      const repository =
        StubSynchronizationRunRepository.returningLatestCompletedSynchronizationRun(sourceARun);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceAId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000000a');
      if (!sourceAId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        sourceAId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      const value = result.value;
      if (value === null) {
        throw new Error('Expected a SynchronizationRun.');
      }

      expect(value).toBe(sourceARun);
      expect(value).not.toBe(newerSourceBRun);
      expect(value.playbookSourceId).toBe(sourceAId.value);
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — independence from other operations', () => {
    it('does not affect the default null results of findById and findActiveByPlaybookSourceId', async () => {
      const completedRun = createCompletedSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningLatestCompletedSynchronizationRun(completedRun);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const runId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000001');
      if (!runId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const findByIdResult = await repository.findById(workspaceId.value, runId.value);
      const findActiveResult = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(findByIdResult.success).toBe(true);
      if (!findByIdResult.success) {
        return;
      }
      expect(findByIdResult.value).toBeNull();

      expect(findActiveResult.success).toBe(true);
      if (!findActiveResult.success) {
        return;
      }
      expect(findActiveResult.value).toBeNull();
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed(
        'synchronizationRun.findLatestCompletedByPlaybookSourceId',
      );
      const repository = StubSynchronizationRunRepository.returningFindLatestCompletedError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe(
        'synchronizationRun.findLatestCompletedByPlaybookSourceId',
      );
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — argument capture', () => {
    it('captures the workspaceId and playbookSourceId from the last call', async () => {
      const completedRun = createCompletedSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningLatestCompletedSynchronizationRun(completedRun);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      const call = repository.findLatestCompletedCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookSourceId).toBe(playbookSourceId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestCompletedByPlaybookSourceId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookSourceId parameter types', () => {
      const completedRun = createCompletedSynchronizationRun();
      const repository =
        StubSynchronizationRunRepository.returningLatestCompletedSynchronizationRun(completedRun);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
      ) => Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> = (
        wsId,
        psId,
      ) => repository.findLatestCompletedByPlaybookSourceId(wsId, psId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findStaleRunning tests
  // -------------------------------------------------------------------------

  describe('findStaleRunning — two stale runs', () => {
    it('returns a page with both stale running runs', async () => {
      const olderThan = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!olderThan.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const staleRunA = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const staleRunB = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        playbookSourceId: '00000000-0000-0000-0000-00000000000b',
        startedAt: '2026-07-15T09:00:00.000Z',
      });

      const staleRunAStartedAt = staleRunA.startedAt;
      const staleRunBStartedAt = staleRunB.startedAt;
      if (staleRunAStartedAt === null || staleRunBStartedAt === null) {
        throw new Error('Expected running runs to have startedAt.');
      }

      expect(staleRunA.status).toBe('running');
      expect(staleRunB.status).toBe('running');
      expect(staleRunA.id).not.toBe(staleRunB.id);
      expect(staleRunA.playbookSourceId).not.toBe(staleRunB.playbookSourceId);
      expect(staleRunAStartedAt.compare(olderThan.value)).toBeLessThan(0);
      expect(staleRunBStartedAt.compare(olderThan.value)).toBeLessThan(0);

      const configuredPage: Page<SynchronizationRun> = {
        items: [staleRunA, staleRunB],
        offset: 0,
        limit: 2,
        hasMore: false,
        totalCount: 2,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        olderThan.value,
        Object.freeze({ offset: 0, limit: 2 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(2);
      expect(result.value.items[0]).toBe(staleRunA);
      expect(result.value.items[1]).toBe(staleRunB);

      for (const run of result.value.items) {
        expect(run.workspaceId).toBe(workspaceId.value);
        expect(run.status).toBe('running');
      }

      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(2);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(2);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('findStaleRunning — empty page', () => {
    it('returns a frozen empty page when there are no stale runs', async () => {
      const repository = StubSynchronizationRunRepository.returningEmptyStaleRunningPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
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

  describe('findStaleRunning — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });

      const configuredPage: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 60,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(staleRun);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(60);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('findStaleRunning — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const staleRunA = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const staleRunB = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        playbookSourceId: '00000000-0000-0000-0000-00000000000b',
        startedAt: '2026-07-15T09:00:00.000Z',
      });

      const configuredRuns: SynchronizationRun[] = [staleRunA];
      const configuredPage: Page<SynchronizationRun> = {
        items: configuredRuns,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(configuredPage);
      configuredRuns.push(staleRunB);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(staleRunA);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('findStaleRunning — pending run', () => {
    it('returns an empty page when the run is pending (not started)', async () => {
      const pendingRun = createValidSynchronizationRun();
      expect(pendingRun.status).toBe('pending');
      expect(pendingRun.startedAt).toBeNull();

      const repository = StubSynchronizationRunRepository.returningEmptyStaleRunningPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void pendingRun;
    });
  });

  describe('findStaleRunning — exact boundary', () => {
    it('excludes runs whose startedAt equals olderThan (exclusive boundary)', async () => {
      const olderThan = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!olderThan.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const boundaryRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
      });

      const startedAt = boundaryRun.startedAt;
      if (startedAt === null) {
        throw new Error('Expected running run to have startedAt.');
      }

      expect(startedAt.compare(olderThan.value)).toBe(0);

      const repository = StubSynchronizationRunRepository.returningEmptyStaleRunningPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        olderThan.value,
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      void boundaryRun;
    });
  });

  describe('findStaleRunning — after boundary', () => {
    it('excludes runs whose startedAt is after olderThan', async () => {
      const olderThan = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!olderThan.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const recentRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T11:00:00.000Z',
      });

      const startedAt = recentRun.startedAt;
      if (startedAt === null) {
        throw new Error('Expected running run to have startedAt.');
      }

      expect(startedAt.compare(olderThan.value)).toBeGreaterThan(0);

      const repository = StubSynchronizationRunRepository.returningEmptyStaleRunningPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        olderThan.value,
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      void recentRun;
    });
  });

  describe('findStaleRunning — terminal runs excluded', () => {
    it('returns an empty page when only completed and failed runs exist', async () => {
      const completedRun = createCompletedSynchronizationRun();
      const failedRun = createFailedSynchronizationRun();

      expect(completedRun.status).toBe('completed');
      expect(failedRun.status).toBe('failed');

      const repository = StubSynchronizationRunRepository.returningEmptyStaleRunningPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      void completedRun;
      void failedRun;
    });
  });

  describe('findStaleRunning — wrong workspace', () => {
    it('returns a frozen empty page when the stale run belongs to a different workspace', async () => {
      const workspaceAResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceAResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const workspaceBResult = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceBResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      expect(workspaceAResult.value).not.toBe(workspaceBResult.value);

      const olderThan = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!olderThan.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const staleRunInWorkspaceA = createRunningSynchronizationRun({
        workspaceId: '00000000-0000-0000-0000-000000000002',
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-000000000004',
        startedAt: '2026-07-15T08:00:00.000Z',
      });

      const startedAt = staleRunInWorkspaceA.startedAt;
      if (startedAt === null) {
        throw new Error('Expected running run to have startedAt.');
      }

      expect(staleRunInWorkspaceA.status).toBe('running');
      expect(staleRunInWorkspaceA.workspaceId).toBe(workspaceAResult.value);
      expect(staleRunInWorkspaceA.workspaceId).not.toBe(workspaceBResult.value);
      expect(startedAt.compare(olderThan.value)).toBeLessThan(0);

      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository =
        StubSynchronizationRunRepository.returningEmptyStaleRunningPage(pagination);

      const result = await repository.findStaleRunning(
        workspaceBResult.value,
        olderThan.value,
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

  describe('findStaleRunning — independence from findById', () => {
    it('does not affect findById when findStaleRunning is configured with runs', async () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const runId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000001');
      if (!runId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, runId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findStaleRunning — independence from findActiveByPlaybookSourceId', () => {
    it('does not affect findActiveByPlaybookSourceId when findStaleRunning is configured', async () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findStaleRunning — independence from findLatestCompletedByPlaybookSourceId', () => {
    it('does not affect findLatestCompletedByPlaybookSourceId when findStaleRunning is configured', async () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findStaleRunning — existing operation does not affect stale', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const run = createValidSynchronizationRun();
      const repository = StubSynchronizationRunRepository.returningSynchronizationRun(run);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
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

  describe('findStaleRunning — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationRun.findStaleRunning');
      const repository = StubSynchronizationRunRepository.returningFindStaleRunningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('synchronizationRun.findStaleRunning');
    });
  });

  describe('findStaleRunning — argument capture', () => {
    it('captures the workspaceId, olderThan, and pagination from the last call', async () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const olderThan = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!olderThan.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });

      await repository.findStaleRunning(workspaceId.value, olderThan.value, pagination);

      const call = repository.findStaleRunningCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.olderThan).toBe(olderThan.value);
      expect(call.pagination).toBe(pagination);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findStaleRunning — accepts typed arguments', () => {
    it('compiles with WorkspaceId, Instant, and PaginationRequest parameter types', () => {
      const staleRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T08:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [staleRun],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningStaleRunningPage(page);

      const _acceptsTypedArguments: (
        workspaceId: WorkspaceId,
        olderThan: Instant,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<SynchronizationRun>, PersistenceOperationFailedError>> = (
        wsId,
        cutoff,
        pageRequest,
      ) => repository.findStaleRunning(wsId, cutoff, pageRequest);

      void _acceptsTypedArguments;
    });
  });

  // -------------------------------------------------------------------------
  // listByPlaybookSourceId tests
  // -------------------------------------------------------------------------

  describe('listByPlaybookSourceId — history without filters', () => {
    it('returns a page with running and completed runs for the source', async () => {
      const runningRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const completedRun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-07-15T08:00:00.000Z',
        startedAt: '2026-07-15T09:00:00.000Z',
        completedAt: '2026-07-15T10:00:00.000Z',
      });

      expect(runningRun.workspaceId).toBe(completedRun.workspaceId);
      expect(runningRun.playbookSourceId).toBe(completedRun.playbookSourceId);
      expect(runningRun.id).not.toBe(completedRun.id);
      expect(runningRun.status).toBe('running');
      expect(completedRun.status).toBe('completed');
      expect(runningRun.createdAt.compare(completedRun.createdAt)).not.toBe(0);

      const filter: SynchronizationRunListFilter = Object.freeze({});
      const configuredPage: Page<SynchronizationRun> = {
        items: [runningRun, completedRun],
        offset: 0,
        limit: 2,
        hasMore: false,
        totalCount: 2,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000000a');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 2 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(2);
      expect(result.value.items[0]).toBe(runningRun);
      expect(result.value.items[1]).toBe(completedRun);

      for (const run of result.value.items) {
        expect(run.workspaceId).toBe(workspaceId.value);
        expect(run.playbookSourceId).toBe(playbookSourceId.value);
      }

      expect(runningRun.status).toBe('running');
      expect(completedRun.status).toBe('completed');
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(2);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(2);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — filter by status', () => {
    it('returns a page filtered by a specific status', async () => {
      const failedRun = createFailedSynchronizationRun();
      expect(failedRun.status).toBe('failed');

      const filter: SynchronizationRunListFilter = Object.freeze({ status: 'failed' });
      const configuredPage: Page<SynchronizationRun> = {
        items: [failedRun],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(failedRun);
      expect(result.value.items[0]?.status).toBe('failed');
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — inclusive lower bound', () => {
    it('includes runs whose createdAt equals createdAtFrom', async () => {
      const createdAtFrom = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!createdAtFrom.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
        createdAt: '2026-07-15T10:00:00.000Z',
      });

      expect(run.createdAt.compare(createdAtFrom.value)).toBe(0);

      const filter: SynchronizationRunListFilter = Object.freeze({
        createdAtFrom: createdAtFrom.value,
      });
      const configuredPage: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(run);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — exclusive upper bound', () => {
    it('excludes runs whose createdAt equals createdAtTo', async () => {
      const createdAtTo = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!createdAtTo.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const boundaryRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
        createdAt: '2026-07-15T10:00:00.000Z',
      });

      expect(boundaryRun.createdAt.compare(createdAtTo.value)).toBe(0);

      const filter: SynchronizationRunListFilter = Object.freeze({
        createdAtTo: createdAtTo.value,
      });
      const repository = StubSynchronizationRunRepository.returningEmptyListByPlaybookSourceIdPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
      void boundaryRun;
    });
  });

  describe('listByPlaybookSourceId — combined filter', () => {
    it('returns a page when all filter fields match semantically', async () => {
      const createdAtFrom = Instant.parse('2026-07-15T00:00:00.000Z');
      if (!createdAtFrom.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const createdAtTo = Instant.parse('2026-07-16T00:00:00.000Z');
      if (!createdAtTo.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const completedRun = createCompletedSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000010',
        createdAt: '2026-07-15T12:00:00.000Z',
        startedAt: '2026-07-15T12:00:00.000Z',
        completedAt: '2026-07-15T13:00:00.000Z',
      });

      expect(completedRun.status).toBe('completed');
      expect(completedRun.createdAt.compare(createdAtFrom.value)).toBeGreaterThanOrEqual(0);
      expect(completedRun.createdAt.compare(createdAtTo.value)).toBeLessThan(0);

      const filter: SynchronizationRunListFilter = Object.freeze({
        status: 'completed',
        createdAtFrom: createdAtFrom.value,
        createdAtTo: createdAtTo.value,
      });
      const configuredPage: Page<SynchronizationRun> = {
        items: [completedRun],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(completedRun);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — empty page', () => {
    it('returns a frozen empty page when there are no runs', async () => {
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const filter: SynchronizationRunListFilter = Object.freeze({});
      const repository =
        StubSynchronizationRunRepository.returningEmptyListByPlaybookSourceIdPage(pagination);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
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

  describe('listByPlaybookSourceId — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const configuredPage: Page<SynchronizationRun> = {
        items: [run],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 60,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(run);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(60);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const runA = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const runB = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000002',
        playbookSourceId: '00000000-0000-0000-0000-00000000000b',
        startedAt: '2026-07-15T10:00:00.000Z',
      });

      const configuredRuns: SynchronizationRun[] = [runA];
      const configuredPage: Page<SynchronizationRun> = {
        items: configuredRuns,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(configuredPage);
      configuredRuns.push(runB);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(runA);
      expect(result.value.items).not.toContain(runB);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — source does not exist', () => {
    it('returns a frozen empty page when the playbook source does not exist', async () => {
      const repository = StubSynchronizationRunRepository.returningEmptyListByPlaybookSourceIdPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        nonExistentSourceId.value,
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

  describe('listByPlaybookSourceId — wrong workspace', () => {
    it('returns a frozen empty page when the run belongs to a different workspace', async () => {
      const workspaceAResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceAResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceBResult = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceBResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      expect(workspaceAResult.value).not.toBe(workspaceBResult.value);

      const runInWorkspaceA = createRunningSynchronizationRun({
        workspaceId: '00000000-0000-0000-0000-000000000002',
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-000000000004',
        startedAt: '2026-07-15T09:00:00.000Z',
      });

      expect(runInWorkspaceA.workspaceId).toBe(workspaceAResult.value);
      expect(runInWorkspaceA.workspaceId).not.toBe(workspaceBResult.value);

      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository =
        StubSynchronizationRunRepository.returningEmptyListByPlaybookSourceIdPage(pagination);
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceBResult.value,
        playbookSourceId.value,
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

  describe('listByPlaybookSourceId — another playbook source', () => {
    it('returns a frozen empty page when only another source has runs', async () => {
      const queriedSourceResult = parsePlaybookSourceId('00000000-0000-0000-0000-00000000000a');
      if (!queriedSourceResult.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const otherSourceResult = parsePlaybookSourceId('00000000-0000-0000-0000-00000000000c');
      if (!otherSourceResult.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const otherRun = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000c',
        startedAt: '2026-07-15T09:00:00.000Z',
      });

      expect(queriedSourceResult.value).not.toBe(otherSourceResult.value);
      expect(otherRun.playbookSourceId).toBe(otherSourceResult.value);
      expect(otherRun.playbookSourceId).not.toBe(queriedSourceResult.value);

      const repository = StubSynchronizationRunRepository.returningEmptyListByPlaybookSourceIdPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        queriedSourceResult.value,
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

  describe('listByPlaybookSourceId — independent from findById', () => {
    it('does not affect findById when listByPlaybookSourceId is configured', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const runId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000001');
      if (!runId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, runId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookSourceId — independent from findActiveByPlaybookSourceId', () => {
    it('does not affect findActiveByPlaybookSourceId when list is configured', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findActiveByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookSourceId — independent from findLatestCompletedByPlaybookSourceId', () => {
    it('does not affect findLatestCompletedByPlaybookSourceId when list is configured', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestCompletedByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookSourceId — independent from findStaleRunning', () => {
    it('does not affect findStaleRunning when list is configured', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findStaleRunning(
        workspaceId.value,
        parseOlderThanInstant(),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — existing operation does not affect list', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const run = createValidSynchronizationRun();
      const repository = StubSynchronizationRunRepository.returningSynchronizationRun(run);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
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

  describe('listByPlaybookSourceId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationRun.listByPlaybookSourceId');
      const repository =
        StubSynchronizationRunRepository.returningListByPlaybookSourceIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('synchronizationRun.listByPlaybookSourceId');
    });
  });

  describe('listByPlaybookSourceId — argument capture', () => {
    it('captures the workspaceId, playbookSourceId, filter, and pagination', async () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000004');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const filter: SynchronizationRunListFilter = Object.freeze({ status: 'running' });
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });

      await repository.listByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
        filter,
        pagination,
      );

      const call = repository.listByPlaybookSourceIdCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookSourceId).toBe(playbookSourceId.value);
      expect(call.filter).toBe(filter);
      expect(call.pagination).toBe(pagination);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listByPlaybookSourceId — accepts typed arguments', () => {
    it('compiles with WorkspaceId, PlaybookSourceId, SynchronizationRunListFilter, and PaginationRequest', () => {
      const run = createRunningSynchronizationRun({
        synchronizationRunId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T09:00:00.000Z',
      });
      const page: Page<SynchronizationRun> = {
        items: [run],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubSynchronizationRunRepository.returningListByPlaybookSourceIdPage(page);

      const _acceptsTypedArguments: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
        filter: SynchronizationRunListFilter,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<SynchronizationRun>, PersistenceOperationFailedError>> = (
        wsId,
        sourceId,
        runFilter,
        pageRequest,
      ) => repository.listByPlaybookSourceId(wsId, sourceId, runFilter, pageRequest);

      void _acceptsTypedArguments;
    });
  });
});
