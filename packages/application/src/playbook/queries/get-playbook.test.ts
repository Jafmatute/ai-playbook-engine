import { describe, expect, it } from 'vitest';

import type { WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
  Workspace,
  WorkspaceName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import { currentWorkspaceUnavailable } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
} from '../../persistence/index.js';
import { PLAYBOOK_NOT_FOUND } from '../../errors/index.js';
import { GetPlaybookHandler, type GetPlaybookQuery } from './get-playbook.js';

// ---------------------------------------------------------------------------
// Stub: CurrentWorkspaceProvider
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Stub: WorkspaceRepository
// ---------------------------------------------------------------------------

type WorkspaceFindByIdResult =
  | { readonly kind: 'workspace'; readonly workspace: Workspace }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly #findByIdResult: WorkspaceFindByIdResult;

  constructor(findByIdResult: WorkspaceFindByIdResult) {
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

  async insert(): Promise<Result<void, any>> {
    return ok(undefined);
  }
}

// ---------------------------------------------------------------------------
// Stub: PlaybookRepository
// ---------------------------------------------------------------------------

type PlaybookFindByIdResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  readonly #findByIdResult: PlaybookFindByIdResult;

  constructor(findByIdResult: PlaybookFindByIdResult) {
    this.#findByIdResult = findByIdResult;
  }

  async findById(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    switch (this.#findByIdResult.kind) {
      case 'playbook':
        return ok(this.#findByIdResult.playbook);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.#findByIdResult.error);
    }
  }

  async findByNormalizedName(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async list(): Promise<Result<any, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 });
  }

  async insert(): Promise<Result<void, any>> {
    return ok(undefined);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function now(): Instant {
  const result = Instant.parse('2026-07-17T12:00:00.000Z');
  if (!result.success) throw new Error('bad fixture');
  return result.value;
}

function createPlaybook(): Playbook {
  const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
  if (!playbookId.success) throw new Error('bad fixture');

  const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceId.success) throw new Error('bad fixture');

  const name = PlaybookName.create('Test Playbook');
  if (!name.success) throw new Error('bad fixture');

  const result = Playbook.create({
    playbookId: playbookId.value,
    workspaceId: workspaceId.value,
    name: name.value,
    createdAt: now(),
  });
  if (!result.success) throw new Error('bad fixture');

  return result.value;
}

function createActiveWorkspace(): Workspace {
  const wsId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!wsId.success) throw new Error('bad fixture');

  const name = WorkspaceName.create('Test Workspace');
  if (!name.success) throw new Error('bad fixture');

  const createdAt = Instant.parse('2026-07-15T10:00:00.000Z');
  if (!createdAt.success) throw new Error('bad fixture');

  const result = Workspace.create({
    workspaceId: wsId.value,
    name: name.value,
    createdAt: createdAt.value,
  });
  if (!result.success) throw new Error('bad fixture');

  return result.value;
}

function validWorkspaceId(): WorkspaceId {
  const id = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!id.success) throw new Error('bad fixture');
  return id.value;
}

function validQuery(): GetPlaybookQuery {
  return Object.freeze({ playbookId: '00000000-0000-0000-0000-000000000001' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GetPlaybookHandler', () => {
  it('returns the playbook DTO when found', async () => {
    const playbook = createPlaybook();
    const handler = new GetPlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'playbook', playbook }),
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.playbookId).toBe(playbook.id);
    expect(result.value.name).toBe('Test Playbook');
    expect(result.value.status).toBe('active');
  });

  it('returns error when the playbook identifier is invalid', async () => {
    const handler = new GetPlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'null' }),
    );

    const result = await handler.handle({ playbookId: 'not-a-uuid' });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: 'INVALID_IDENTIFIER' });
  });

  it('returns error when the playbook is not found', async () => {
    const handler = new GetPlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'null' }),
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PLAYBOOK_NOT_FOUND });
  });

  it('returns persistence error when the repository fails', async () => {
    const handler = new GetPlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({
        kind: 'error',
        error: persistenceOperationFailed('playbook.findById'),
      }),
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'playbook.findById' },
    });
  });

  it('returns a frozen DTO', async () => {
    const playbook = createPlaybook();
    const handler = new GetPlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'playbook', playbook }),
    );

    const result = await handler.handle(validQuery());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });
});
