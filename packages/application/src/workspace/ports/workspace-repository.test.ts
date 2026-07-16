import { describe, expect, it } from 'vitest';

import type { WorkspaceId } from '@ai-playbook-engine/core';
import { Instant, parseWorkspaceId, Workspace, WorkspaceName } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  PERSISTENCE_OPERATION_FAILED,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import type { WorkspaceRepository } from './workspace-repository.js';

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly #result:
    | { readonly kind: 'workspace'; readonly workspace: Workspace }
    | { readonly kind: 'null' }
    | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

  private constructor(
    result:
      | { readonly kind: 'workspace'; readonly workspace: Workspace }
      | { readonly kind: 'null' }
      | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError },
  ) {
    this.#result = result;
  }

  static returningWorkspace(workspace: Workspace): StubWorkspaceRepository {
    return new StubWorkspaceRepository({ kind: 'workspace', workspace });
  }

  static returningNull(): StubWorkspaceRepository {
    return new StubWorkspaceRepository({ kind: 'null' });
  }

  static returningError(error: PersistenceOperationFailedError): StubWorkspaceRepository {
    return new StubWorkspaceRepository({ kind: 'error', error });
  }

  async findById(
    _workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    switch (this.#result.kind) {
      case 'workspace': {
        return ok(this.#result.workspace);
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

function createValidWorkspace(): Workspace {
  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
  if (!workspaceIdResult.success) {
    throw new Error('Expected a valid workspace ID fixture.');
  }

  const nameResult = WorkspaceName.create('Test Workspace');
  if (!nameResult.success) {
    throw new Error('Expected a valid workspace name fixture.');
  }

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  const workspaceResult = Workspace.create({
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });
  if (!workspaceResult.success) {
    throw new Error('Expected a valid workspace fixture.');
  }

  return workspaceResult.value;
}

describe('WorkspaceRepository', () => {
  describe('findById — found', () => {
    it('returns a successful Result with the Workspace instance', async () => {
      const workspace = createValidWorkspace();
      const repository = StubWorkspaceRepository.returningWorkspace(workspace);

      const result = await repository.findById(workspace.id);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBe(workspace);
    });
  });

  describe('findById — absent', () => {
    it('returns a successful Result with null', async () => {
      const repository = StubWorkspaceRepository.returningNull();
      const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceIdResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceIdResult.value);

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.value).toBeNull();
    });
  });

  describe('findById — persistence failure', () => {
    it('returns a failed Result with PersistenceOperationFailedError', async () => {
      const error = persistenceOperationFailed('workspace.findById');
      const repository = StubWorkspaceRepository.returningError(error);
      const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
      if (!workspaceIdResult.success) {
        throw new Error('Expected a valid workspace ID fixture.');
      }

      const result = await repository.findById(workspaceIdResult.value);

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }

      expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
      expect(result.error.details.operation).toBe('workspace.findById');
    });
  });

  describe('findById — accepts typed WorkspaceId', () => {
    it('compiles with WorkspaceId parameter type', () => {
      const workspace = createValidWorkspace();
      const repository = StubWorkspaceRepository.returningWorkspace(workspace);

      const _acceptsWorkspaceId: (
        id: WorkspaceId,
      ) => Promise<Result<Workspace | null, PersistenceOperationFailedError>> = (id) =>
        repository.findById(id);

      void _acceptsWorkspaceId;
    });
  });
});
