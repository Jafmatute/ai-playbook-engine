import { describe, expect, it } from 'vitest';

import type { PlaybookSourceId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseWorkspaceId,
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
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
} from '../../persistence/index.js';
import { PLAYBOOK_SOURCE_NOT_FOUND, WORKSPACE_NOT_FOUND } from '../../errors/index.js';
import { GetPlaybookSourceHandler, type GetPlaybookSourceQuery } from './get-playbook-source.js';

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
// Stub: PlaybookSourceRepository
// ---------------------------------------------------------------------------

type SourceResult =
  | { readonly kind: 'source'; readonly source: PlaybookSourceClass }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly findByIdCalls: { workspaceId: WorkspaceId; playbookSourceId: PlaybookSourceId }[] = [];

  constructor(private readonly findResult: SourceResult) {}

  async findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PlaybookSourceClass | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push({ workspaceId, playbookSourceId });
    switch (this.findResult.kind) {
      case 'source':
        return ok(this.findResult.source);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.findResult.error);
    }
  }

  async insert(): Promise<Result<void, never>> {
    return ok(undefined);
  }

  async findEnabledByPlaybookId(): Promise<Result<PlaybookSourceClass | null, never>> {
    return ok(null);
  }

  async listByPlaybookId(): Promise<
    Result<{ items: PlaybookSourceClass[]; offset: number; limit: number; hasMore: boolean }, never>
  > {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
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

const workspaceIdValue = valueFrom(parseWorkspaceId('00000000-0000-0000-0000-000000000001'));
const sourceIdValue = valueFrom(parsePlaybookSourceId('00000000-0000-0000-0000-000000000003'));
const playbookIdValue = valueFrom(parsePlaybookId('00000000-0000-0000-0000-000000000002'));

function valueFrom<T>(result: Result<T, unknown>): T {
  if (!result.success) throw new Error('Invalid fixture.');
  return result.value;
}

function createActiveWorkspace(): WorkspaceClass {
  return valueFrom(
    WorkspaceClass.create({
      workspaceId: workspaceIdValue,
      name: valueFrom(WorkspaceName.create('Test Workspace')),
      createdAt: now(),
    }),
  );
}

function createEnabledSource(): PlaybookSourceClass {
  return PlaybookSourceClass.create({
    playbookSourceId: sourceIdValue,
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
  const source = createEnabledSource();
  source.disable();
  return source;
}

function validQuery(): GetPlaybookSourceQuery {
  return Object.freeze({ playbookSourceId: '00000000-0000-0000-0000-000000000003' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GetPlaybookSourceHandler', () => {
  it('returns the source DTO when found (enabled)', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createEnabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.playbookSourceId).toBe('00000000-0000-0000-0000-000000000003');
    expect(result.value.workspaceId).toBe('00000000-0000-0000-0000-000000000001');
    expect(result.value.playbookId).toBe('00000000-0000-0000-0000-000000000002');
    expect(result.value.type).toBe('notion');
    expect(result.value.status).toBe('enabled');
    expect(result.value.externalRootReference).toBe('https://example.com/root');
    expect(result.value.configurationReference).toBe('config-1');
    expect(result.value.createdAt).toBe('2026-07-17T12:00:00.000Z');
    expect(result.value.lastSuccessfulSynchronizationRunId).toBeNull();
    expect(result.value.lastSuccessfulSynchronizationAt).toBeNull();
    expect(result.value.lastFailedSynchronizationRunId).toBeNull();
    expect(result.value.lastFailedSynchronizationAt).toBeNull();
    expect(Object.isFrozen(result.value)).toBe(true);
    expect('revision' in result.value).toBe(false);
    expect('token' in result.value).toBe(false);
    expect('credential' in result.value).toBe(false);
    expect('secret' in result.value).toBe(false);

    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls[0]).toBe(workspaceIdValue);
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    const sourceCall = sourceRepo.findByIdCalls[0];
    if (sourceCall === undefined) throw new Error('Expected a source findById call.');
    expect(sourceCall.workspaceId).toBe(workspaceIdValue);
    expect(sourceCall.playbookSourceId).toBe(sourceIdValue);
  });

  it('returns the source DTO when found (disabled)', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createDisabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.status).toBe('disabled');
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('returns INVALID_IDENTIFIER before making calls', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createEnabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle({ playbookSourceId: 'not-a-uuid' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({ code: 'INVALID_IDENTIFIER' });

    expect(provider.calls).toEqual([]);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
  });

  it('returns CURRENT_WORKSPACE_UNAVAILABLE without repository calls', async () => {
    const provider = new StubCurrentWorkspaceProvider({ kind: 'unavailable' });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createEnabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({ code: 'CURRENT_WORKSPACE_UNAVAILABLE' });

    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
  });

  it('preserves the persistence error when workspace lookup fails', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'error',
      error: persistenceOperationFailed('workspace.findById'),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createEnabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'workspace.findById' },
    });

    expect(sourceRepo.findByIdCalls).toEqual([]);
  });

  it('returns WORKSPACE_NOT_FOUND without source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'source',
      source: createEnabledSource(),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({ code: WORKSPACE_NOT_FOUND });

    expect(sourceRepo.findByIdCalls).toEqual([]);
  });

  it('preserves the persistence error when source lookup fails', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'error',
      error: persistenceOperationFailed('playbookSource.findById'),
    });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({
      code: PERSISTENCE_OPERATION_FAILED,
      details: { operation: 'playbookSource.findById' },
    });

    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    const persistenceCall = sourceRepo.findByIdCalls[0];
    if (persistenceCall === undefined) throw new Error('Expected a source findById call.');
    expect(persistenceCall.workspaceId).toBe(workspaceIdValue);
    expect(persistenceCall.playbookSourceId).toBe(sourceIdValue);
  });

  it('returns PLAYBOOK_SOURCE_NOT_FOUND when source is null', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'null' });
    const handler = new GetPlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validQuery());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatchObject({
      code: PLAYBOOK_SOURCE_NOT_FOUND,
      message: 'The playbook source was not found in the current workspace.',
      details: { playbookSourceId: '00000000-0000-0000-0000-000000000003' },
    });

    expect(sourceRepo.findByIdCalls).toHaveLength(1);
  });
});
