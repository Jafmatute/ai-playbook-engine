import { describe, expect, it } from 'vitest';

import type { PlaybookId, PlaybookVersionId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  ContentChecksum,
  Instant,
  NormalizationSchemaVersion,
  parseNormalizationAttemptId,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseSynchronizationSnapshotId,
  parseValidationAttemptId,
  parseWorkspaceId,
  ParserVersion,
  PlaybookVersion,
  ValidationSummary,
  ValidatorVersion,
  VersionLabel,
  VersionSequence,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PlaybookVersionListFilter } from '../playbook-version-list-filter.js';
import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookVersionRepository } from './playbook-version-repository.js';

// ---------------------------------------------------------------------------
// Stub result types
// ---------------------------------------------------------------------------

type FindByIdStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySequenceStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySequenceCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
  versionSequence: VersionSequence;
}>;

type FindLatestByPlaybookIdStubResult =
  | { readonly kind: 'playbookVersion'; readonly playbookVersion: PlaybookVersion }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByPlaybookIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
}>;

type ListByPlaybookIdStubResult =
  | { readonly kind: 'page'; readonly page: Page<PlaybookVersion> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByPlaybookIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
  filter: PlaybookVersionListFilter;
  pagination: PaginationRequest;
}>;

function copyFrozenPlaybookVersionPage(page: Page<PlaybookVersion>): Page<PlaybookVersion> {
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

const DEFAULT_EMPTY_LIST_BY_PLAYBOOK_ID_PAGE: Page<PlaybookVersion> = Object.freeze({
  items: Object.freeze([]),
  offset: 0,
  limit: 25,
  hasMore: false,
  totalCount: 0,
});

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubPlaybookVersionRepository implements PlaybookVersionRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySequenceResult: FindBySequenceStubResult;
  readonly #findLatestByPlaybookIdResult: FindLatestByPlaybookIdStubResult;
  readonly #listByPlaybookIdResult: ListByPlaybookIdStubResult;
  #findBySequenceCall: FindBySequenceCall | null = null;
  #findLatestByPlaybookIdCall: FindLatestByPlaybookIdCall | null = null;
  #listByPlaybookIdCall: ListByPlaybookIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySequenceResult: FindBySequenceStubResult,
    findLatestByPlaybookIdResult: FindLatestByPlaybookIdStubResult,
    listByPlaybookIdResult: ListByPlaybookIdStubResult = {
      kind: 'page',
      page: DEFAULT_EMPTY_LIST_BY_PLAYBOOK_ID_PAGE,
    },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySequenceResult = findBySequenceResult;
    this.#findLatestByPlaybookIdResult = findLatestByPlaybookIdResult;
    this.#listByPlaybookIdResult = listByPlaybookIdResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningPlaybookVersion(playbookVersion: PlaybookVersion): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'playbookVersion', playbookVersion },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  static returningNull(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'error', error },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  // -- findBySequence factories ---------------------------------------------

  static returningPlaybookVersionBySequence(
    playbookVersion: PlaybookVersion,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'playbookVersion', playbookVersion },
      { kind: 'null' },
    );
  }

  static returningNoPlaybookVersionBySequence(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningFindBySequenceError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'error', error },
      { kind: 'null' },
    );
  }

  // -- findLatestByPlaybookId factories -------------------------------------

  static returningLatestPlaybookVersion(
    playbookVersion: PlaybookVersion,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'playbookVersion', playbookVersion },
    );
  }

  static returningNoLatestPlaybookVersion(): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository({ kind: 'null' }, { kind: 'null' }, { kind: 'null' });
  }

  static returningFindLatestByPlaybookIdError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- listByPlaybookId factories --------------------------------------------

  static returningListByPlaybookIdPage(page: Page<PlaybookVersion>): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'page', page: copyFrozenPlaybookVersionPage(page) },
    );
  }

  static returningEmptyListByPlaybookIdPage(
    pagination: PaginationRequest,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
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

  static returningListByPlaybookIdError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookVersionRepository {
    return new StubPlaybookVersionRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- findLatestByPlaybookId ------------------------------------------------

  get findLatestByPlaybookIdCall(): FindLatestByPlaybookIdCall | null {
    return this.#findLatestByPlaybookIdCall;
  }

  async findLatestByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    this.#findLatestByPlaybookIdCall = Object.freeze({ workspaceId, playbookId });

    switch (this.#findLatestByPlaybookIdResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findLatestByPlaybookIdResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestByPlaybookIdResult.error);
      }
    }
  }

  // -- listByPlaybookId getter and method ------------------------------------

  get listByPlaybookIdCall(): ListByPlaybookIdCall | null {
    return this.#listByPlaybookIdCall;
  }

  async listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    filter: PlaybookVersionListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookVersion>, PersistenceOperationFailedError>> {
    this.#listByPlaybookIdCall = Object.freeze({ workspaceId, playbookId, filter, pagination });

    switch (this.#listByPlaybookIdResult.kind) {
      case 'page': {
        return ok(this.#listByPlaybookIdResult.page);
      }
      case 'error': {
        return err(this.#listByPlaybookIdResult.error);
      }
    }
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _playbookVersionId: PlaybookVersionId,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findByIdResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findBySequence -------------------------------------------------------

  get findBySequenceCall(): FindBySequenceCall | null {
    return this.#findBySequenceCall;
  }

  async findBySequence(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    versionSequence: VersionSequence,
  ): Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> {
    this.#findBySequenceCall = Object.freeze({ workspaceId, playbookId, versionSequence });

    switch (this.#findBySequenceResult.kind) {
      case 'playbookVersion': {
        return ok(this.#findBySequenceResult.playbookVersion);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findBySequenceResult.error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

interface PlaybookVersionFixtureOptions {
  readonly playbookVersionId: string;
  readonly playbookId: string;
  readonly versionSequence: number;
}

function createValidPlaybookVersion(
  options?: Partial<PlaybookVersionFixtureOptions>,
): PlaybookVersion {
  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000001';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdRaw = options?.playbookId ?? '00000000-0000-0000-0000-000000000003';
  const playbookIdResult = parsePlaybookId(playbookIdRaw);
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
    '00000000-0000-0000-0000-000000000004',
  );
  if (!synchronizationSnapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const versionSequenceRaw = options?.versionSequence ?? 1;
  const versionSequenceResult = VersionSequence.create(versionSequenceRaw);
  if (!versionSequenceResult.success) {
    throw new Error('Expected a valid version sequence fixture.');
  }

  const versionLabelResult = VersionLabel.create('v1.0');
  if (!versionLabelResult.success) {
    throw new Error('Expected a valid version label fixture.');
  }

  const parserVersionResult = ParserVersion.create('1.0.0');
  if (!parserVersionResult.success) {
    throw new Error('Expected a valid parser version fixture.');
  }

  const normalizationSchemaVersionResult = NormalizationSchemaVersion.create('1.0.0');
  if (!normalizationSchemaVersionResult.success) {
    throw new Error('Expected a valid normalization schema version fixture.');
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

  const playbookVersionResult = PlaybookVersion.create({
    playbookVersionId: playbookVersionIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    synchronizationSnapshotId: synchronizationSnapshotIdResult.value,
    versionSequence: versionSequenceResult.value,
    versionLabel: versionLabelResult.value,
    parserVersion: parserVersionResult.value,
    normalizationSchemaVersion: normalizationSchemaVersionResult.value,
    sourceContentChecksum: contentChecksumResult.value,
    createdAt: createdAtResult.value,
  });
  if (!playbookVersionResult.success) {
    throw new Error('Expected a valid playbook version fixture.');
  }

  return playbookVersionResult.value;
}

// ---------------------------------------------------------------------------
// Published version fixture
// ---------------------------------------------------------------------------

interface PublishedPlaybookVersionFixtureOptions {
  readonly playbookVersionId: string;
  readonly playbookId: string;
  readonly versionSequence: number;
  readonly synchronizationSnapshotId: string;
  readonly publishedAt: string;
}

function createPublishedPlaybookVersion(
  options?: Partial<PublishedPlaybookVersionFixtureOptions>,
): PlaybookVersion {
  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000001';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdRaw = options?.playbookId ?? '00000000-0000-0000-0000-000000000003';
  const playbookIdResult = parsePlaybookId(playbookIdRaw);
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const snapshotIdRaw =
    options?.synchronizationSnapshotId ?? '00000000-0000-0000-0000-000000000004';
  const snapshotIdResult = parseSynchronizationSnapshotId(snapshotIdRaw);
  if (!snapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const versionSequenceRaw = options?.versionSequence ?? 1;
  const versionSequenceResult = VersionSequence.create(versionSequenceRaw);
  if (!versionSequenceResult.success) {
    throw new Error('Expected a valid version sequence fixture.');
  }

  const versionLabelResult = VersionLabel.create('v1.0');
  if (!versionLabelResult.success) {
    throw new Error('Expected a valid version label fixture.');
  }

  const parserVersionResult = ParserVersion.create('1.0.0');
  if (!parserVersionResult.success) {
    throw new Error('Expected a valid parser version fixture.');
  }

  const normalizationSchemaVersionResult = NormalizationSchemaVersion.create('1.0.0');
  if (!normalizationSchemaVersionResult.success) {
    throw new Error('Expected a valid normalization schema version fixture.');
  }

  const contentChecksumResult = ContentChecksum.create(
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  );
  if (!contentChecksumResult.success) {
    throw new Error('Expected a valid content checksum fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T07:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const validationCompletedAtResult = Instant.parse('2026-07-15T09:00:00.000Z');
  if (!validationCompletedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const updatedAtResult = Instant.parse('2026-07-15T12:00:00.000Z');
  if (!updatedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const normalizationAttemptIdResult = parseNormalizationAttemptId(
    '00000000-0000-0000-0000-000000000010',
  );
  if (!normalizationAttemptIdResult.success) {
    throw new Error('Expected a valid normalization attempt ID fixture.');
  }

  const validationAttemptIdResult = parseValidationAttemptId(
    '00000000-0000-0000-0000-000000000020',
  );
  if (!validationAttemptIdResult.success) {
    throw new Error('Expected a valid validation attempt ID fixture.');
  }

  const validatorVersionResult = ValidatorVersion.create('validator/v1');
  if (!validatorVersionResult.success) {
    throw new Error('Expected a valid validator version fixture.');
  }

  const validationSummaryResult = ValidationSummary.create({
    validationAttemptId: validationAttemptIdResult.value,
    validatorVersion: validatorVersionResult.value,
    completedAt: validationCompletedAtResult.value,
    validatedContentChecksum: contentChecksumResult.value,
    errorCount: 0,
    warningCount: 0,
    informationCount: 0,
    blockingFindingCount: 0,
  });
  if (!validationSummaryResult.success) {
    throw new Error('Expected a valid validation summary fixture.');
  }

  const publishedAtRaw = options?.publishedAt ?? '2026-07-15T10:00:00.000Z';
  const publishedAtResult = Instant.parse(publishedAtRaw);
  if (!publishedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const restoreResult = PlaybookVersion.restore({
    playbookVersionId: playbookVersionIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    synchronizationSnapshotId: snapshotIdResult.value,
    versionSequence: versionSequenceResult.value,
    versionLabel: versionLabelResult.value,
    status: 'published',
    normalizationStatus: 'completed',
    parserVersion: parserVersionResult.value,
    normalizationSchemaVersion: normalizationSchemaVersionResult.value,
    sourceContentChecksum: contentChecksumResult.value,
    normalizationAttemptId: normalizationAttemptIdResult.value,
    validationSummary: validationSummaryResult.value,
    createdAt: createdAtResult.value,
    updatedAt: updatedAtResult.value,
    validationStartedAt: createdAtResult.value,
    validatedAt: validationCompletedAtResult.value,
    publishedAt: publishedAtResult.value,
    archivedAt: null,
  });
  if (!restoreResult.success) {
    throw new Error('Expected a valid published playbook version fixture.');
  }

  return restoreResult.value;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaybookVersionRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the PlaybookVersion instance', async () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository = StubPlaybookVersionRepository.returningPlaybookVersion(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersion.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookVersion);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookVersionRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the version belongs to a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookVersionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findById');
      const repository = StubPlaybookVersionRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookVersionId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository = StubPlaybookVersionRepository.returningPlaybookVersion(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pvId,
      ) => repository.findById(wsId, pvId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findBySequence
  // -------------------------------------------------------------------------

  describe('findBySequence — found', () => {
    it('returns a successful Result with the PlaybookVersion instance', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 2 });
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(2);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookVersion);
      expect(playbookVersion.versionSequence.value).toBe(2);
    });
  });

  describe('findBySequence — sequence not found', () => {
    it('returns a successful Result with null when the sequence does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(99);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — playbook not found', () => {
    it('returns a successful Result with null when the playbook does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        nonExistentPlaybookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceB.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — same sequence in different playbook', () => {
    it('returns a successful Result with null for a non-matching playbook', async () => {
      const repository = StubPlaybookVersionRepository.returningNoPlaybookVersionBySequence();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const otherPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!otherPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        otherPlaybookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySequence — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findBySequence');
      const repository = StubPlaybookVersionRepository.returningFindBySequenceError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(1);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findBySequence');
    });
  });

  describe('findBySequence — argument capture', () => {
    it('captures the workspaceId, playbookId, and versionSequence from the last call', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 3 });
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const versionSequenceResult = VersionSequence.create(3);
      if (!versionSequenceResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      await repository.findBySequence(
        workspaceId.value,
        playbookId.value,
        versionSequenceResult.value,
      );

      const call = repository.findBySequenceCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookId).toBe(playbookId.value);
      expect(call!.versionSequence).toBe(versionSequenceResult.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findBySequence — accepts typed IDs', () => {
    it('compiles with WorkspaceId, PlaybookId, and VersionSequence parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository =
        StubPlaybookVersionRepository.returningPlaybookVersionBySequence(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
        versionSequence: VersionSequence,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
        vs,
      ) => repository.findBySequence(wsId, pbId, vs);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findLatestByPlaybookId
  // -------------------------------------------------------------------------

  describe('findLatestByPlaybookId — found', () => {
    it('returns the version with the highest sequence', async () => {
      const seq1 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 1,
      });
      const seq2 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        versionSequence: 2,
      });
      const seq3 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000003',
        versionSequence: 3,
      });

      expect(seq1.playbookId).toBe(seq2.playbookId);
      expect(seq2.playbookId).toBe(seq3.playbookId);
      expect(seq3.playbookId).toBe(seq1.playbookId);
      expect(seq1.id).not.toBe(seq2.id);
      expect(seq2.id).not.toBe(seq3.id);

      const repository = StubPlaybookVersionRepository.returningLatestPlaybookVersion(seq3);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(seq3);
      expect(result.value).not.toBe(seq1);
      expect(result.value).not.toBe(seq2);
      expect(seq3.versionSequence.value).toBe(3);
    });
  });

  describe('findLatestByPlaybookId — no versions', () => {
    it('returns a successful Result with null when the playbook has no versions', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — playbook not found', () => {
    it('returns a successful Result with null when the playbook does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(
        workspaceId.value,
        nonExistentPlaybookId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubPlaybookVersionRepository.returningNoLatestPlaybookVersion();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookId — higher sequence in another playbook', () => {
    it('returns the latest version for the queried playbook, unaffected by other playbooks', async () => {
      const playbookAseq3 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        playbookId: '00000000-0000-0000-0000-00000000000a',
        versionSequence: 3,
      });
      const playbookBseq10 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        playbookId: '00000000-0000-0000-0000-00000000000b',
        versionSequence: 10,
      });

      expect(playbookAseq3.playbookId).not.toBe(playbookBseq10.playbookId);
      expect(playbookAseq3.versionSequence.value).toBe(3);
      expect(playbookBseq10.versionSequence.value).toBe(10);

      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookAseq3);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookAId = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!playbookAId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookAId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookAseq3);
      expect(result.value).not.toBe(playbookBseq10);
    });
  });

  describe('findLatestByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.findLatestByPlaybookId');
      const repository = StubPlaybookVersionRepository.returningFindLatestByPlaybookIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.findLatestByPlaybookId');
    });
  });

  describe('findLatestByPlaybookId — argument capture', () => {
    it('captures the workspaceId and playbookId from the last call', async () => {
      const playbookVersion = createValidPlaybookVersion({ versionSequence: 5 });
      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookVersion);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      const call = repository.findLatestByPlaybookIdCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookId).toBe(playbookId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestByPlaybookId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbookVersion = createValidPlaybookVersion();
      const repository =
        StubPlaybookVersionRepository.returningLatestPlaybookVersion(playbookVersion);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<PlaybookVersion | null, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
      ) => repository.findLatestByPlaybookId(wsId, pbId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // listByPlaybookId tests
  // -------------------------------------------------------------------------

  describe('listByPlaybookId — history with descending order', () => {
    it('returns versions in descending sequence order with an empty filter', async () => {
      const wsId = '00000000-0000-0000-0000-000000000002';
      const pbId = '00000000-0000-0000-0000-000000000003';

      const seq1 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        playbookId: pbId,
        versionSequence: 1,
      });
      const seq2 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        playbookId: pbId,
        versionSequence: 2,
      });
      const seq3 = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000003',
        playbookId: pbId,
        versionSequence: 3,
      });

      expect(seq1.playbookId).toBe(seq2.playbookId);
      expect(seq2.playbookId).toBe(seq3.playbookId);
      expect(seq1.workspaceId).toBe(seq2.workspaceId);
      expect(seq2.workspaceId).toBe(seq3.workspaceId);
      expect(seq1.id).not.toBe(seq2.id);
      expect(seq2.id).not.toBe(seq3.id);

      const filter: PlaybookVersionListFilter = Object.freeze({});
      const configuredPage: Page<PlaybookVersion> = {
        items: [seq3, seq2, seq1],
        offset: 0,
        limit: 3,
        hasMore: false,
        totalCount: 3,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
      const workspaceId = parseWorkspaceId(wsId);
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId(pbId);
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        playbookId.value,
        filter,
        Object.freeze({ offset: 0, limit: 3 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(3);
      expect(result.value.items[0]).toBe(seq3);
      expect(result.value.items[1]).toBe(seq2);
      expect(result.value.items[2]).toBe(seq1);

      for (const v of result.value.items) {
        expect(v.workspaceId).toBe(workspaceId.value);
        expect(v.playbookId).toBe(playbookId.value);
      }

      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(3);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(3);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — filter by status', () => {
    it('returns a page filtered by a specific status', async () => {
      const version = createValidPlaybookVersion();
      expect(version.status).toBe('draft');

      const filter: PlaybookVersionListFilter = Object.freeze({ status: 'draft' });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(version);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — inclusive lower sequence bound', () => {
    it('includes versions whose versionSequence equals versionSequenceFrom', async () => {
      const version = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 3,
      });

      const versionSequenceFromResult = VersionSequence.create(3);
      if (!versionSequenceFromResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      expect(version.versionSequence.compare(versionSequenceFromResult.value)).toBe(0);

      const filter: PlaybookVersionListFilter = Object.freeze({
        versionSequenceFrom: versionSequenceFromResult.value,
      });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(version);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookId — exclusive upper sequence bound', () => {
    it('excludes versions whose versionSequence equals versionSequenceTo', async () => {
      const version = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 8,
      });

      const versionSequenceToResult = VersionSequence.create(8);
      if (!versionSequenceToResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      expect(version.versionSequence.compare(versionSequenceToResult.value)).toBe(0);

      const filter: PlaybookVersionListFilter = Object.freeze({
        versionSequenceTo: versionSequenceToResult.value,
      });
      const repository = StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(
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
      void version;
    });
  });

  describe('listByPlaybookId — inclusive lower published bound', () => {
    it('includes published versions whose publishedAt equals publishedAtFrom', async () => {
      const version = createPublishedPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        publishedAt: '2026-07-15T10:00:00.000Z',
      });

      const publishedAtFromResult = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!publishedAtFromResult.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      expect(version.publishedAt).not.toBeNull();
      if (version.publishedAt === null) {
        throw new Error('Expected a published version fixture.');
      }
      expect(version.publishedAt.compare(publishedAtFromResult.value)).toBe(0);

      const filter: PlaybookVersionListFilter = Object.freeze({
        publishedAtFrom: publishedAtFromResult.value,
      });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(version);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookId — exclusive upper published bound', () => {
    it('excludes published versions whose publishedAt equals publishedAtTo', async () => {
      const version = createPublishedPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        publishedAt: '2026-07-15T10:00:00.000Z',
      });

      const publishedAtToResult = Instant.parse('2026-07-15T10:00:00.000Z');
      if (!publishedAtToResult.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      expect(version.publishedAt).not.toBeNull();
      if (version.publishedAt === null) {
        throw new Error('Expected a published version fixture.');
      }
      expect(version.publishedAt.compare(publishedAtToResult.value)).toBe(0);

      const filter: PlaybookVersionListFilter = Object.freeze({
        publishedAtTo: publishedAtToResult.value,
      });
      const repository = StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(
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
        filter,
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
      void version;
    });
  });

  describe('listByPlaybookId — excludes draft from published filter', () => {
    it('returns an empty page when a draft version has no publishedAt', async () => {
      const draftVersion = createValidPlaybookVersion();
      expect(draftVersion.publishedAt).toBeNull();

      const publishedAtFrom = Instant.parse('2026-07-15T00:00:00.000Z');
      if (!publishedAtFrom.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const filter: PlaybookVersionListFilter = Object.freeze({
        publishedAtFrom: publishedAtFrom.value,
      });
      const repository = StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(
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
      void draftVersion;
    });
  });

  describe('listByPlaybookId — filter by snapshot', () => {
    it('returns a page filtered by synchronizationSnapshotId', async () => {
      const version = createValidPlaybookVersion();
      const synchronizationSnapshotId = version.synchronizationSnapshotId;

      const filter: PlaybookVersionListFilter = Object.freeze({
        synchronizationSnapshotId,
      });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(version);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookId — combined filter', () => {
    it('returns a page when all filter fields match semantically', async () => {
      const versionSequenceFromResult = VersionSequence.create(3);
      if (!versionSequenceFromResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }
      const versionSequenceToResult = VersionSequence.create(8);
      if (!versionSequenceToResult.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }
      const publishedAtFromResult = Instant.parse('2026-07-15T00:00:00.000Z');
      if (!publishedAtFromResult.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const publishedAtToResult = Instant.parse('2026-07-16T00:00:00.000Z');
      if (!publishedAtToResult.success) {
        throw new Error('Expected a valid instant fixture.');
      }

      const version = createPublishedPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 5,
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000004',
        publishedAt: '2026-07-15T12:00:00.000Z',
      });

      expect(version.status).toBe('published');
      expect(
        version.versionSequence.compare(versionSequenceFromResult.value),
      ).toBeGreaterThanOrEqual(0);
      expect(version.versionSequence.compare(versionSequenceToResult.value)).toBeLessThan(0);
      expect(version.publishedAt).not.toBeNull();
      if (version.publishedAt === null) {
        throw new Error('Expected a published version fixture.');
      }
      expect(version.publishedAt.compare(publishedAtFromResult.value)).toBeGreaterThanOrEqual(0);
      expect(version.publishedAt.compare(publishedAtToResult.value)).toBeLessThan(0);

      const filter: PlaybookVersionListFilter = Object.freeze({
        status: 'published',
        versionSequenceFrom: versionSequenceFromResult.value,
        versionSequenceTo: versionSequenceToResult.value,
        publishedAtFrom: publishedAtFromResult.value,
        publishedAtTo: publishedAtToResult.value,
        synchronizationSnapshotId: version.synchronizationSnapshotId,
      });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 1,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        filter,
        Object.freeze({ offset: 0, limit: 1 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(version);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(1);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(1);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — empty page', () => {
    it('returns a frozen empty page when there are no versions', async () => {
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const filter: PlaybookVersionListFilter = Object.freeze({});
      const repository =
        StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(pagination);
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

  describe('listByPlaybookId — subsequent page', () => {
    it('preserves offset, limit, hasMore, and totalCount as configured', async () => {
      const version = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 5,
      });
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 25,
        limit: 25,
        hasMore: true,
        totalCount: 60,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        Object.freeze({}),
        Object.freeze({ offset: 25, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(version);
      expect(result.value.offset).toBe(25);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(true);
      expect(result.value.totalCount).toBe(60);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — preserves absent totalCount', () => {
    it('does not have totalCount when the configured page lacks it', async () => {
      const version = createValidPlaybookVersion();
      const configuredPage: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
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
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items[0]).toBe(version);
      expect('totalCount' in result.value).toBe(false);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — defensive copy', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const versionA = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 1,
      });
      const versionB = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        versionSequence: 2,
      });

      const configuredVersions: PlaybookVersion[] = [versionA];
      const configuredPage: Page<PlaybookVersion> = {
        items: configuredVersions,
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository =
        StubPlaybookVersionRepository.returningListByPlaybookIdPage(configuredPage);
      configuredVersions.push(versionB);

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
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]).toBe(versionA);
      expect(result.value.items).not.toContain(versionB);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value.items)).toBe(true);
    });
  });

  describe('listByPlaybookId — playbook does not exist', () => {
    it('returns a frozen empty page when the playbook does not exist', async () => {
      const repository = StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentPlaybookId = parsePlaybookId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentPlaybookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        nonExistentPlaybookId.value,
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

  describe('listByPlaybookId — wrong workspace', () => {
    it('returns a frozen empty page when the version belongs to a different workspace', async () => {
      const workspaceAResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceAResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceBResult = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceBResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      expect(workspaceAResult.value).not.toBe(workspaceBResult.value);

      const versionInWorkspaceA = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        versionSequence: 1,
      });

      expect(versionInWorkspaceA.workspaceId).toBe(workspaceAResult.value);
      expect(versionInWorkspaceA.workspaceId).not.toBe(workspaceBResult.value);

      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });
      const repository =
        StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(pagination);
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceBResult.value,
        playbookId.value,
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

  describe('listByPlaybookId — another playbook has versions', () => {
    it('returns a frozen empty page when only another playbook has versions', async () => {
      const queriedPlaybookIdResult = parsePlaybookId('00000000-0000-0000-0000-00000000000a');
      if (!queriedPlaybookIdResult.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const otherPlaybookIdResult = parsePlaybookId('00000000-0000-0000-0000-00000000000c');
      if (!otherPlaybookIdResult.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const otherVersion = createValidPlaybookVersion({
        playbookVersionId: '00000000-0000-0000-0000-000000000001',
        playbookId: '00000000-0000-0000-0000-00000000000c',
        versionSequence: 1,
      });

      expect(queriedPlaybookIdResult.value).not.toBe(otherPlaybookIdResult.value);
      expect(otherVersion.playbookId).toBe(otherPlaybookIdResult.value);
      expect(otherVersion.playbookId).not.toBe(queriedPlaybookIdResult.value);

      const repository = StubPlaybookVersionRepository.returningEmptyListByPlaybookIdPage(
        Object.freeze({ offset: 0, limit: 25 }),
      );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.listByPlaybookId(
        workspaceId.value,
        queriedPlaybookIdResult.value,
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

  describe('listByPlaybookId — independent from findById', () => {
    it('does not affect findById when listByPlaybookId is configured', async () => {
      const version = createValidPlaybookVersion();
      const page: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000001');
      if (!versionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, versionId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookId — independent from findBySequence', () => {
    it('does not affect findBySequence when listByPlaybookId is configured', async () => {
      const version = createValidPlaybookVersion();
      const page: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const vs = VersionSequence.create(1);
      if (!vs.success) {
        throw new Error('Expected a valid version sequence fixture.');
      }

      const result = await repository.findBySequence(workspaceId.value, playbookId.value, vs.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookId — independent from findLatestByPlaybookId', () => {
    it('does not affect findLatestByPlaybookId when listByPlaybookId is configured', async () => {
      const version = createValidPlaybookVersion();
      const page: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findLatestByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('listByPlaybookId — existing operation does not affect list', () => {
    it('returns a default empty page when only findById is configured', async () => {
      const version = createValidPlaybookVersion();
      const repository = StubPlaybookVersionRepository.returningPlaybookVersion(version);
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

  describe('listByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookVersion.listByPlaybookId');
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdError(error);
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
        Object.freeze({}),
        Object.freeze({ offset: 0, limit: 25 }),
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookVersion.listByPlaybookId');
    });
  });

  describe('listByPlaybookId — argument capture', () => {
    it('captures the workspaceId, playbookId, filter, and pagination', async () => {
      const version = createValidPlaybookVersion();
      const page: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdPage(page);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }
      const filter: PlaybookVersionListFilter = Object.freeze({ status: 'draft' });
      const pagination: PaginationRequest = Object.freeze({ offset: 0, limit: 25 });

      await repository.listByPlaybookId(workspaceId.value, playbookId.value, filter, pagination);

      const call = repository.listByPlaybookIdCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookId).toBe(playbookId.value);
      expect(call.filter).toBe(filter);
      expect(call.pagination).toBe(pagination);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listByPlaybookId — accepts typed arguments', () => {
    it('compiles with WorkspaceId, PlaybookId, PlaybookVersionListFilter, and PaginationRequest', () => {
      const version = createValidPlaybookVersion();
      const page: Page<PlaybookVersion> = {
        items: [version],
        offset: 0,
        limit: 25,
        hasMore: false,
        totalCount: 1,
      };
      const repository = StubPlaybookVersionRepository.returningListByPlaybookIdPage(page);

      const _acceptsTypedArguments: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
        filter: PlaybookVersionListFilter,
        pagination: PaginationRequest,
      ) => Promise<Result<Page<PlaybookVersion>, PersistenceOperationFailedError>> = (
        wsId,
        pbId,
        versionFilter,
        pageRequest,
      ) => repository.listByPlaybookId(wsId, pbId, versionFilter, pageRequest);

      void _acceptsTypedArguments;
    });
  });
});
