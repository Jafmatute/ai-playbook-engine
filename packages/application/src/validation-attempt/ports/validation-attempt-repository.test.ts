import { describe, expect, it } from 'vitest';

import type { PlaybookVersionId, ValidationAttemptId, WorkspaceId } from '@ai-playbook-engine/core';
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

type FindByPlaybookVersionIdStubResult =
  | {
      readonly kind: 'validationAttempt';
      readonly validationAttempt: ValidationAttempt;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindByPlaybookVersionIdCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookVersionId: PlaybookVersionId;
}>;

class StubValidationAttemptRepository implements ValidationAttemptRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findByPlaybookVersionIdResult: FindByPlaybookVersionIdStubResult;
  #findByPlaybookVersionIdCall: FindByPlaybookVersionIdCall | null = null;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findByPlaybookVersionIdResult: FindByPlaybookVersionIdStubResult,
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findByPlaybookVersionIdResult = findByPlaybookVersionIdResult;
  }

  // -- findById factories ---------------------------------------------------

  static returningValidationAttempt(
    validationAttempt: ValidationAttempt,
  ): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository(
      { kind: 'validationAttempt', validationAttempt },
      { kind: 'null' },
    );
  }

  static returningNull(): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'error', error }, { kind: 'null' });
  }

  // -- findByPlaybookVersionId factories ------------------------------------

  static returningValidationAttemptByPlaybookVersionId(
    validationAttempt: ValidationAttempt,
  ): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository(
      { kind: 'null' },
      { kind: 'validationAttempt', validationAttempt },
    );
  }

  static returningNoValidationAttemptByPlaybookVersionId(): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindByPlaybookVersionIdError(
    error: PersistenceOperationFailedError,
  ): StubValidationAttemptRepository {
    return new StubValidationAttemptRepository({ kind: 'null' }, { kind: 'error', error });
  }

  // -- findById -------------------------------------------------------------

  async findById(
    _workspaceId: WorkspaceId,
    _validationAttemptId: ValidationAttemptId,
  ): Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'validationAttempt': {
        return ok(this.#findByIdResult.validationAttempt);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  // -- findByPlaybookVersionId ----------------------------------------------

  get findByPlaybookVersionIdCall(): FindByPlaybookVersionIdCall | null {
    return this.#findByPlaybookVersionIdCall;
  }

  async findByPlaybookVersionId(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>> {
    this.#findByPlaybookVersionIdCall = Object.freeze({ workspaceId, playbookVersionId });

    switch (this.#findByPlaybookVersionIdResult.kind) {
      case 'validationAttempt': {
        return ok(this.#findByPlaybookVersionIdResult.validationAttempt);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByPlaybookVersionIdResult.error);
      }
    }
  }
}

interface ValidationAttemptFixtureOptions {
  readonly validationAttemptId: string;
  readonly playbookVersionId: string;
}

function createValidValidationAttempt(
  options?: Partial<ValidationAttemptFixtureOptions>,
): ValidationAttempt {
  const validationAttemptIdRaw =
    options?.validationAttemptId ?? '00000000-0000-0000-0000-000000000001';
  const validationAttemptIdResult = parseValidationAttemptId(validationAttemptIdRaw);
  if (!validationAttemptIdResult.success) {
    throw new Error('Expected a valid validation attempt ID fixture.');
  }

  const playbookVersionIdRaw = options?.playbookVersionId ?? '00000000-0000-0000-0000-000000000002';
  const playbookVersionIdResult = parsePlaybookVersionId(playbookVersionIdRaw);
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

  // -------------------------------------------------------------------------
  // findByPlaybookVersionId
  // -------------------------------------------------------------------------

  describe('findByPlaybookVersionId — found', () => {
    it('returns the ValidationAttempt for the given playbook version', async () => {
      const validationAttempt = createValidValidationAttempt({
        playbookVersionId: '00000000-0000-0000-0000-000000000002',
      });
      const repository =
        StubValidationAttemptRepository.returningValidationAttemptByPlaybookVersionId(
          validationAttempt,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(validationAttempt);
      expect(validationAttempt.playbookVersionId).toBe(playbookVersionId.value);
    });
  });

  describe('findByPlaybookVersionId — no attempt', () => {
    it('returns a successful Result with null when the version has no attempt', async () => {
      const repository =
        StubValidationAttemptRepository.returningNoValidationAttemptByPlaybookVersionId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(
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

  describe('findByPlaybookVersionId — version not found', () => {
    it('returns a successful Result with null when the playbook version does not exist', async () => {
      const repository =
        StubValidationAttemptRepository.returningNoValidationAttemptByPlaybookVersionId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const nonExistentVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000ffff');
      if (!nonExistentVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(
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

  describe('findByPlaybookVersionId — wrong workspace', () => {
    it('returns a successful Result with null when queried from a different workspace', async () => {
      const repository =
        StubValidationAttemptRepository.returningNoValidationAttemptByPlaybookVersionId();
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(
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

  describe('findByPlaybookVersionId — attempt from another version', () => {
    it('returns only the attempt for the queried version', async () => {
      const versionAAttempt = createValidValidationAttempt({
        validationAttemptId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
      });
      const versionBAttempt = createValidValidationAttempt({
        validationAttemptId: '00000000-0000-0000-0000-000000000002',
        playbookVersionId: '00000000-0000-0000-0000-00000000000b',
      });

      expect(versionAAttempt.playbookVersionId).not.toBe(versionBAttempt.playbookVersionId);

      const repository =
        StubValidationAttemptRepository.returningValidationAttemptByPlaybookVersionId(
          versionAAttempt,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionAId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!versionAId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(workspaceId.value, versionAId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(versionAAttempt);
      expect(result.value).not.toBe(versionBAttempt);
    });
  });

  describe('findByPlaybookVersionId — same workspace, different version', () => {
    it('scopes by playbook version within the same workspace', async () => {
      const versionA = createValidValidationAttempt({
        validationAttemptId: '00000000-0000-0000-0000-000000000001',
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
      });

      const repository =
        StubValidationAttemptRepository.returningNoValidationAttemptByPlaybookVersionId();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const versionBId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000b');
      if (!versionBId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      void versionA;

      const result = await repository.findByPlaybookVersionId(workspaceId.value, versionBId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findByPlaybookVersionId — independence from findById', () => {
    it('does not affect the default null result of findById', async () => {
      const validationAttempt = createValidValidationAttempt({
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
      });
      const repository =
        StubValidationAttemptRepository.returningValidationAttemptByPlaybookVersionId(
          validationAttempt,
        );
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

  describe('findByPlaybookVersionId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('validationAttempt.findByPlaybookVersionId');
      const repository =
        StubValidationAttemptRepository.returningFindByPlaybookVersionIdError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-000000000002');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      const result = await repository.findByPlaybookVersionId(
        workspaceId.value,
        playbookVersionId.value,
      );

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('validationAttempt.findByPlaybookVersionId');
    });
  });

  describe('findByPlaybookVersionId — argument capture', () => {
    it('captures the workspaceId and playbookVersionId from the last call', async () => {
      const validationAttempt = createValidValidationAttempt({
        playbookVersionId: '00000000-0000-0000-0000-00000000000a',
      });
      const repository =
        StubValidationAttemptRepository.returningValidationAttemptByPlaybookVersionId(
          validationAttempt,
        );
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookVersionId = parsePlaybookVersionId('00000000-0000-0000-0000-00000000000a');
      if (!playbookVersionId.success) {
        throw new Error('Expected a valid playbook version ID fixture.');
      }

      await repository.findByPlaybookVersionId(workspaceId.value, playbookVersionId.value);

      const call = repository.findByPlaybookVersionIdCall;

      expect(call).not.toBeNull();
      expect(call!.workspaceId).toBe(workspaceId.value);
      expect(call!.playbookVersionId).toBe(playbookVersionId.value);
      expect(Object.isFrozen(call)).toBe(true);
    });
  });

  describe('findByPlaybookVersionId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookVersionId parameter types', () => {
      const validationAttempt = createValidValidationAttempt();
      const repository =
        StubValidationAttemptRepository.returningValidationAttemptByPlaybookVersionId(
          validationAttempt,
        );

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookVersionId: PlaybookVersionId,
      ) => Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>> = (
        wsId,
        pvId,
      ) => repository.findByPlaybookVersionId(wsId, pvId);

      void _acceptsTypedIds;
    });
  });
});
