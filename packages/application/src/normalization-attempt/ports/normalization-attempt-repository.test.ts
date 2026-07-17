import { describe, expect, it } from 'vitest';

import type {
  NormalizationAttemptId,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  Instant,
  NormalizationAttempt,
  parseNormalizationAttemptId,
  parsePlaybookVersionId,
  parseWorkspaceId,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { NormalizationAttemptRepository } from './normalization-attempt-repository.js';

// ---------------------------------------------------------------------------
// Stub result types
// ---------------------------------------------------------------------------

type FindByIdStubResult =
  | {
      readonly kind: 'normalizationAttempt';
      readonly normalizationAttempt: NormalizationAttempt;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByPlaybookVersionIdStubResult =
  | {
      readonly kind: 'normalizationAttempt';
      readonly normalizationAttempt: NormalizationAttempt;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindLatestByPlaybookVersionIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
}>;

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubNormalizationAttemptRepository implements NormalizationAttemptRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findLatestResult: FindLatestByPlaybookVersionIdStubResult;
  #findLatestCall: FindLatestByPlaybookVersionIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findLatestResult: FindLatestByPlaybookVersionIdStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findLatestResult = findLatestResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningNormalizationAttempt(
    normalizationAttempt: NormalizationAttempt,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'normalizationAttempt', normalizationAttempt },
      { kind: 'null' },
    );
  }

  static returningNull(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'error', error }, { kind: 'null' });
  }

  // -- findLatestByPlaybookVersionId factories ------------------------------

  static returningLatestNormalizationAttempt(
    normalizationAttempt: NormalizationAttempt,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'normalizationAttempt', normalizationAttempt },
    );
  }

  static returningNoLatestNormalizationAttempt(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindLatestByPlaybookVersionIdError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'null' }, { kind: 'error', error });
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _normalizationAttemptId: NormalizationAttemptId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'normalizationAttempt': {
        return ok(this.#findByIdResult.normalizationAttempt);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findLatestByPlaybookVersionId ----------------------------------------

  get findLatestCall(): FindLatestByPlaybookVersionIdCall | null {
    return this.#findLatestCall;
  }

  async findLatestByPlaybookVersionId(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>> {
    this.#findLatestCall = Object.freeze({ workspaceId, playbookVersionId });

    switch (this.#findLatestResult.kind) {
      case 'normalizationAttempt': {
        return ok(this.#findLatestResult.normalizationAttempt);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findLatestResult.error);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

interface NormalizationAttemptFixtureOptions {
  readonly normalizationAttemptId: string;
  readonly playbookVersionId: string;
  readonly startedAt: string;
}

function createValidNormalizationAttempt(
  options?: Partial<NormalizationAttemptFixtureOptions>,
): NormalizationAttempt {
  const normalizationAttemptIdRaw =
    options?.normalizationAttemptId ?? '00000000-0000-0000-0000-000000000001';
  const normalizationAttemptIdResult = parseNormalizationAttemptId(normalizationAttemptIdRaw);
  if (!normalizationAttemptIdResult.success) {
    throw new Error('Expected a valid normalization attempt ID fixture.');
  }

  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000002';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const startedAtRaw = options?.startedAt ?? '2026-07-15T10:00:00.000Z';
  const startedAtResult = Instant.parse(startedAtRaw);
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const result = NormalizationAttempt.create({
    normalizationAttemptId: normalizationAttemptIdResult.value,
    playbookVersionId: playbookVersionIdResult.value,
    startedAt: startedAtResult.value,
  });
  if (!result.success) {
    throw new Error('Expected a valid normalization attempt fixture.');
  }

  return result.value;
}

describe('NormalizationAttemptRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the NormalizationAttempt instance', async () => {
      const normalizationAttempt = createValidNormalizationAttempt();
      const repository =
        StubNormalizationAttemptRepository.returningNormalizationAttempt(normalizationAttempt);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, normalizationAttempt.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(normalizationAttempt);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubNormalizationAttemptRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const normalizationAttemptId = parseNormalizationAttemptId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!normalizationAttemptId.success) {
        throw new Error('Expected a valid normalization attempt ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, normalizationAttemptId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the attempt belongs to a different workspace', async () => {
      const repository = StubNormalizationAttemptRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const normalizationAttemptId = parseNormalizationAttemptId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!normalizationAttemptId.success) {
        throw new Error('Expected a valid normalization attempt ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, normalizationAttemptId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('normalizationAttempt.findById');
      const repository = StubNormalizationAttemptRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const normalizationAttemptId = parseNormalizationAttemptId(
        '00000000-0000-0000-0000-000000000001',
      );
      if (!normalizationAttemptId.success) {
        throw new Error('Expected a valid normalization attempt ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, normalizationAttemptId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('normalizationAttempt.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and NormalizationAttemptId parameter types', () => {
      const normalizationAttempt = createValidNormalizationAttempt();
      const repository =
        StubNormalizationAttemptRepository.returningNormalizationAttempt(normalizationAttempt);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        normalizationAttemptId: NormalizationAttemptId,
      ) => Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>> = (
        wsId,
        naId,
      ) => repository.findById(wsId, naId);

      void _acceptsTypedIds;
    });
  });

  // -------------------------------------------------------------------------
  // findLatestByPlaybookVersionId
  // -------------------------------------------------------------------------

  describe('findLatestByPlaybookVersionId — found', () => {
    it('returns the most recent NormalizationAttempt for the version', async () => {
      const olderAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const latestAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000005',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T11:00:00.000Z',
      });

      expect(olderAttempt.playbookVersionId).toBe(latestAttempt.playbookVersionId);
      expect(olderAttempt.id).not.toBe(latestAttempt.id);
      expect(olderAttempt.startedAt.compare(latestAttempt.startedAt)).toBe(-1);

      const repository =
        StubNormalizationAttemptRepository.returningLatestNormalizationAttempt(latestAttempt);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(latestAttempt);
      expect(result.value).not.toBe(olderAttempt);
    });
  });

  describe('findLatestByPlaybookVersionId — no attempts', () => {
    it('returns a successful Result with null when the version has no attempts', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoLatestNormalizationAttempt();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookVersionId — version not found', () => {
    it('returns a successful Result with null when the playbook version does not exist', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoLatestNormalizationAttempt();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        nonExistentVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookVersionId — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoLatestNormalizationAttempt();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceB.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findLatestByPlaybookVersionId — newer attempt in another version', () => {
    it('returns the latest attempt for the queried version, unaffected by other versions', async () => {
      const versionAlatest = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const versionBnewer = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-00000000000b',
        startedAt: '2026-07-15T12:00:00.000Z',
      });

      expect(versionAlatest.playbookVersionId).not.toBe(versionBnewer.playbookVersionId);

      const repository =
        StubNormalizationAttemptRepository.returningLatestNormalizationAttempt(versionAlatest);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionAId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!versionAId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        versionAId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(versionAlatest);
      expect(result.value).not.toBe(versionBnewer);
    });
  });

  describe('findLatestByPlaybookVersionId — latest is terminal', () => {
    it('returns the most recent attempt even when it is completed', async () => {
      const olderAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const completedAt = Instant.parse('2026-07-15T10:30:00.000Z');
      if (!completedAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const completeResult = olderAttempt.complete({ completedAt: completedAt.value });
      expect(completeResult.success).toBe(true);

      const latestAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000005',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T11:00:00.000Z',
      });
      const laterCompletedAt = Instant.parse('2026-07-15T11:30:00.000Z');
      if (!laterCompletedAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      const latestCompleteResult = latestAttempt.complete({ completedAt: laterCompletedAt.value });
      expect(latestCompleteResult.success).toBe(true);

      expect(latestAttempt.status).toBe('completed');

      const repository =
        StubNormalizationAttemptRepository.returningLatestNormalizationAttempt(latestAttempt);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(latestAttempt);
      expect(latestAttempt.status).toBe('completed');
    });
  });

  describe('findLatestByPlaybookVersionId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed(
        'normalizationAttempt.findLatestByPlaybookVersionId',
      );
      const repository =
        StubNormalizationAttemptRepository.returningFindLatestByPlaybookVersionIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findLatestByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe(
        'normalizationAttempt.findLatestByPlaybookVersionId',
      );
    });
  });

  describe('findLatestByPlaybookVersionId — argument capture', () => {
    it('captures the workspaceId and playbookVersionId from the last call', async () => {
      const normalizationAttempt = createValidNormalizationAttempt();
      const repository =
        StubNormalizationAttemptRepository.returningLatestNormalizationAttempt(
          normalizationAttempt,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      await repository.findLatestByPlaybookVersionId(workspaceId.value, playbookVersionId.value);

      const call = repository.findLatestCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookVersionId).toBe(playbookVersionId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findLatestByPlaybookVersionId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const normalizationAttempt = createValidNormalizationAttempt();
      const repository =
        StubNormalizationAttemptRepository.returningLatestNormalizationAttempt(
          normalizationAttempt,
        );

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>> = (
        wsId,
        pvId,
      ) => repository.findLatestByPlaybookVersionId(wsId, pvId);

      void _acceptsTypedIds;
    });
  });
});
