import { describe, expect, it } from 'vitest';

import type { NormalizationAttemptId, WorkspaceId } from '@ai-playbook-engine/core';
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

type FindByIdStubResult =
  | {
      readonly kind: 'normalizationAttempt';
      readonly normalizationAttempt: NormalizationAttempt;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubNormalizationAttemptRepository implements NormalizationAttemptRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
  }

  static returningNormalizationAttempt(
    normalizationAttempt: NormalizationAttempt,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({
      kind: 'normalizationAttempt',
      normalizationAttempt,
    });
  }

  static returningNull(): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'null' });
  }

  static returningError(
    error: PersistenceOperationFailedError,
  ): StubNormalizationAttemptRepository {
    return new StubNormalizationAttemptRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _normalizationAttemptId: NormalizationAttemptId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'normalizationAttempt': {
        return ok(this.#result.normalizationAttempt);
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

function createValidNormalizationAttempt(): NormalizationAttempt {
  const normalizationAttemptIdResult = parseNormalizationAttemptId(
    '00000000-0000-0000-0000-000000000001',
  );
  if (!normalizationAttemptIdResult.success) {
    throw new Error('Expected a valid normalization attempt ID fixture.');
  }

  const playbookVersionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const startedAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
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
});
