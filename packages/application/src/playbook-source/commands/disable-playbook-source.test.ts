import { describe, expect, it } from 'vitest';

import type { PlaybookSourceId, WorkspaceId } from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
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
import type { PlaybookSourceRepositoryUpdateError } from '../ports/index.js';
import {
  PersistenceRevision,
  createPersistedAggregate,
  persistenceOperationFailed,
  persistenceRevisionConflict,
} from '../../persistence/index.js';
import {
  workspaceNotFound,
  workspaceNotActive,
  playbookSourceNotFound,
  enabledPlaybookSourceConflict,
} from '../../errors/index.js';
import {
  DisablePlaybookSourceHandler,
  type DisablePlaybookSourceCommand,
} from './disable-playbook-source.js';

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

type SourceFindResult =
  | {
      readonly kind: 'persisted';
      readonly persisted: ReturnType<typeof createPersistedAggregate<PlaybookSourceClass>>;
    }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly findByIdCalls: { workspaceId: WorkspaceId; playbookSourceId: PlaybookSourceId }[] = [];
  readonly updateCalls: { source: PlaybookSourceClass; revision: PersistenceRevision }[] = [];

  #findResult: SourceFindResult;
  #updateResult: Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError> | null = null;

  constructor(findResult: SourceFindResult) {
    this.#findResult = findResult;
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');
    this.#updateResult = ok(revResult.value);
  }

  setUpdateResult(result: Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError>): void {
    this.#updateResult = result;
  }

  setFindResult(result: SourceFindResult): void {
    this.#findResult = result;
  }

  async findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<
    Result<
      ReturnType<typeof createPersistedAggregate<PlaybookSourceClass>> | null,
      PersistenceOperationFailedError
    >
  > {
    this.findByIdCalls.push({ workspaceId, playbookSourceId });
    switch (this.#findResult.kind) {
      case 'persisted':
        return ok(this.#findResult.persisted);
      case 'null':
        return ok(null);
      case 'error':
        return err(this.#findResult.error);
    }
  }

  async insert(): Promise<Result<PersistenceRevision, never>> {
    const rev = PersistenceRevision.from(1);
    if (!rev.success) throw new Error('Expected revision 1 to be valid.');
    return ok(rev.value);
  }

  async findEnabledByPlaybookId(): Promise<Result<PlaybookSourceClass | null, never>> {
    return ok(null);
  }

  async listByPlaybookId(): Promise<
    Result<{ items: PlaybookSourceClass[]; offset: number; limit: number; hasMore: boolean }, never>
  > {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
  }

  async update(
    source: PlaybookSourceClass,
    expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError>> {
    this.updateCalls.push({ source, revision: expectedRevision });
    if (this.#updateResult === null) {
      const rev = PersistenceRevision.from(2);
      if (!rev.success) throw new Error('Expected revision 2 to be valid.');
      return ok(rev.value);
    }
    return this.#updateResult;
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

function createArchivedWorkspace(): WorkspaceClass {
  const ws = createActiveWorkspace();
  valueFrom(ws.archive({ archivedAt: now() }));
  return ws;
}

function createEnabledSource(): PlaybookSourceClass {
  return PlaybookSourceClass.create({
    playbookSourceId: sourceIdValue,
    workspaceId: workspaceIdValue,
    playbookId: valueFrom(parsePlaybookId('00000000-0000-0000-0000-000000000002')),
    type: 'notion',
    externalRootReference: valueFrom(
      PlaybookSourceExternalRootReference.create('https://example.com/root'),
    ),
    configurationReference: valueFrom(PlaybookSourceConfigurationReference.create('config-1')),
    createdAt: now(),
  });
}

function createSourceWithSyncHistory(revisionValue?: number): PlaybookSourceClass {
  const source = valueFrom(
    PlaybookSourceClass.restore({
      playbookSourceId: sourceIdValue,
      workspaceId: workspaceIdValue,
      playbookId: valueFrom(parsePlaybookId('00000000-0000-0000-0000-000000000002')),
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
  void revisionValue;
  return source;
}

function createDisabledSource(): PlaybookSourceClass {
  const source = createEnabledSource();
  valueFrom(source.disable());
  return source;
}

function validCommand(): DisablePlaybookSourceCommand {
  return Object.freeze({ playbookSourceId: '00000000-0000-0000-0000-000000000003' });
}

function persistedSource(
  source: PlaybookSourceClass,
  revisionNumber = 1,
): ReturnType<typeof createPersistedAggregate<PlaybookSourceClass>> {
  const rev = valueFrom(PersistenceRevision.from(revisionNumber));
  return createPersistedAggregate(source, rev);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DisablePlaybookSourceHandler', () => {
  it('rejects an invalid identifier before making calls', async () => {
    const parsed = parsePlaybookSourceId('not-a-uuid');
    if (parsed.success) {
      throw new Error('Expected an invalid playbook source identifier.');
    }

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle({ playbookSourceId: 'not-a-uuid' });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected identifier rejection.');
    expect(result.error).toEqual(parsed.error);

    expect(provider.calls).toEqual([]);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns CURRENT_WORKSPACE_UNAVAILABLE without repository calls', async () => {
    const failure = currentWorkspaceUnavailable();
    const provider = new StubCurrentWorkspaceProvider({ kind: 'unavailable' });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves the persistence error when workspace lookup fails', async () => {
    const failure = persistenceOperationFailed('workspace.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'error', error: failure });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toEqual([workspaceIdValue]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns WORKSPACE_NOT_FOUND without source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(workspaceNotFound());
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns WORKSPACE_NOT_ACTIVE without source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createArchivedWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(workspaceNotActive(workspaceIdValue, 'archived'));
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves the persistence error when source lookup fails', async () => {
    const failure = persistenceOperationFailed('playbookSource.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'error', error: failure });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns PLAYBOOK_SOURCE_NOT_FOUND without update', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'null' });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(playbookSourceNotFound(sourceIdValue));
    expect(provider.calls).toHaveLength(1);
    expect(workspaceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('disables an enabled source with sync history and returns complete DTO', async () => {
    const source = createSourceWithSyncHistory();
    const snapshotBefore = source.toSnapshot();
    const revResult = PersistenceRevision.from(7);
    if (!revResult.success) throw new Error('Expected revision 7 to be valid.');

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(source, revResult.value),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.status).toBe('disabled');
    expect(result.value.playbookSourceId).toBe(snapshotBefore.playbookSourceId);
    expect(result.value.workspaceId).toBe(snapshotBefore.workspaceId);
    expect(result.value.playbookId).toBe(snapshotBefore.playbookId);
    expect(result.value.type).toBe('notion');
    expect(result.value.externalRootReference).toBe(snapshotBefore.externalRootReference);
    expect(result.value.configurationReference).toBe(snapshotBefore.configurationReference);
    expect(result.value.createdAt).toBe(snapshotBefore.createdAt);
    expect(result.value.lastSuccessfulSynchronizationRunId).toBe(
      snapshotBefore.lastSuccessfulSynchronizationRunId,
    );
    expect(result.value.lastSuccessfulSynchronizationAt).toBe(
      snapshotBefore.lastSuccessfulSynchronizationAt,
    );
    expect(result.value.lastFailedSynchronizationRunId).toBe(
      snapshotBefore.lastFailedSynchronizationRunId,
    );
    expect(result.value.lastFailedSynchronizationAt).toBe(
      snapshotBefore.lastFailedSynchronizationAt,
    );

    expect(Object.isFrozen(result.value)).toBe(true);
    expect('revision' in result.value).toBe(false);
    expect('token' in result.value).toBe(false);
    expect('credential' in result.value).toBe(false);
    expect('secret' in result.value).toBe(false);

    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(source);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(revResult.value);

    // Only status changed from enabled to disabled
    expect(source.toSnapshot()).toEqual({
      ...snapshotBefore,
      status: 'disabled',
    });
  });

  it('returns transition error when the source is already disabled', async () => {
    const disabledSource = createDisabledSource();
    const snapshotBefore = disabledSource.toSnapshot();

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toEqual({
      code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED',
      message: 'The playbook source transition is not allowed.',
      details: {
        operation: 'disable',
        currentStatus: 'disabled',
        expectedStatus: 'enabled',
      },
    });

    expect(Object.isFrozen(result.error)).toBe(true);
    expect(Object.isFrozen(result.error.details)).toBe(true);

    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.toSnapshot()).toEqual(snapshotBefore);
  });

  it('propagates playbookSourceNotFound error from update', async () => {
    const source = createEnabledSource();
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');
    const expectedError = playbookSourceNotFound(source.id);

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(source),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(expectedError);
    }
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
  });

  it('propagates enabledPlaybookSourceConflict error from update', async () => {
    const source = createEnabledSource();
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');
    const expectedError = enabledPlaybookSourceConflict(source.playbookId);

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(source),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(expectedError);
    }
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
  });

  it('propagates persistenceRevisionConflict error from update', async () => {
    const source = createEnabledSource();
    const revResult = PersistenceRevision.from(3);
    if (!revResult.success) throw new Error('Expected revision 3 to be valid.');
    const expectedError = persistenceRevisionConflict(revResult.value);

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(source, revResult.value),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(expectedError);
    }
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
  });

  it('propagates persistenceOperationFailed error from update', async () => {
    const source = createEnabledSource();
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');
    const expectedError = persistenceOperationFailed('playbookSource.update');

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(source),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(expectedError);
    }
    expect(sourceRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
  });

  it('does not depend on PlaybookRepository', () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createEnabledSource()),
    });

    const handler = new DisablePlaybookSourceHandler(provider, workspaceRepo, sourceRepo);

    // The constructor only accepts CurrentWorkspaceProvider, WorkspaceRepository, and PlaybookSourceRepository
    expect(handler).toBeInstanceOf(DisablePlaybookSourceHandler);
  });
});
