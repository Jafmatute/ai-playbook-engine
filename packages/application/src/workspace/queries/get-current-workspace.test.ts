import { describe, expect, it } from 'vitest';

import type { WorkspaceId } from '@ai-playbook-engine/core';
import { Instant, parseWorkspaceId, Workspace, WorkspaceName } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import { CURRENT_WORKSPACE_UNAVAILABLE, currentWorkspaceUnavailable } from '../../ports/index.js';
import type { WorkspaceRepository } from '../ports/workspace-repository.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
} from '../../persistence/index.js';
import { WORKSPACE_NOT_FOUND } from '../../errors/index.js';
import { GetCurrentWorkspaceHandler } from './get-current-workspace.js';

type GetCurrentWorkspaceIdResult =
  | { readonly kind: 'workspaceId'; readonly workspaceId: WorkspaceId }
  | { readonly kind: 'unavailable' };

class StubCurrentWorkspaceProvider implements CurrentWorkspaceProvider {
  readonly #result: GetCurrentWorkspaceIdResult;

  constructor(result: GetCurrentWorkspaceIdResult) {
    this.#result = result;
  }

  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    switch (this.#result.kind) {
      case 'workspaceId':
        return ok(this.#result.workspaceId);
      case 'unavailable':
        return err(currentWorkspaceUnavailable());
    }
  }
}

type FindByIdStubResult =
  | { readonly kind: 'workspace'; readonly workspace: Workspace }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly #findByIdResult: FindByIdStubResult;

  constructor(findByIdResult: FindByIdStubResult) {
    this.#findByIdResult = findByIdResult;
  }

  async findById(
    _workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'workspace':
        return ok(this.#findByIdResult.workspace);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.#findByIdResult.error);
    }
  }

  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    return ok(false);
  }

  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

function createValidWorkspace(): Workspace {
  const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
  if (!workspaceIdResult.success) throw new Error('bad fixture');

  const nameResult = WorkspaceName.create('Test Workspace');
  if (!nameResult.success) throw new Error('bad fixture');

  const createdAtResult = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAtResult.success) throw new Error('bad fixture');

  const workspaceResult = Workspace.create({
    workspaceId: workspaceIdResult.value,
    name: nameResult.value,
    createdAt: createdAtResult.value,
  });
  if (!workspaceResult.success) throw new Error('bad fixture');

  return workspaceResult.value;
}

function validWorkspaceId(): WorkspaceId {
  const result = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
  if (!result.success) throw new Error('bad fixture');
  return result.value;
}

describe('GetCurrentWorkspaceHandler', () => {
  it('returns the workspace DTO when workspace is found', async () => {
    const workspace = createValidWorkspace();
    const handler = new GetCurrentWorkspaceHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace }),
    );

    const result = await handler.handle();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.workspaceId).toBe(workspace.id);
    expect(result.value.name).toBe('Test Workspace');
    expect(result.value.status).toBe('active');
  });

  it('returns error when current workspace is not configured', async () => {
    const handler = new GetCurrentWorkspaceHandler(
      new StubCurrentWorkspaceProvider({ kind: 'unavailable' }),
      new StubWorkspaceRepository({ kind: 'null' }),
    );

    const result = await handler.handle();

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: CURRENT_WORKSPACE_UNAVAILABLE });
  });

  it('returns error when workspace is not found', async () => {
    const handler = new GetCurrentWorkspaceHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'null' }),
    );

    const result = await handler.handle();

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: WORKSPACE_NOT_FOUND });
  });

  it('returns persistence error when repository fails', async () => {
    const handler = new GetCurrentWorkspaceHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({
        kind: 'error',
        error: persistenceOperationFailed('workspace.findById'),
      }),
    );

    const result = await handler.handle();

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'workspace.findById' },
    });
  });

  it('returns a frozen DTO', async () => {
    const workspace = createValidWorkspace();
    const handler = new GetCurrentWorkspaceHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace }),
    );

    const result = await handler.handle();
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });
});
