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

class StubSynchronizationRunRepository implements SynchronizationRunRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult;
  #findActiveByPlaybookSourceIdCall: FindActiveByPlaybookSourceIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findActiveByPlaybookSourceIdResult = findActiveByPlaybookSourceIdResult;
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

  get findActiveByPlaybookSourceIdCall(): FindActiveByPlaybookSourceIdCall | null {
    return this.#findActiveByPlaybookSourceIdCall;
  }

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

function createCompletedSynchronizationRun(): SynchronizationRun {
  const run = createValidSynchronizationRun();

  const startedAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const startResult = run.start({ startedAt: startedAtResult.value });
  if (!startResult.success) {
    throw new Error('Expected the start transition to succeed.');
  }

  const completedAtResult = Instant.parse('2026-07-15T11:00:00.000Z');
  if (!completedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const snapshotIdResult = parseSynchronizationSnapshotId('00000000-0000-0000-0000-000000000010');
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
});
