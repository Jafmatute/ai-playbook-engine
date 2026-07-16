import { describe, expect, it } from 'vitest';

import type { SynchronizationSnapshotId, WorkspaceId } from '@ai-playbook-engine/core';
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

class StubSynchronizationSnapshotRepository implements SynchronizationSnapshotRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
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

  async findById(
    _workspaceId: WorkspaceId,
    _synchronizationSnapshotId: SynchronizationSnapshotId,
  ): Promise<Result<SynchronizationSnapshot | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'synchronizationSnapshot': {
        return ok(this.#result.synchronizationSnapshot);
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

function createValidSynchronizationSnapshot(): SynchronizationSnapshot {
  const synchronizationSnapshotIdResult = parseSynchronizationSnapshotId(
    '00000000-0000-0000-0000-000000000001',
  );
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

  const synchronizationRunIdResult = parseSynchronizationRunId(
    '00000000-0000-0000-0000-000000000004',
  );
  if (!synchronizationRunIdResult.success) {
    throw new Error('Expected a valid synchronization run ID fixture.');
  }

  const contentChecksumResult = ContentChecksum.create(
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  );
  if (!contentChecksumResult.success) {
    throw new Error('Expected a valid content checksum fixture.');
  }

  const storageReferenceResult = StorageReference.create('ss://path/to/snapshot');
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

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
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
});
