import { describe, expect, it } from 'vitest';

import type { PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
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

import type { Clock, CurrentWorkspaceProvider, PlaybookIdGenerator } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import { currentWorkspaceUnavailable } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { PlaybookNameConflictError } from '../../errors/index.js';
import {
  WORKSPACE_NOT_FOUND,
  WORKSPACE_NOT_ACTIVE,
  PLAYBOOK_NAME_CONFLICT,
  playbookNameConflict,
} from '../../errors/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
} from '../../persistence/index.js';
import { CreatePlaybookHandler, type CreatePlaybookCommand } from './create-playbook.js';

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

type FindByNormalizedNameResult =
  | { readonly kind: 'playbook'; readonly playbook: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type InsertResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  readonly #findByNormalizedNameResult: FindByNormalizedNameResult;
  readonly #insertResult: InsertResult;

  constructor(
    findByNormalizedNameResult: FindByNormalizedNameResult = { kind: 'null' },
    insertResult: InsertResult = { kind: 'ok' },
  ) {
    this.#findByNormalizedNameResult = findByNormalizedNameResult;
    this.#insertResult = insertResult;
  }

  async findById(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async findByNormalizedName(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    switch (this.#findByNormalizedNameResult.kind) {
      case 'playbook':
        return ok(this.#findByNormalizedNameResult.playbook);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.#findByNormalizedNameResult.error);
    }
  }

  async list(): Promise<Result<any, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 });
  }

  async insert(): Promise<
    Result<void, PlaybookNameConflictError | PersistenceOperationFailedError>
  > {
    switch (this.#insertResult.kind) {
      case 'ok':
        return ok(undefined);
      case 'conflict':
        return err(playbookNameConflict());
      case 'error':
        return err(this.#insertResult.error);
    }
  }
}

// ---------------------------------------------------------------------------
// Stub: Clock
// ---------------------------------------------------------------------------

class StubClock implements Clock {
  readonly #now: Instant;

  constructor(now: Instant) {
    this.#now = now;
  }

  now(): Instant {
    return this.#now;
  }
}

// ---------------------------------------------------------------------------
// Stub: PlaybookIdGenerator
// ---------------------------------------------------------------------------

class StubPlaybookIdGenerator implements PlaybookIdGenerator {
  readonly #id: PlaybookId;

  constructor(id: PlaybookId) {
    this.#id = id;
  }

  generate(): PlaybookId {
    return this.#id;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validNow(): Instant {
  const now = Instant.parse('2026-07-17T12:00:00.000Z');
  if (!now.success) throw new Error('bad fixture');
  return now.value;
}

function validPlaybookId(): PlaybookId {
  const id = parsePlaybookId('11111111-1111-1111-1111-111111111111');
  if (!id.success) throw new Error('bad fixture');
  return id.value;
}

function validWorkspaceId(): WorkspaceId {
  const id = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!id.success) throw new Error('bad fixture');
  return id.value;
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

function createArchivedWorkspace(): Workspace {
  const ws = createActiveWorkspace();
  const archivedAt = Instant.parse('2026-07-16T10:00:00.000Z');
  if (!archivedAt.success) throw new Error('bad fixture');
  const result = ws.archive({ archivedAt: archivedAt.value });
  if (!result.success) throw new Error('bad fixture');
  return ws;
}

function validCommand(): CreatePlaybookCommand {
  return Object.freeze({ name: 'My Playbook' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreatePlaybookHandler', () => {
  it('creates a playbook successfully', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.name).toBe('My Playbook');
    expect(result.value.workspaceId).toBe(validWorkspaceId());
    expect(result.value.status).toBe('active');
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('returns error when workspace is not found', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'null' }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: WORKSPACE_NOT_FOUND });
  });

  it('returns error when workspace is archived', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createArchivedWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: WORKSPACE_NOT_ACTIVE });
  });

  it('returns error when name is empty', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle({ name: '' });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: 'PLAYBOOK_NAME_REQUIRED' });
  });

  it('returns error when name exceeds maximum length', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle({ name: 'A'.repeat(161) });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: 'PLAYBOOK_NAME_INVALID' });
  });

  it('returns error when description exceeds maximum length', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle({ name: 'My Playbook', description: 'A'.repeat(1001) });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: 'PLAYBOOK_DESCRIPTION_INVALID' });
  });

  it('returns conflict error when precheck detects duplicate name', async () => {
    const nameResult = PlaybookName.create('My Playbook');
    if (!nameResult.success) throw new Error('bad fixture');

    const existingPlaybook = Playbook.create({
      playbookId: validPlaybookId(),
      workspaceId: validWorkspaceId(),
      name: nameResult.value,
      createdAt: validNow(),
    });
    if (!existingPlaybook.success) throw new Error('bad fixture');

    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'playbook', playbook: existingPlaybook.value }),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PLAYBOOK_NAME_CONFLICT });
  });

  it('returns conflict error when insert detects duplicate name', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository({ kind: 'null' }, { kind: 'conflict' }),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PLAYBOOK_NAME_CONFLICT });
  });

  it('returns persistence error when repository fails', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(
        { kind: 'null' },
        { kind: 'error', error: persistenceOperationFailed('playbook.insert') },
      ),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'playbook.insert' },
    });
  });

  it('returns a frozen DTO', async () => {
    const handler = new CreatePlaybookHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      new StubWorkspaceRepository({ kind: 'workspace', workspace: createActiveWorkspace() }),
      new StubPlaybookRepository(),
      new StubClock(validNow()),
      new StubPlaybookIdGenerator(validPlaybookId()),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });
});
