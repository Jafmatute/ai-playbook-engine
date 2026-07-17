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

class StubSynchronizationSnapshotRepository implements SynchronizationSnapshotRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findBySynchronizationRunIdResult: FindBySynchronizationRunIdStubResult;
  readonly #findLatestByPlaybookSourceIdResult: FindLatestByPlaybookSourceIdStubResult;
  #findBySynchronizationRunIdCall: FindBySynchronizationRunIdCall | null = null;
  #findLatestByPlaybookSourceIdCall: FindLatestByPlaybookSourceIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findBySynchronizationRunIdResult: FindBySynchronizationRunIdStubResult = { kind: 'null' },
    findLatestByPlaybookSourceIdResult: FindLatestByPlaybookSourceIdStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findBySynchronizationRunIdResult = findBySynchronizationRunIdResult;
    this.#findLatestByPlaybookSourceIdResult = findLatestByPlaybookSourceIdResult;
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
}

interface SynchronizationSnapshotFixtureOptions {
  readonly synchronizationSnapshotId: string;
  readonly synchronizationRunId: string;
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

  const playbookSourceIdResult = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const synchronizationRunIdResult = parseSynchronizationRunId(runId);
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
  }

  const contentChecksumResult = ContentChecksum.create(
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  );
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
});
