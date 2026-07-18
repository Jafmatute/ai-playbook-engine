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

type ListByPlaybookVersionIdStubResult =
  | {
      readonly kind: 'normalizationAttempts';
      readonly normalizationAttempts: readonly NormalizationAttempt[];
    }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type ListByPlaybookVersionIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
}>;

// ---------------------------------------------------------------------------
// Stub
// ---------------------------------------------------------------------------

class StubNormalizationAttemptRepository implements NormalizationAttemptRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findLatestResult: FindLatestByPlaybookVersionIdStubResult;
  readonly #listResult: ListByPlaybookVersionIdStubResult;
  #findLatestCall: FindLatestByPlaybookVersionIdCall | null = null;
  #listCall: ListByPlaybookVersionIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findLatestResult: FindLatestByPlaybookVersionIdStubResult,
    listResult: ListByPlaybookVersionIdStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findLatestResult = findLatestResult;
    this.#listResult = listResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningNormalizationAttempt(
    normalizationAttempt: NormalizationAttempt,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'normalizationAttempt', normalizationAttempt },
      { kind: 'null' },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  static returningNull(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  static returningError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'error', error },
      { kind: 'null' },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  // -- findLatestByPlaybookVersionId factories ------------------------------

  static returningLatestNormalizationAttempt(
    normalizationAttempt: NormalizationAttempt,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'normalizationAttempt', normalizationAttempt },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  static returningNoLatestNormalizationAttempt(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  static returningFindLatestByPlaybookVersionIdError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'error', error },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  // -- listByPlaybookVersionId factories ------------------------------------

  static returningNormalizationAttempts(
    normalizationAttempts: readonly NormalizationAttempt[],
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'null' },
      {
        kind: 'normalizationAttempts',
        normalizationAttempts: Object.freeze([...normalizationAttempts]),
      },
    );
  }

  static returningNoNormalizationAttempts(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'normalizationAttempts', normalizationAttempts: Object.freeze([]) },
    );
  }

  static returningListByPlaybookVersionIdError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository(
      { kind: 'null' },
      { kind: 'null' },
      { kind: 'error', error },
    );
  }

  // -- listByPlaybookVersionId ---------------------------------------------

  get listCall(): ListByPlaybookVersionIdCall | null {
    return this.#listCall;
  }

  async listByPlaybookVersionId(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<readonly NormalizationAttempt[], PersistenceOperationFailedError>> {
    this.#listCall = Object.freeze({ workspaceId, playbookVersionId });

    switch (this.#listResult.kind) {
      case 'normalizationAttempts': {
        return ok(this.#listResult.normalizationAttempts);
      }
      case 'error': {
        return err(this.#listResult.error);
      }
    }
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

  // -------------------------------------------------------------------------
  // listByPlaybookVersionId
  // -------------------------------------------------------------------------

  describe('listByPlaybookVersionId — history found', () => {
    it('returns all attempts ordered by startedAt ascending', async () => {
      const attempt1 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const attempt2 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T11:00:00.000Z',
      });
      const attempt3 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000003',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T12:00:00.000Z',
      });

      expect(attempt1.playbookVersionId).toBe(attempt2.playbookVersionId);
      expect(attempt2.playbookVersionId).toBe(attempt3.playbookVersionId);
      expect(attempt1.id).not.toBe(attempt2.id);
      expect(attempt2.id).not.toBe(attempt3.id);
      expect(attempt1.startedAt.compare(attempt2.startedAt)).toBe(-1);
      expect(attempt2.startedAt.compare(attempt3.startedAt)).toBe(-1);

      const repository = StubNormalizationAttemptRepository.returningNormalizationAttempts([
        attempt1,
        attempt2,
        attempt3,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(3);
      expect(result.value[0]).toBe(attempt1);
      expect(result.value[1]).toBe(attempt2);
      expect(result.value[2]).toBe(attempt3);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookVersionId — no attempts', () => {
    it('returns an empty frozen array when the version has no attempts', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoNormalizationAttempts();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookVersionId — default empty result from other factory is frozen', () => {
    it('returns a frozen empty array when using a factory from another operation', async () => {
      const repository = StubNormalizationAttemptRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
      expect(Object.isFrozen(result.value)).toBe(true);
    });
  });

  describe('listByPlaybookVersionId — version not found', () => {
    it('returns an empty array when the playbook version does not exist', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoNormalizationAttempts();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        nonExistentVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
    });
  });

  describe('listByPlaybookVersionId — wrong workspace', () => {
    it('returns an empty array when queried from a different workspace', async () => {
      const repository = StubNormalizationAttemptRepository.returningNoNormalizationAttempts();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceB.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(0);
    });
  });

  describe('listByPlaybookVersionId — attempts from another version', () => {
    it('returns only attempts belonging to the queried version', async () => {
      const versionA1 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const versionA2 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
        startedAt: '2026-07-15T11:00:00.000Z',
      });

      const repository = StubNormalizationAttemptRepository.returningNormalizationAttempts([
        versionA1,
        versionA2,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionAId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!versionAId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(workspaceId.value, versionAId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(2);
      expect(result.value[0]!.playbookVersionId).toBe(versionAId.value);
      expect(result.value[1]!.playbookVersionId).toBe(versionAId.value);
    });
  });

  describe('listByPlaybookVersionId — mixed statuses', () => {
    it('includes attempts regardless of their status', async () => {
      const runningAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
        startedAt: '2026-07-15T10:00:00.000Z',
      });
      const completedAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T11:00:00.000Z',
      });
      const completedAt = Instant.parse('2026-07-15T11:30:00.000Z');
      if (!completedAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      expect(completedAttempt.complete({ completedAt: completedAt.value }).success).toBe(true);

      const failedAttempt = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000003',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T12:00:00.000Z',
      });
      const failedAt = Instant.parse('2026-07-15T12:30:00.000Z');
      if (!failedAt.success) {
        throw new Error('Expected a valid instant fixture.');
      }
      expect(failedAttempt.fail({ failedAt: failedAt.value }).success).toBe(true);

      const repository = StubNormalizationAttemptRepository.returningNormalizationAttempts([
        runningAttempt,
        completedAttempt,
        failedAttempt,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(3);
      expect(result.value[0]!.status).toBe('running');
      expect(result.value[1]!.status).toBe('completed');
      expect(result.value[2]!.status).toBe('failed');
    });
  });

  describe('listByPlaybookVersionId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('normalizationAttempt.listByPlaybookVersionId');
      const repository =
        StubNormalizationAttemptRepository.returningListByPlaybookVersionIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('normalizationAttempt.listByPlaybookVersionId');
    });
  });

  describe('listByPlaybookVersionId — argument capture', () => {
    it('captures the workspaceId and playbookVersionId from the last call', async () => {
      const attempt = createValidNormalizationAttempt();
      const repository = StubNormalizationAttemptRepository.returningNormalizationAttempts([
        attempt,
      ]);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      await repository.listByPlaybookVersionId(workspaceId.value, playbookVersionId.value);

      const call = repository.listCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookVersionId).toBe(playbookVersionId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('listByPlaybookVersionId — array independence', () => {
    it('is not affected by external mutations to the source array after configuration', async () => {
      const attempt1 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000001',
      });
      const attempt2 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T11:00:00.000Z',
      });
      const attempt3 = createValidNormalizationAttempt({
        normalizationAttemptId: '00000000-0000-0000-0000-000000000003',
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
        startedAt: '2026-07-15T12:00:00.000Z',
      });

      const configured: NormalizationAttempt[] = [attempt1, attempt2];
      const repository =
        StubNormalizationAttemptRepository.returningNormalizationAttempts(configured);
      configured.push(attempt3);

      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.listByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toBe(attempt1);
      expect(result.value[1]).toBe(attempt2);
    });
  });

  describe('listByPlaybookVersionId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const attempt = createValidNormalizationAttempt();
      const repository = StubNormalizationAttemptRepository.returningNormalizationAttempts([
        attempt,
      ]);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<readonly NormalizationAttempt[], PersistenceOperationFailedError>> = (
        wsId,
        pvId,
      ) => repository.listByPlaybookVersionId(wsId, pvId);

      void _acceptsTypedIds;
    });
  });
});
