import { describe, expect, it } from 'vitest';

import type {
  PlaybookSourceId,
  SynchronizationRunId,
  SynchronizationSnapshotId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  ContentChecksum,
  Instant,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseSynchronizationSnapshotId,
  parseWorkspaceId,
  ParserCompatibilityVersion,
  SourceSchemaVersion,
  StorageReference,
  SynchronizationSnapshot,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { SynchronizationSnapshotRepository } from './synchronization-snapshot-repository.js';

type FindByIdStubResult =
  | {
      readonly kind: 'synchronizationSnapshot';
      readonly synchronizationSnapshot: SynchronizationSnapshot;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySynchronizationRunIdStubResult =
  | {
      readonly kind: 'synchronizationSnapshot';
      readonly synchronizationSnapshot: SynchronizationSnapshot;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindBySynchronizationRunIdCall = Readonly<{
  workspaceId: WorkspaceId;
  synchronizationRunId: SynchronizationRunId;
}>;

type FindLatestByPlaybookSourceIdStubResult =
  | {
      readonly kind: 'synchronizationSnapshot';
      readonly synchronizationSnapshot: SynchronizationSnapshot;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByPlaybookSourceIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
}>;

type FindLatestByChecksumStubResult =
  | {
      readonly kind: 'synchronizationSnapshot';
      readonly synchronizationSnapshot: SynchronizationSnapshot;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByChecksumCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
  contentChecksum: ContentChecksum;
}>;

class StubSynchronizationSnapshotRepository implements SynchronizationSnapshotRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySynchronizationRunIdResult: FindBySynchronizationRunIdStubResult;
  readonly #findLatestByPlaybookSourceIdResult: FindLatestByPlaybookSourceIdStubResult;
  readonly #findLatestByChecksumResult: FindLatestByChecksumStubResult;
  #findBySynchronizationRunIdCall: FindBySynchronizationRunIdCall | null = null;
  #findLatestByPlaybookSourceIdCall: FindLatestByPlaybookSourceIdCall | null = null;
  #findLatestByChecksumCall: FindLatestByChecksumCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySynchronizationRunIdResult: FindBySynchronizationRunIdStubResult = { kind: 'null' },
    findLatestByPlaybookSourceIdResult: FindLatestByPlaybookSourceIdStubResult = { kind: 'null' },
    findLatestByChecksumResult: FindLatestByChecksumStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySynchronizationRunIdResult = findBySynchronizationRunIdResult;
    this.#findLatestByPlaybookSourceIdResult = findLatestByPlaybookSourceIdResult;
    this.#findLatestByChecksumResult = findLatestByChecksumResult;
  }

  static returningSynchronizationSnapshot(
    synchronizationSnapshot: SynchronizationSnapshot,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository({
      kind: 'synchronizationSnapshot',
      synchronizationSnapshot,
    });
  }

  static returningNull(): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository({ kind: 'null' });
  }

  static returningError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository({ kind: 'error', error });
  }

  static returningSynchronizationSnapshotByRunId(
    synchronizationSnapshot: SynchronizationSnapshot,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'synchronizationSnapshot', synchronizationSnapshot },
    );
  }

  static returningNoSynchronizationSnapshotByRunId(): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindBySynchronizationRunIdError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository({ kind: 'null' }, { kind: 'error', error });
  }

  static returningLatestSynchronizationSnapshot(
    synchronizationSnapshot: SynchronizationSnapshot,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'synchronizationSnapshot', synchronizationSnapshot },
    );
  }

  static returningNoLatestSynchronizationSnapshot(): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  static returningFindLatestByPlaybookSourceIdError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- findLatestByChecksum factories ---------------------------------------

  static returningLatestSynchronizationSnapshotByChecksum(
    synchronizationSnapshot: SynchronizationSnapshot,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'synchronizationSnapshot', synchronizationSnapshot },
    );
  }

  static returningNoSynchronizationSnapshotByChecksum(): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
    );
  }

  static returningFindLatestByChecksumError(
    error: PersistenceOperationFailedError,
  ): StubSynchronizationSnapshotRepository {
    return new StubSynchronizationSnapshotRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  get findBySynchronizationRunIdCall(): FindBySynchronizationRunIdCall | null {
    return this.#findBySynchronizationRunIdCall;
  }

  async findById(
    _workspaceId: WorkspaceId,
    _synchronizationSnapshotId: SynchronizationSnapshotId,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'synchronizationSnapshot': {
        return ok(this.#findByIdResult.synchronizationSnapshot);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  async findBySynchronizationRunId(
    workspaceId: WorkspaceId,
    synchronizationRunId: SynchronizationRunId,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> {
    this.#findBySynchronizationRunIdCall = Object.freeze({
      workspaceId,
      synchronizationRunId,
    });

    switch (this.#findBySynchronizationRunIdResult.kind) {
      case 'synchronizationSnapshot': {
        return ok(this.#findBySynchronizationRunIdResult.synchronizationSnapshot);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findBySynchronizationRunIdResult.error);
      }
    }
  }

  get findLatestByPlaybookSourceIdCall(): FindLatestByPlaybookSourceIdCall | null {
    return this.#findLatestByPlaybookSourceIdCall;
  }

  async findLatestByPlaybookSourceId(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> {
    this.#findLatestByPlaybookSourceIdCall = Object.freeze({
      workspaceId,
      playbookSourceId,
    });

    switch (this.#findLatestByPlaybookSourceIdResult.kind) {
      case 'synchronizationSnapshot': {
        return ok(this.#findLatestByPlaybookSourceIdResult.synchronizationSnapshot);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestByPlaybookSourceIdResult.error);
      }
    }
  }

  // -- findLatestByChecksum ------------------------------------------------

  get findLatestByChecksumCall(): FindLatestByChecksumCall | null {
    return this.#findLatestByChecksumCall;
  }

  async findLatestByChecksum(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
    contentChecksum: ContentChecksum,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> {
    this.#findLatestByChecksumCall = Object.freeze({
      workspaceId,
      playbookSourceId,
      contentChecksum,
    });

    switch (this.#findLatestByChecksumResult.kind) {
      case 'synchronizationSnapshot': {
        return ok(this.#findLatestByChecksumResult.synchronizationSnapshot);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestByChecksumResult.error);
      }
    }
  }
}

interface SynchronizationSnapshotFixtureOptions {
  readonly synchronizationSnapshotId: string;
  readonly playbookSourceId: string;
  readonly synchronizationRunId: string;
  readonly contentChecksum: string;
  readonly createdAt: string;
  readonly storageReference: string;
}

function createValidSynchronizationSnapshot(
  options?: Partial<SynchronizationSnapshotFixtureOptions>,
): SynchronizationSnapshot {
  const snapshotId = options?.synchronizationSnapshotId ?? '00000000-0000-0000-0000-000000000001';
  const runId = options?.synchronizationRunId ?? '00000000-0000-0000-0000-000000000004';
  const createdAt = options?.createdAt ?? '2026-07-15T10:00:00.000Z';
  const storageRef = options?.storageReference ?? 'ss://path/to/snapshot';

  const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(snapshotId);
  if (!synchronizationSnapshotIdResult.success) {
    throw new Error('Expected a valid synchronization snapshot ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookSourceIdRaw = options?.playbookSourceId ?? '00000000-0000-0000-0000-000000000003';
  const playbookSourceIdResult = parsePlaybookSourceId(playbookSourceIdRaw);
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const synchronizationRunIdResult = parseSynchronizationRunId(runId);
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
  }

  const contentChecksumRaw =
    options?.contentChecksum ??
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const contentChecksumResult = ContentChecksum.create(contentChecksumRaw);
  if (!contentChecksumResult.success) {
    throw new Error('Expected a valid content checksum fixture.');
  }

  const storageReferenceResult = StorageReference.create(storageRef);
  if (!storageReferenceResult.success) {
    throw new Error('Expected a valid storage reference fixture.');
  }

  const sourceSchemaVersionResult = SourceSchemaVersion.create('1.0.0');
  if (!sourceSchemaVersionResult.success) {
    throw new Error('Expected a valid source schema version fixture.');
  }

  const parserCompatibilityVersionResult = ParserCompatibilityVersion.create('1.0.0');
  if (!parserCompatibilityVersionResult.success) {
    throw new Error('Expected a valid parser compatibility version fixture.');
  }

  const createdAtResult = Instant.parse(createdAt);
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  return SynchronizationSnapshot.create({
    synchronizationSnapshotId: synchronizationSnapshotIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookSourceId: playbookSourceIdResult.value,
    synchronizationRunId: synchronizationRunIdResult.value,
    contentChecksum: contentChecksumResult.value,
    storageReference: storageReferenceResult.value,
    storageFormat: 'json',
    sourceSchemaVersion: sourceSchemaVersionResult.value,
    parserCompatibilityVersion: parserCompatibilityVersionResult.value,
    createdAt: createdAtResult.value,
  });
}

describe('SynchronizationSnapshotRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the SynchronizationSnapshot instance', async () => {
      const synchronizationSnapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningSynchronizationSnapshot(
          synchronizationSnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationSnapshot.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(synchronizationSnapshot);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubSynchronizationSnapshotRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationSnapshotId = parseSynchronizationSnapshotId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationSnapshotId.success) {
        throw new Error('Expected a valid synchronization snapshot ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationSnapshotId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the snapshot belongs to a different workspace', async () => {
      const repository = StubSynchronizationSnapshotRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationSnapshotId = parseSynchronizationSnapshotId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationSnapshotId.success) {
        throw new Error('Expected a valid synchronization snapshot ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, synchronizationSnapshotId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationSnapshot.findById');
      const repository = StubSynchronizationSnapshotRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationSnapshotId = parseSynchronizationSnapshotId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!synchronizationSnapshotId.success) {
        throw new Error('Expected a valid synchronization snapshot ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, synchronizationSnapshotId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('synchronizationSnapshot.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and SynchronizationSnapshotId parameter types', () => {
      const synchronizationSnapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningSynchronizationSnapshot(
          synchronizationSnapshot,
        );

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        synchronizationSnapshotId: SynchronizationSnapshotId,
      ) => Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> = (
        wsId,
        ssId,
      ) => repository.findById(wsId, ssId);

      void _acceptsTypedIds;
    });
  });

  describe('findBySynchronizationRunId — found', () => {
    it('returns a successful Result with the SynchronizationSnapshot instance', async () => {
      const synchronizationSnapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningSynchronizationSnapshotByRunId(
          synchronizationSnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findBySynchronizationRunId(
        workspaceId.value,
        synchronizationSnapshot.synchronizationRunId,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(synchronizationSnapshot);
    });
  });

  describe('findBySynchronizationRunId — no snapshot for run', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByRunId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000004',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findBySynchronizationRunId(
        workspaceId.value,
        synchronizationRunId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySynchronizationRunId — run does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByRunId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000006',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findBySynchronizationRunId(
        workspaceId.value,
        synchronizationRunId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySynchronizationRunId — wrong workspace', () => {
    it('returns a successful Result with null when the run belongs to a different workspace', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByRunId();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000004',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findBySynchronizationRunId(
        workspaceB.value,
        synchronizationRunId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findBySynchronizationRunId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed(
        'synchronizationSnapshot.findBySynchronizationRunId',
      );
      const repository =
        StubSynchronizationSnapshotRepository.returningFindBySynchronizationRunIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000004',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      const result = await repository.findBySynchronizationRunId(
        workspaceId.value,
        synchronizationRunId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe(
        'synchronizationSnapshot.findBySynchronizationRunId',
      );
    });
  });

  describe('findBySynchronizationRunId — captures arguments', () => {
    it('captures the exact workspaceId and synchronizationRunId', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByRunId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const synchronizationRunId = parseSynchronizationRunId(
        '00000000-0000-0000-0000-000000000004',
      );
      if (!synchronizationRunId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }

      await repository.findBySynchronizationRunId(workspaceId.value, synchronizationRunId.value);

      const call = repository.findBySynchronizationRunIdCall;
      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.synchronizationRunId).toBe(synchronizationRunId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findBySynchronizationRunId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and SynchronizationRunId parameter types', () => {
      const synchronizationSnapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningSynchronizationSnapshotByRunId(
          synchronizationSnapshot,
        );

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        synchronizationRunId: SynchronizationRunId,
      ) => Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> = (
        wsId,
        srId,
      ) => repository.findBySynchronizationRunId(wsId, srId);

      void _acceptsTypedIds;
    });
  });

  describe('findLatestByPlaybookSourceId — found', () => {
    it('returns the latest SynchronizationSnapshot for the source', async () => {
      const olderSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000001',
        synchronizationRunId: '00000000-0000-0000-0000-000000000004',
        createdAt: '2026-07-15T10:00:00.000Z',
        storageReference: 'ss://path/to/older-snapshot',
      });

      const latestSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000006',
        synchronizationRunId: '00000000-0000-0000-0000-000000000005',
        createdAt: '2026-07-15T11:00:00.000Z',
        storageReference: 'ss://path/to/latest-snapshot',
      });

      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshot(
          latestSnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findLatestByPlaybookSourceId(
        workspaceId.value,
        latestSnapshot.playbookSourceId,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(latestSnapshot);
      expect(result.value).not.toBe(olderSnapshot);

      expect(olderSnapshot.id).not.toBe(latestSnapshot.id);
      expect(olderSnapshot.synchronizationRunId).not.toBe(latestSnapshot.synchronizationRunId);
      expect(olderSnapshot.playbookSourceId).toBe(latestSnapshot.playbookSourceId);
      expect(olderSnapshot.createdAt.compare(latestSnapshot.createdAt)).toBe(-1);
    });
  });

  describe('findLatestByPlaybookSourceId — no snapshots', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoLatestSynchronizationSnapshot();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestByPlaybookSourceId(
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

  describe('findLatestByPlaybookSourceId — source does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoLatestSynchronizationSnapshot();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000006');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestByPlaybookSourceId(
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

  describe('findLatestByPlaybookSourceId — wrong workspace', () => {
    it('returns a successful Result with null when the source belongs to a different workspace', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoLatestSynchronizationSnapshot();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestByPlaybookSourceId(
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

  describe('findLatestByPlaybookSourceId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed(
        'synchronizationSnapshot.findLatestByPlaybookSourceId',
      );
      const repository =
        StubSynchronizationSnapshotRepository.returningFindLatestByPlaybookSourceIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestByPlaybookSourceId(
        workspaceId.value,
        playbookSourceId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe(
        'synchronizationSnapshot.findLatestByPlaybookSourceId',
      );
    });
  });

  describe('findLatestByPlaybookSourceId — captures arguments', () => {
    it('captures the exact workspaceId and playbookSourceId', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoLatestSynchronizationSnapshot();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      await repository.findLatestByPlaybookSourceId(workspaceId.value, playbookSourceId.value);

      const call = repository.findLatestByPlaybookSourceIdCall;
      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookSourceId).toBe(playbookSourceId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestByPlaybookSourceId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookSourceId parameter types', () => {
      const synchronizationSnapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshot(
          synchronizationSnapshot,
        );

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
      ) => Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> = (
        wsId,
        psId,
      ) => repository.findLatestByPlaybookSourceId(wsId, psId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findLatestByChecksum
  // -------------------------------------------------------------------------

  describe('findLatestByChecksum — found', () => {
    it('returns the latest SynchronizationSnapshot with the matching checksum for the source', async () => {
      const olderSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000001',
        synchronizationRunId: '00000000-0000-0000-0000-000000000004',
        contentChecksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAt: '2026-07-15T10:00:00.000Z',
        storageReference: 'ss://path/to/older',
      });
      const latestSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000006',
        synchronizationRunId: '00000000-0000-0000-0000-000000000005',
        contentChecksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAt: '2026-07-15T11:00:00.000Z',
        storageReference: 'ss://path/to/latest',
      });

      expect(olderSnapshot.id).not.toBe(latestSnapshot.id);
      expect(olderSnapshot.synchronizationRunId).not.toBe(latestSnapshot.synchronizationRunId);
      expect(olderSnapshot.contentChecksum.equals(latestSnapshot.contentChecksum)).toBe(true);
      expect(latestSnapshot.createdAt.compare(olderSnapshot.createdAt)).toBeGreaterThan(0);

      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          latestSnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      if (result.value === null) {
        throw new Error('Expected a SynchronizationSnapshot.');
      }

      expect(result.value).toBe(latestSnapshot);
      expect(result.value).not.toBe(olderSnapshot);
      expect(result.value.playbookSourceId).toBe(playbookSourceId.value);
      expect(result.value.contentChecksum.equals(checksumResult.value)).toBe(true);
    });
  });

  describe('findLatestByChecksum — no snapshots', () => {
    it('returns a successful Result with null when no snapshots exist', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByChecksum();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByChecksum — checksum not found', () => {
    it('returns null when no snapshot has the requested checksum', async () => {
      const existingChecksum = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!existingChecksum.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }
      const requestedChecksum = ContentChecksum.create(
        'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      );
      if (!requestedChecksum.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      expect(existingChecksum.value.equals(requestedChecksum.value)).toBe(false);

      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByChecksum();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        requestedChecksum.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByChecksum — source does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByChecksum();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        nonExistentSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByChecksum — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository =
        StubSynchronizationSnapshotRepository.returningNoSynchronizationSnapshotByChecksum();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000005');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceB.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByChecksum — same checksum in another source', () => {
    it('returns only the snapshot for the queried source', async () => {
      const sourceASnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000001',
        playbookSourceId: '00000000-0000-0000-0000-00000000000a',
        contentChecksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAt: '2026-07-15T10:00:00.000Z',
      });
      const newerSourceBSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000002',
        playbookSourceId: '00000000-0000-0000-0000-00000000000b',
        contentChecksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAt: '2026-07-15T12:00:00.000Z',
      });

      expect(sourceASnapshot.contentChecksum.equals(newerSourceBSnapshot.contentChecksum)).toBe(
        true,
      );
      expect(sourceASnapshot.playbookSourceId).not.toBe(newerSourceBSnapshot.playbookSourceId);
      expect(newerSourceBSnapshot.createdAt.compare(sourceASnapshot.createdAt)).toBeGreaterThan(0);

      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          sourceASnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const sourceAId = parsePlaybookSourceId('00000000-0000-0000-0000-00000000000a');
      if (!sourceAId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        sourceAId.value,
        checksumResult.value,
      );

      if (!result.success) {
        return;
      }
      if (result.value === null) {
        throw new Error('Expected a SynchronizationSnapshot.');
      }

      expect(result.value).toBe(sourceASnapshot);
      expect(result.value).not.toBe(newerSourceBSnapshot);
      expect(result.value.playbookSourceId).toBe(sourceAId.value);
    });
  });

  describe('findLatestByChecksum — different checksum, more recent in same source', () => {
    it('returns the snapshot matching the requested checksum, not the most recent overall', async () => {
      const matchingSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000001',
        synchronizationRunId: '00000000-0000-0000-0000-000000000004',
        contentChecksum: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        storageReference: 'ss://path/to/matching',
        createdAt: '2026-07-15T10:00:00.000Z',
      });
      const newerDifferentChecksumSnapshot = createValidSynchronizationSnapshot({
        synchronizationSnapshotId: '00000000-0000-0000-0000-000000000006',
        synchronizationRunId: '00000000-0000-0000-0000-000000000005',
        contentChecksum: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        storageReference: 'ss://path/to/newer-different',
        createdAt: '2026-07-15T12:00:00.000Z',
      });

      expect(matchingSnapshot.playbookSourceId).toBe(
        newerDifferentChecksumSnapshot.playbookSourceId,
      );
      expect(
        matchingSnapshot.contentChecksum.equals(newerDifferentChecksumSnapshot.contentChecksum),
      ).toBe(false);
      expect(
        newerDifferentChecksumSnapshot.createdAt.compare(matchingSnapshot.createdAt),
      ).toBeGreaterThan(0);
      expect(matchingSnapshot.id).not.toBe(newerDifferentChecksumSnapshot.id);
      expect(matchingSnapshot.synchronizationRunId).not.toBe(
        newerDifferentChecksumSnapshot.synchronizationRunId,
      );
      expect(matchingSnapshot.storageReference.toString()).not.toBe(
        newerDifferentChecksumSnapshot.storageReference.toString(),
      );

      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          matchingSnapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }
      if (result.value === null) {
        throw new Error('Expected a SynchronizationSnapshot.');
      }

      expect(result.value).toBe(matchingSnapshot);
      expect(result.value).not.toBe(newerDifferentChecksumSnapshot);
      expect(result.value.contentChecksum.equals(matchingSnapshot.contentChecksum)).toBe(true);
      expect(
        result.value.contentChecksum.equals(newerDifferentChecksumSnapshot.contentChecksum),
      ).toBe(false);
    });
  });

  describe('findLatestByChecksum — independence from other operations', () => {
    it('does not affect the default null results of the other three operations', async () => {
      const snapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          snapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const snapshotId = parseSynchronizationSnapshotId('00000000-0000-0000-0000-000000000001');
      if (!snapshotId.success) {
        throw new Error('Expected a valid synchronization snapshot ID fixture.');
      }
      const runId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000004');
      if (!runId.success) {
        throw new Error('Expected a valid synchronization run ID fixture.');
      }
      const sourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!sourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const findByIdResult = await repository.findById(workspaceId.value, snapshotId.value);
      const findByRunIdResult = await repository.findBySynchronizationRunId(
        workspaceId.value,
        runId.value,
      );
      const findLatestBySourceResult = await repository.findLatestByPlaybookSourceId(
        workspaceId.value,
        sourceId.value,
      );

      expect(findByIdResult.success).toBe(true);
      if (!findByIdResult.success) {
        return;
      }
      expect(findByIdResult.value).toBeNull();

      expect(findByRunIdResult.success).toBe(true);
      if (!findByRunIdResult.success) {
        return;
      }
      expect(findByRunIdResult.value).toBeNull();

      expect(findLatestBySourceResult.success).toBe(true);
      if (!findLatestBySourceResult.success) {
        return;
      }
      expect(findLatestBySourceResult.value).toBeNull();
    });
  });

  describe('findLatestByChecksum — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('synchronizationSnapshot.findLatestByChecksum');
      const repository =
        StubSynchronizationSnapshotRepository.returningFindLatestByChecksumError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      const result = await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error).toBe(error);
      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('synchronizationSnapshot.findLatestByChecksum');
    });
  });

  describe('findLatestByChecksum — argument capture', () => {
    it('captures the workspaceId, playbookSourceId, and contentChecksum from the last call', async () => {
      const snapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          snapshot,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }
      const checksumResult = ContentChecksum.create(
        'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      );
      if (!checksumResult.success) {
        throw new Error('Expected a valid content checksum fixture.');
      }

      await repository.findLatestByChecksum(
        workspaceId.value,
        playbookSourceId.value,
        checksumResult.value,
      );

      const call = repository.findLatestByChecksumCall;

      expect(call).not.toBeNull();

      if (call === null) {
        throw new Error('Expected the repository call to be captured.');
      }

      expect(call.workspaceId).toBe(workspaceId.value);
      expect(call.playbookSourceId).toBe(playbookSourceId.value);
      expect(call.contentChecksum).toBe(checksumResult.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestByChecksum — accepts typed values', () => {
    it('compiles with WorkspaceId, PlaybookSourceId, and ContentChecksum parameter types', () => {
      const snapshot = createValidSynchronizationSnapshot();
      const repository =
        StubSynchronizationSnapshotRepository.returningLatestSynchronizationSnapshotByChecksum(
          snapshot,
        );

      const _acceptsTypedValues: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
        contentChecksum: ContentChecksum,
      ) => Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> = (
        wsId,
        psId,
        checksum,
      ) => repository.findLatestByChecksum(wsId, psId, checksum);

      void _acceptsTypedValues;
    });
  });
});
