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
import type { PlaybookRepository } from '../ports/playbook-repository.js';
import type { PlaybookListFilter } from '../playbook-list-filter.js';
import type { Page, PaginationRequest } from '../../pagination/index.js';
import { PAGINATION_INVALID, WORKSPACE_NOT_FOUND } from '../../errors/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
} from '../../persistence/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import { ListPlaybooksHandler, type ListPlaybooksQuery } from './list-playbooks.js';

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

type FindByIdResult =
  | { readonly kind: 'workspace'; readonly workspace: Workspace }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly #findByIdResult: FindByIdResult;

  constructor(findByIdResult: FindByIdResult) {
    this.#findByIdResult = findByIdResult;
  }

  async findById(): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
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
    return ok(true);
  }

  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

// ---------------------------------------------------------------------------
// Stub: PlaybookRepository
// ---------------------------------------------------------------------------

type ListCall = Readonly<{
  workspaceId: WorkspaceId;
  filter: PlaybookListFilter;
  pagination: PaginationRequest;
}>;

type ListStubResult =
  | { readonly kind: 'page'; readonly page: Page<Playbook> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

function copyFrozenPage(page: Page<Playbook>): Page<Playbook> {
  const items = Object.freeze([...page.items]);

  if (page.totalCount === undefined) {
    return Object.freeze({ items, offset: page.offset, limit: page.limit, hasMore: page.hasMore });
  }

  return Object.freeze({
    items,
    offset: page.offset,
    limit: page.limit,
    hasMore: page.hasMore,
    totalCount: page.totalCount,
  });
}

import { PersistenceRevision } from '../../persistence/index.js';
import type { PersistedAggregate } from '../../persistence/index.js';
import type { PlaybookRepositoryUpdateError } from '../ports/playbook-repository.js';

class StubPlaybookRepository implements PlaybookRepository {
  readonly #listResult: ListStubResult;
  #listCall: ListCall | null = null;

  constructor(listResult: ListStubResult) {
    this.#listResult = listResult;
  }

  get listCall(): ListCall | null {
    return this.#listCall;
  }

  async findById(): Promise<
    Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>
  > {
    return ok(null);
  }

  async findByNormalizedName(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async list(
    workspaceId: WorkspaceId,
    filter: PlaybookListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    this.#listCall = Object.freeze({ workspaceId, filter, pagination });

    switch (this.#listResult.kind) {
      case 'page':
        return ok(copyFrozenPage(this.#listResult.page));
      case 'error':
        return err(this.#listResult.error);
    }
  }

  async insert(): Promise<Result<PersistenceRevision, PersistenceOperationFailedError>> {
    const rev = PersistenceRevision.from(1);
    if (!rev.success) {
      return err(persistenceOperationFailed('playbook.insert'));
    }
    return ok(rev.value);
  }

  async update(
    _playbook: Playbook,
    _expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    const rev = PersistenceRevision.from(2);
    if (!rev.success) {
      return err(persistenceOperationFailed('playbook.update'));
    }
    return ok(rev.value);
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

function createWorkspace(id: string): Workspace {
  const workspaceId = parseWorkspaceId(id);
  if (!workspaceId.success) throw new Error('bad fixture');
  const name = WorkspaceName.create('Test Workspace');
  if (!name.success) throw new Error('bad fixture');
  const result = Workspace.create({
    workspaceId: workspaceId.value,
    name: name.value,
    createdAt: now(),
  });
  if (!result.success) throw new Error('bad fixture');
  return result.value;
}

function createPlaybook(name: string): Playbook {
  const playbookId = parsePlaybookId('00000000-0000-0000-0000-000000000001');
  if (!playbookId.success) throw new Error('bad fixture');

  const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!workspaceId.success) throw new Error('bad fixture');

  const nameResult = PlaybookName.create(name);
  if (!nameResult.success) throw new Error('bad fixture');

  const result = Playbook.create({
    playbookId: playbookId.value,
    workspaceId: workspaceId.value,
    name: nameResult.value,
    createdAt: now(),
  });
  if (!result.success) throw new Error('bad fixture');

  return result.value;
}

function validWorkspaceId(): WorkspaceId {
  const id = parseWorkspaceId('00000000-0000-0000-0000-000000000002');
  if (!id.success) throw new Error('bad fixture');
  return id.value;
}

function validWorkspace(): Workspace {
  return createWorkspace('00000000-0000-0000-0000-000000000002');
}

const DEFAULT_PAGINATION = Object.freeze({ offset: 0, limit: 25 });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ListPlaybooksHandler', () => {
  it('passes an empty filter and default pagination when no query filters are given', async () => {
    const playbook = createPlaybook('Test Playbook');
    const repoPage: Page<Playbook> = {
      items: [playbook],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.items).toHaveLength(1);
    const item = result.value.items[0];
    expect(item?.name).toBe('Test Playbook');
    expect(result.value.offset).toBe(0);
    expect(result.value.limit).toBe(25);
    expect(result.value.hasMore).toBe(false);
    expect(result.value.totalCount).toBe(1);

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(Object.keys(call!.filter)).toHaveLength(0);
    expect(call!.pagination).toMatchObject(DEFAULT_PAGINATION);
  });

  it('returns WORKSPACE_NOT_FOUND when the workspace does not exist', async () => {
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: WORKSPACE_NOT_FOUND });
  });

  it('returns persistence error when workspace repository fails', async () => {
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'error',
      error: persistenceOperationFailed('workspace.findById'),
    });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PERSISTENCE_OPERATION_FAILED });
  });

  it('returns error when workspace provider is unavailable', async () => {
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'unavailable' }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('CURRENT_WORKSPACE_UNAVAILABLE');
  });

  it('passes status filter to the repository', async () => {
    const activePb = createPlaybook('Active');
    const repoPage: Page<Playbook> = {
      items: [activePb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = { status: 'active', offset: 0, limit: 25 };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.items).toHaveLength(1);

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.status).toBe('active');
  });

  it('trims and lowercases namePrefix before passing as normalizedNamePrefix', async () => {
    const pb = createPlaybook('ai engineering');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = { namePrefix: '  AI Engineering  ', offset: 0, limit: 25 };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.normalizedNamePrefix).toBe('ai engineering');
  });

  it('omits normalizedNamePrefix when namePrefix is empty after trim', async () => {
    const pb = createPlaybook('Test');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = { namePrefix: '   ', offset: 0, limit: 25 };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.normalizedNamePrefix).toBeUndefined();
  });

  it('passes hasActiveVersion: true to the repository', async () => {
    const pb = createPlaybook('Test');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = { hasActiveVersion: true, offset: 0, limit: 25 };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.hasActiveVersion).toBe(true);
  });

  it('passes hasActiveVersion: false to the repository', async () => {
    const pb = createPlaybook('Test');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = { hasActiveVersion: false, offset: 0, limit: 25 };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.hasActiveVersion).toBe(false);
  });

  it('passes a combined filter with status, namePrefix, and hasActiveVersion', async () => {
    const pb = createPlaybook('ai engineering');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const query: ListPlaybooksQuery = {
      status: 'active',
      namePrefix: '  AI Engineering  ',
      hasActiveVersion: true,
      offset: 0,
      limit: 25,
    };
    const result = await handler.handle(query);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const call = repository.listCall;
    expect(call).not.toBeNull();
    expect(call!.filter.status).toBe('active');
    expect(call!.filter.normalizedNamePrefix).toBe('ai engineering');
    expect(call!.filter.hasActiveVersion).toBe(true);
  });

  it('returns an empty page when the repository returns no items', async () => {
    const repoPage: Page<Playbook> = {
      items: [],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 0,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.items).toHaveLength(0);
    expect(result.value.totalCount).toBe(0);
  });

  it('preserves offset, limit, hasMore from a subsequent page', async () => {
    const pb = createPlaybook('Playbook B');
    const repoPage: Page<Playbook> = {
      items: [pb],
      offset: 25,
      limit: 25,
      hasMore: true,
      totalCount: 80,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 25, limit: 25 });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.items).toHaveLength(1);
    const item = result.value.items[0];
    expect(item?.name).toBe('Playbook B');
    expect(result.value.offset).toBe(25);
    expect(result.value.limit).toBe(25);
    expect(result.value.hasMore).toBe(true);
    expect(result.value.totalCount).toBe(80);
  });

  it('returns error when offset is negative', async () => {
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: -1, limit: 25 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PAGINATION_INVALID });
  });

  it('returns error when limit is 0', async () => {
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 0 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PAGINATION_INVALID });
  });

  it('returns error when limit exceeds 100', async () => {
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 101 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({ code: PAGINATION_INVALID });
  });

  it('returns persistence error when the repository fails', async () => {
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({
      kind: 'error',
      error: persistenceOperationFailed('playbook.list'),
    });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'playbook.list' },
    });
  });

  it('returns a frozen page with frozen items', async () => {
    const playbook = createPlaybook('Test Playbook');
    const repoPage: Page<Playbook> = {
      items: [playbook],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: validWorkspace(),
    });
    const repository = new StubPlaybookRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybooksHandler(
      new StubCurrentWorkspaceProvider({ kind: 'workspaceId', workspaceId: validWorkspaceId() }),
      workspaceRepo,
      repository,
    );

    const result = await handler.handle({ offset: 0, limit: 25 });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.items)).toBe(true);
  });
});
