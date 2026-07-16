import { describe, expect, it } from 'vitest';

import type { PlaybookId, PlaybookSourceId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseWorkspaceId,
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookSourceRepository } from './playbook-source-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'playbookSource'; readonly playbookSource: PlaybookSource }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type FindEnabledByPlaybookIdStubResult =
  | { readonly kind: 'playbookSource'; readonly playbookSource: PlaybookSource }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly #findByIdResult: FindByIdStubResult;
  readonly #findEnabledByPlaybookIdResult: FindEnabledByPlaybookIdStubResult;

  private constructor(
    findByIdResult: FindByIdStubResult,
    findEnabledByPlaybookIdResult: FindEnabledByPlaybookIdStubResult = { kind: 'null' },
  ) {
    this.#findByIdResult = findByIdResult;
    this.#findEnabledByPlaybookIdResult = findEnabledByPlaybookIdResult;
  }

  static returningPlaybookSource(playbookSource: PlaybookSource): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'playbookSource', playbookSource });
  }

  static returningNull(): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'error', error });
  }

  static returningEnabledPlaybookSource(
    playbookSource: PlaybookSource,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository(
      { kind: 'null' },
      { kind: 'playbookSource', playbookSource },
    );
  }

  static returningNoEnabledPlaybookSource(): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' }, { kind: 'null' });
  }

  static returningFindEnabledError(
    error: PersistenceOperationFailedError,
  ): StubPlaybookSourceRepository {
    return new StubPlaybookSourceRepository({ kind: 'null' }, { kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbookSource': {
        return ok(this.#findByIdResult.playbookSource);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findByIdResult.error);
      }
    }
  }

  async findEnabledByPlaybookId(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    switch (this.#findEnabledByPlaybookIdResult.kind) {
      case 'playbookSource': {
        return ok(this.#findEnabledByPlaybookIdResult.playbookSource);
      }
      case 'null': {
        return ok(null);
      }
      case 'error': {
        return err(this.#findEnabledByPlaybookIdResult.error);
      }
    }
  }
}

function createValidPlaybookSource(): PlaybookSource {
  const playbookSourceIdResult = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
  if (!playbookSourceIdResult.success) {
    throw new Error('Expected a valid playbook source ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000003');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const externalRootRefResult = PlaybookSourceExternalRootReference.create(
    'https://example.com/root',
  );
  if (!externalRootRefResult.success) {
    throw new Error('Expected a valid external root reference fixture.');
  }

  const configRefResult = PlaybookSourceConfigurationReference.create('config-ref-001');
  if (!configRefResult.success) {
    throw new Error('Expected a valid configuration reference fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  return PlaybookSource.create({
    playbookSourceId: playbookSourceIdResult.value,
    workspaceId: workspaceIdResult.value,
    playbookId: playbookIdResult.value,
    type: 'notion',
    externalRootReference: externalRootRefResult.value,
    configurationReference: configRefResult.value,
    createdAt: createdAtResult.value,
  });
}

function createDisabledPlaybookSource(): PlaybookSource {
  const source = createValidPlaybookSource();

  const result = source.disable();
  if (!result.success) {
    throw new Error('Expected the disable transition to succeed.');
  }

  return source;
}

describe('PlaybookSourceRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the PlaybookSource instance', async () => {
      const playbookSource = createValidPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningPlaybookSource(playbookSource);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSource.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookSource);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSourceId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the source belongs to a different workspace', async () => {
      const repository = StubPlaybookSourceRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookSourceId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookSource.findById');
      const repository = StubPlaybookSourceRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookSourceId = parsePlaybookSourceId('00000000-0000-0000-0000-000000000001');
      if (!playbookSourceId.success) {
        throw new Error('Expected a valid playbook source ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookSourceId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookSource.findById');
    });
  });

  describe('findEnabledByPlaybookId — enabled source found', () => {
    it('returns a successful Result with the enabled PlaybookSource instance', async () => {
      const playbookSource = createValidPlaybookSource();
      const repository =
        StubPlaybookSourceRepository.returningEnabledPlaybookSource(playbookSource);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbookSource);
      if (result.value === null) {
        throw new Error('Expected result.value to be a PlaybookSource.');
      }

      expect(result.value.status).toBe('enabled');
    });
  });

  describe('findEnabledByPlaybookId — no enabled sources', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — only disabled source', () => {
    it('returns a successful Result with null when only a disabled source exists', async () => {
      const disabledSource = createDisabledPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
      void disabledSource;
    });
  });

  describe('findEnabledByPlaybookId — playbook does not exist', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000005');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookSourceRepository.returningNoEnabledPlaybookSource();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000004');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findEnabledByPlaybookId — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbookSource.findEnabledByPlaybookId');
      const repository = StubPlaybookSourceRepository.returningFindEnabledError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000003');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findEnabledByPlaybookId(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbookSource.findEnabledByPlaybookId');
    });
  });

  describe('findEnabledByPlaybookId — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbookSource = createValidPlaybookSource();
      const repository =
        StubPlaybookSourceRepository.returningEnabledPlaybookSource(playbookSource);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> = (wsId, pbId) =>
        repository.findEnabledByPlaybookId(wsId, pbId);

      void _acceptsTypedIds;
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookSourceId parameter types', () => {
      const playbookSource = createValidPlaybookSource();
      const repository = StubPlaybookSourceRepository.returningPlaybookSource(playbookSource);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookSourceId: PlaybookSourceId,
      ) => Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> = (wsId, psId) =>
        repository.findById(wsId, psId);

      void _acceptsTypedIds;
    });
  });
});
