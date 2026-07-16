import { describe, expect, it } from 'vitest';

import type { ValidationAttemptId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookVersionId,
  parseValidationAttemptId,
  parseWorkspaceId,
  ValidationAttempt,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { ValidationAttemptRepository } from './validation-attempt-repository.js';

type FindByIdStubResult =
  | {
      readonly kind: 'validationAttempt';
      readonly validationAttempt: ValidationAttempt;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubValidationAttemptRepository implements ValidationAttemptRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
  }

  static returningValidationAttempt(
    validationAttempt: ValidationAttempt,
  ): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({
      kind: 'validationAttempt',
      validationAttempt,
    });
  }

  static returningNull(): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _validationAttemptId: ValidationAttemptId,
  ): Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'validationAttempt': {
        return ok(this.#result.validationAttempt);
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

function createValidValidationAttempt(): ValidationAttempt {
  const validationAttemptIdResult = parseValidationAttemptId(
    '00000000-0000-0000-0000-000000000001',
  );
  if (!validationAttemptIdResult.success) {
    throw new Error('Expected a valid validation attempt ID fixture.');
  }

  const playbookVersionIdResult = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
  if (!playbookVersionIdResult.success) {
    throw new Error('Expected a valid playbook version ID fixture.');
  }

  const startedAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!startedAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const result = ValidationAttempt.create({
    validationAttemptId: validationAttemptIdResult.value,
    playbookVersionId: playbookVersionIdResult.value,
    startedAt: startedAtResult.value,
  });
  if (!result.success) {
    throw new Error('Expected a valid validation attempt fixture.');
  }

  return result.value;
}

describe('ValidationAttemptRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the ValidationAttempt instance', async () => {
      const validationAttempt = createValidValidationAttempt();
      const repository =
        StubValidationAttemptRepository.returningValidationAttempt(validationAttempt);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, validationAttempt.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(validationAttempt);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubValidationAttemptRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const validationAttemptId = parseValidationAttemptId('00000000-0000-0000-0000-000000000001');
      if (!validationAttemptId.success) {
        throw new Error('Expected a valid validation attempt ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, validationAttemptId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the attempt belongs to a different workspace', async () => {
      const repository = StubValidationAttemptRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const validationAttemptId = parseValidationAttemptId('00000000-0000-0000-0000-000000000001');
      if (!validationAttemptId.success) {
        throw new Error('Expected a valid validation attempt ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, validationAttemptId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('validationAttempt.findById');
      const repository = StubValidationAttemptRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const validationAttemptId = parseValidationAttemptId('00000000-0000-0000-0000-000000000001');
      if (!validationAttemptId.success) {
        throw new Error('Expected a valid validation attempt ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, validationAttemptId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('validationAttempt.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and ValidationAttemptId parameter types', () => {
      const validationAttempt = createValidValidationAttempt();
      const repository =
        StubValidationAttemptRepository.returningValidationAttempt(validationAttempt);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        validationAttemptId: ValidationAttemptId,
      ) => Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>> = (
        wsId,
        vaId,
      ) => repository.findById(wsId, vaId);

      void _acceptsTypedIds;
    });
  });
});
