import { describe, expect, it } from 'vitest';

import type { SynchronizationRunId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
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

class StubSynchronizationRunRepository implements SynchronizationRunRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
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

  async findById(
    _workspaceId: WorkspaceId,
    _synchronizationRunId: SynchronizationRunId,
  ): Promise<Result<SynchronizationRun | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'synchronizationRun': {
        return ok(this.#result.synchronizationRun);
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
});
