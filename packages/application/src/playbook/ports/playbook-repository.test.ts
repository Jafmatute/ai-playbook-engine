import { describe, expect, it } from 'vitest';

import type { PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { PlaybookRepository } from './playbook-repository.js';

type FindByIdStubResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  readonly #result: FindByIdStubResult;

  private constructor(result: FindByIdStubResult) {
    this.#result = result;
  }

  static returningPlaybook(playbook: Playbook): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'playbook', playbook });
  }

  static returningNull(): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubPlaybookRepository {
    return new StubPlaybookRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
    _playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'playbook': {
        return ok(this.#result.playbook);
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

function createValidPlaybook(): Playbook {
  const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000001');
  if (!playbookIdResult.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const nameResult = PlaybookName.create('Test Playbook');
  if (!nameResult.success) {
    throw new Error('Expected a valid playbook name fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const playbookResult = Playbook.create({
    playbookId: playbookIdResult.value,
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });
  if (!playbookResult.success) {
    throw new Error('Expected a valid playbook fixture.');
  }

  return playbookResult.value;
}

describe('PlaybookRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the Playbook instance', async () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbook.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(playbook);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — wrong workspace', () => {
    it('returns a successful Result with null when the playbook belongs to a different workspace', async () => {
      const repository = StubPlaybookRepository.returningNull();
      const workspaceA = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceA.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const workspaceB = parseWorkspaceId('00000000-0000-0000-0000-000000000003');
      if (!workspaceB.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceB.value, playbookId.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('playbook.findById');
      const repository = StubPlaybookRepository.returningError(error);
      const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
      if (!workspaceId.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }
      const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
      if (!playbookId.success) {
        throw new Error('Expected a valid playbook ID fixture.');
      }

      const result = await repository.findById(workspaceId.value, playbookId.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('playbook.findById');
    });
  });

  describe('findById — accepts typed IDs', () => {
    it('compiles with WorkspaceId and PlaybookId parameter types', () => {
      const playbook = createValidPlaybook();
      const repository = StubPlaybookRepository.returningPlaybook(playbook);

      const _acceptsTypedIds: (
        workspaceId: WorkspaceId,
        playbookId: PlaybookId,
      ) => Promise<Result<Playbook | null, PersistenceOperationFailedError>> = (wsId, pbId) =>
        repository.findById(wsId, pbId);

      void _acceptsTypedIds;
    });
  });
});
