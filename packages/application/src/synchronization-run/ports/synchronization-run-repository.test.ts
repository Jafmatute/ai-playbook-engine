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

type FindLatestCompletedByPlaybookSourceIdStubResult =
  | { readonly kind: 'synchronizationRun'; readonly synchronizationRun: SynchronizationRun }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestCompletedByPlaybookSourceIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookSourceId: PlaybookSourceId;
}>;

class StubSynchronizationRunRepository implements SynchronizationRunRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult;
  readonly #findLatestCompletedResult: FindLatestCompletedByPlaybookSourceIdStubResult;
  #findActiveByPlaybookSourceIdCall: FindActiveByPlaybookSourceIdCall | null = null;
  #findLatestCompletedCall: FindLatestCompletedByPlaybookSourceIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findActiveByPlaybookSourceIdResult: FindActiveByPlaybookSourceIdStubResult = { kind: 'null' },
    findLatestCompletedResult: FindLatestCompletedByPlaybookSourceIdStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findActiveByPlaybookSourceIdResult = findActiveByPlaybookSourceIdResult;
    this.#findLatestCompletedResult = findLatestCompletedResult;
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

  // -- findLatestCompletedByPlaybookSourceId ---------------------------------

  get findLatestCompletedCall(): FindLatestCompletedByPlaybookSourceIdCall | null {
    return this.#findLatestCompletedCall;
  }

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
});
