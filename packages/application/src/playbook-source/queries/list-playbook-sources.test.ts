import { describe, expect, it } from 'vitest';

import type { PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
  Playbook as PlaybookClass,
  PlaybookName,
  PlaybookSource as PlaybookSourceClass,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
  Workspace as WorkspaceClass,
  WorkspaceName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  CurrentWorkspaceProvider,
  CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import { currentWorkspaceUnavailable } from '../../ports/index.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  PersistenceRevision,
  createPersistedAggregate,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import {
  paginationInvalid,
  workspaceNotFound,
  playbookNotFound,
  type PaginationInvalidError,
} from '../../errors/index.js';
import {
  ListPlaybookSourcesHandler,
  type ListPlaybookSourcesQuery,
} from './list-playbook-sources.js';
import type { PaginationRequest } from '../../pagination/index.js';
import type { Page } from '../../pagination/index.js';
import type { PersistedAggregate } from '../../persistence/index.js';
import type { PlaybookRepositoryUpdateError } from '../../playbook/ports/playbook-repository.js';

// ---------------------------------------------------------------------------
// Stub: CurrentWorkspaceProvider
// ---------------------------------------------------------------------------

type CurrentResult =
  | { readonly kind: 'workspaceId'; readonly workspaceId: WorkspaceId }
  | { readonly kind: 'unavailable' };

class StubCurrentWorkspaceProvider implements CurrentWorkspaceProvider {
  readonly calls: undefined[] = [];

  constructor(private readonly result: CurrentResult) {}

  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    this.calls.push(undefined);
    switch (this.result.kind) {
      case 'workspaceId':
        return ok(this.result.workspaceId);
      case 'unavailable':
        return err(currentWorkspaceUnavailable());
    }
  }
}

// ---------------------------------------------------------------------------
// Stub: WorkspaceRepository
// ---------------------------------------------------------------------------

type WorkspaceResult =
  | { readonly kind: 'workspace'; readonly workspace: WorkspaceClass }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly findByIdCalls: WorkspaceId[] = [];

  constructor(private readonly findResult: WorkspaceResult) {}

  async findById(
    workspaceId: WorkspaceId,
  ): Promise<Result<WorkspaceClass | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(workspaceId);
    switch (this.findResult.kind) {
      case 'workspace':
        return ok(this.findResult.workspace);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.findResult.error);
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

type PlaybookResult =
  | { readonly kind: 'playbook'; readonly playbook: PlaybookClass; readonly archived?: boolean }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  readonly findByIdCalls: { workspaceId: WorkspaceId; playbookId: PlaybookId }[] = [];

  constructor(private readonly findResult: PlaybookResult) {}

  async findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<PlaybookClass> | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push({ workspaceId, playbookId });
    switch (this.findResult.kind) {
      case 'playbook': {
        const rev = valueFrom(PersistenceRevision.from(1));
        return ok(createPersistedAggregate(this.findResult.playbook, rev));
      }
      case 'null':
        return ok(null);
      case 'error':
        return err(this.findResult.error);
    }
  }

  async findByNormalizedName(): Promise<
    Result<PlaybookClass | null, PersistenceOperationFailedError>
  > {
    return ok(null);
  }

  async list(): Promise<Result<Page<PlaybookClass>, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 });
  }

  async insert(): Promise<Result<PersistenceRevision, PersistenceOperationFailedError>> {
    const rev = PersistenceRevision.from(1);
    if (!rev.success) return err(persistenceOperationFailed('playbook.insert'));
    return ok(rev.value);
  }

  async update(): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    const rev = PersistenceRevision.from(2);
    if (!rev.success) return err(persistenceOperationFailed('playbook.update'));
    return ok(rev.value);
  }
}

// ---------------------------------------------------------------------------
// Stub: PlaybookSourceRepository
// ---------------------------------------------------------------------------

type ListCall = Readonly<{
  workspaceId: WorkspaceId;
  playbookId: PlaybookId;
  pagination: PaginationRequest;
}>;

type SourceListResult =
  | { readonly kind: 'page'; readonly page: Page<PlaybookSourceClass> }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly listCalls: ListCall[] = [];
  readonly insertCalls: unknown[] = [];
  readonly findByIdCalls: unknown[] = [];
  readonly findEnabledByPlaybookIdCalls: unknown[] = [];
  readonly updateCalls: unknown[] = [];

  constructor(private readonly listResult: SourceListResult) {}

  async listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookSourceClass>, PersistenceOperationFailedError>> {
    this.listCalls.push(Object.freeze({ workspaceId, playbookId, pagination }));
    switch (this.listResult.kind) {
      case 'page':
        return ok(this.listResult.page);
      case 'error':
        return err(this.listResult.error);
    }
  }

  async insert(): Promise<Result<PersistenceRevision, never>> {
    this.insertCalls.push(undefined);
    const rev = PersistenceRevision.from(1);
    if (!rev.success) throw new Error('Expected revision 1 to be valid.');
    return ok(rev.value);
  }

  async findById(): Promise<
    Result<{ aggregate: PlaybookSourceClass; revision: PersistenceRevision } | null, never>
  > {
    this.findByIdCalls.push(undefined);
    return ok(null);
  }

  async findEnabledByPlaybookId(): Promise<Result<PlaybookSourceClass | null, never>> {
    this.findEnabledByPlaybookIdCalls.push(undefined);
    return ok(null);
  }

  async update(): Promise<Result<PersistenceRevision, never>> {
    this.updateCalls.push(undefined);
    const rev = PersistenceRevision.from(2);
    if (!rev.success) throw new Error('Expected revision 2 to be valid.');
    return ok(rev.value);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function valueFrom<T>(result: Result<T, unknown>): T {
  if (!result.success) throw new Error('Invalid fixture.');
  return result.value;
}

function now(): Instant {
  return valueFrom(Instant.parse('2026-07-17T12:00:00.000Z'));
}

const workspaceIdValue = valueFrom(parseWorkspaceId('00000000-0000-0000-0000-000000000001'));
const playbookIdValue = valueFrom(parsePlaybookId('00000000-0000-0000-0000-000000000002'));
const sourceId1Value = valueFrom(parsePlaybookSourceId('00000000-0000-0000-0000-000000000003'));
const sourceId2Value = valueFrom(parsePlaybookSourceId('00000000-0000-0000-0000-000000000004'));

function createActiveWorkspace(): WorkspaceClass {
  return valueFrom(
    WorkspaceClass.create({
      workspaceId: workspaceIdValue,
      name: valueFrom(WorkspaceName.create('Test Workspace')),
      createdAt: now(),
    }),
  );
}

function createPlaybook(): PlaybookClass {
  return valueFrom(
    PlaybookClass.create({
      playbookId: playbookIdValue,
      workspaceId: workspaceIdValue,
      name: valueFrom(PlaybookName.create('Test Playbook')),
      createdAt: now(),
    }),
  );
}

function createArchivedPlaybook(): PlaybookClass {
  const pb = createPlaybook();
  valueFrom(pb.archive({ archivedAt: now() }));
  return pb;
}

function createEnabledSource(): PlaybookSourceClass {
  return PlaybookSourceClass.create({
    playbookSourceId: sourceId1Value,
    workspaceId: workspaceIdValue,
    playbookId: playbookIdValue,
    type: 'notion',
    externalRootReference: valueFrom(
      PlaybookSourceExternalRootReference.create('https://example.com/root'),
    ),
    configurationReference: valueFrom(PlaybookSourceConfigurationReference.create('config-1')),
    createdAt: now(),
  });
}

function createDisabledSource(): PlaybookSourceClass {
  const source = PlaybookSourceClass.create({
    playbookSourceId: sourceId2Value,
    workspaceId: workspaceIdValue,
    playbookId: playbookIdValue,
    type: 'notion',
    externalRootReference: valueFrom(
      PlaybookSourceExternalRootReference.create('https://example.com/other'),
    ),
    configurationReference: valueFrom(PlaybookSourceConfigurationReference.create('config-2')),
    createdAt: now(),
  });
  source.disable();
  return source;
}

function createSourceWithSyncHistory(): PlaybookSourceClass {
  return valueFrom(
    PlaybookSourceClass.restore({
      playbookSourceId: sourceId1Value,
      workspaceId: workspaceIdValue,
      playbookId: playbookIdValue,
      type: 'notion',
      status: 'enabled',
      externalRootReference: valueFrom(
        PlaybookSourceExternalRootReference.create('https://example.com/root'),
      ),
      configurationReference: valueFrom(PlaybookSourceConfigurationReference.create('config-1')),
      createdAt: now(),
      lastSuccessfulSynchronizationRunId: valueFrom(
        parseSynchronizationRunId('00000000-0000-0000-0000-000000000010'),
      ),
      lastSuccessfulSynchronizationAt: valueFrom(Instant.parse('2026-07-17T13:00:00.000Z')),
      lastFailedSynchronizationRunId: valueFrom(
        parseSynchronizationRunId('00000000-0000-0000-0000-000000000011'),
      ),
      lastFailedSynchronizationAt: valueFrom(Instant.parse('2026-07-17T14:00:00.000Z')),
    }),
  );
}

function validQuery(overrides: Partial<ListPlaybookSourcesQuery> = {}): ListPlaybookSourcesQuery {
  return Object.freeze({
    playbookId: '00000000-0000-0000-0000-000000000002',
    offset: 0,
    limit: 25,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ListPlaybookSourcesHandler', () => {
  it('returns INVALID_IDENTIFIER before any calls', async () => {
    const parsed = parsePlaybookId('not-a-uuid');
    if (parsed.success) {
      throw new Error('Expected an invalid playbook identifier.');
    }

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle({ playbookId: 'not-a-uuid', offset: -1, limit: 0 });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(parsed.error);
    expect(provider.calls).toEqual([]);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.listCalls).toEqual([]);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  interface InvalidPaginationCase {
    readonly label: string;
    readonly query: ListPlaybookSourcesQuery;
    readonly expectedError: PaginationInvalidError;
  }

  const paginationCases: InvalidPaginationCase[] = [
    {
      label: 'negative offset',
      query: { playbookId: '00000000-0000-0000-0000-000000000002', offset: -1, limit: 25 },
      expectedError: paginationInvalid('offset must be a non-negative integer.'),
    },
    {
      label: 'non-integer offset',
      query: { playbookId: '00000000-0000-0000-0000-000000000002', offset: 1.5, limit: 25 },
      expectedError: paginationInvalid('offset must be a non-negative integer.'),
    },
    {
      label: 'limit 0',
      query: { playbookId: '00000000-0000-0000-0000-000000000002', offset: 0, limit: 0 },
      expectedError: paginationInvalid('limit must be an integer between 1 and 100.'),
    },
    {
      label: 'limit 101',
      query: { playbookId: '00000000-0000-0000-0000-000000000002', offset: 0, limit: 101 },
      expectedError: paginationInvalid('limit must be an integer between 1 and 100.'),
    },
    {
      label: 'non-integer limit',
      query: { playbookId: '00000000-0000-0000-0000-000000000002', offset: 0, limit: 1.5 },
      expectedError: paginationInvalid('limit must be an integer between 1 and 100.'),
    },
  ];

  it.each(paginationCases)(
    'returns PAGINATION_INVALID for $label',
    async ({ query, expectedError }) => {
      const provider = new StubCurrentWorkspaceProvider({
        kind: 'workspaceId',
        workspaceId: workspaceIdValue,
      });
      const workspaceRepo = new StubWorkspaceRepository({
        kind: 'workspace',
        workspace: createActiveWorkspace(),
      });
      const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
      const sourceRepo = new StubPlaybookSourceRepository({
        kind: 'page',
        page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
      });
      const handler = new ListPlaybookSourcesHandler(
        provider,
        workspaceRepo,
        playbookRepo,
        sourceRepo,
      );

      const result = await handler.handle(query);

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toEqual(expectedError);
      expect(provider.calls).toEqual([]);
      expect(workspaceRepo.findByIdCalls).toEqual([]);
      expect(playbookRepo.findByIdCalls).toEqual([]);
      expect(sourceRepo.listCalls).toEqual([]);
      expect(sourceRepo.insertCalls).toEqual([]);
      expect(sourceRepo.findByIdCalls).toEqual([]);
      expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
      expect(sourceRepo.updateCalls).toEqual([]);
    },
  );

  it('returns CURRENT_WORKSPACE_UNAVAILABLE without repository calls', async () => {
    const failure = currentWorkspaceUnavailable();
    const provider = new StubCurrentWorkspaceProvider({ kind: 'unavailable' });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.listCalls).toEqual([]);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves persistence error when workspace lookup fails', async () => {
    const failure = persistenceOperationFailed('workspace.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'error', error: failure });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.listCalls).toEqual([]);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns WORKSPACE_NOT_FOUND without playbook or source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(workspaceNotFound());
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.listCalls).toEqual([]);
  });

  it('preserves persistence error when playbook lookup fails', async () => {
    const failure = persistenceOperationFailed('playbook.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'error', error: failure });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.listCalls).toEqual([]);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns PLAYBOOK_NOT_FOUND without source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(playbookNotFound());
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.listCalls).toEqual([]);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves persistence error when source listing fails', async () => {
    const failure = persistenceOperationFailed('playbookSource.listByPlaybookId');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({
      kind: 'playbook',
      playbook: createPlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'error', error: failure });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.listCalls).toHaveLength(1);
    const listCall = sourceRepo.listCalls[0];
    if (listCall === undefined) throw new Error('Expected a list call.');
    expect(listCall.workspaceId).toBe(workspaceIdValue);
    expect(listCall.playbookId).toBe(playbookIdValue);
    expect(listCall.pagination).toEqual({ offset: 0, limit: 25 });
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns an empty frozen page when no sources exist', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({
      kind: 'playbook',
      playbook: createPlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'page',
      page: { items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 },
    });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value).toEqual({
      items: [],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 0,
    });

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.items)).toBe(true);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns a page with both enabled (with sync history) and disabled sources preserving order', async () => {
    const syncSource = createSourceWithSyncHistory();
    const disabledSource = createDisabledSource();
    const snapshotBefore1 = syncSource.toSnapshot();
    const snapshotBefore2 = disabledSource.toSnapshot();
    const repoPage: Page<PlaybookSourceClass> = {
      items: [syncSource, disabledSource],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 2,
    };

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({
      kind: 'playbook',
      playbook: createPlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value).toEqual({
      items: [
        {
          playbookSourceId: '00000000-0000-0000-0000-000000000003',
          workspaceId: '00000000-0000-0000-0000-000000000001',
          playbookId: '00000000-0000-0000-0000-000000000002',
          type: 'notion',
          status: 'enabled',
          externalRootReference: 'https://example.com/root',
          configurationReference: 'config-1',
          createdAt: '2026-07-17T12:00:00.000Z',
          lastSuccessfulSynchronizationRunId: '00000000-0000-0000-0000-000000000010',
          lastSuccessfulSynchronizationAt: '2026-07-17T13:00:00.000Z',
          lastFailedSynchronizationRunId: '00000000-0000-0000-0000-000000000011',
          lastFailedSynchronizationAt: '2026-07-17T14:00:00.000Z',
        },
        {
          playbookSourceId: '00000000-0000-0000-0000-000000000004',
          workspaceId: '00000000-0000-0000-0000-000000000001',
          playbookId: '00000000-0000-0000-0000-000000000002',
          type: 'notion',
          status: 'disabled',
          externalRootReference: 'https://example.com/other',
          configurationReference: 'config-2',
          createdAt: '2026-07-17T12:00:00.000Z',
          lastSuccessfulSynchronizationRunId: null,
          lastSuccessfulSynchronizationAt: null,
          lastFailedSynchronizationRunId: null,
          lastFailedSynchronizationAt: null,
        },
      ],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 2,
    });

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.items)).toBe(true);
    for (const item of result.value.items) {
      expect(Object.isFrozen(item)).toBe(true);
      expect('revision' in item).toBe(false);
      expect('token' in item).toBe(false);
      expect('credential' in item).toBe(false);
      expect('secret' in item).toBe(false);
    }

    expect(syncSource.toSnapshot()).toEqual(snapshotBefore1);
    expect(disabledSource.toSnapshot()).toEqual(snapshotBefore2);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('supports archived playbooks without error', async () => {
    const archived = createArchivedPlaybook();
    const snapshotBefore = archived.toSnapshot();
    const source = createEnabledSource();
    const repoPage: Page<PlaybookSourceClass> = {
      items: [source],
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 1,
    };

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'playbook', playbook: archived });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.items).toHaveLength(1);
    expect(sourceRepo.listCalls).toHaveLength(1);
    const listCall = sourceRepo.listCalls[0];
    if (listCall === undefined) throw new Error('Expected a list call.');
    expect(listCall.workspaceId).toBe(workspaceIdValue);
    expect(listCall.playbookId).toBe(playbookIdValue);
    expect(listCall.pagination).toEqual({ offset: 0, limit: 25 });
    expect(archived.toSnapshot()).toEqual(snapshotBefore);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves offset, limit, hasMore for a subsequent page', async () => {
    const source = createEnabledSource();
    const repoPage: Page<PlaybookSourceClass> = {
      items: [source],
      offset: 10,
      limit: 5,
      hasMore: true,
      totalCount: 20,
    };

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({
      kind: 'playbook',
      playbook: createPlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'page', page: repoPage });
    const handler = new ListPlaybookSourcesHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle({
      playbookId: '00000000-0000-0000-0000-000000000002',
      offset: 10,
      limit: 5,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.offset).toBe(10);
    expect(result.value.limit).toBe(5);
    expect(result.value.hasMore).toBe(true);
    expect(result.value.totalCount).toBe(20);
    expect(sourceRepo.insertCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });
});
