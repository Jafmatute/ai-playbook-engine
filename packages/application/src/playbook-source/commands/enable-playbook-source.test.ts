import { describe, expect, it } from 'vitest';

import type { PlaybookId, PlaybookSourceId, WorkspaceId } from '@ai-playbook-engine/core';
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
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { PlaybookSourceRepository } from '../ports/playbook-source-repository.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import {
  PersistenceRevision,
  createPersistedAggregate,
  persistenceOperationFailed,
  persistenceRevisionConflict,
} from '../../persistence/index.js';
import {
  workspaceNotFound,
  workspaceNotActive,
  playbookNotFound,
  playbookArchived,
  playbookSourceNotFound,
  enabledPlaybookSourceConflict,
} from '../../errors/index.js';
import type { PlaybookSourceRepositoryUpdateError } from '../ports/playbook-source-repository.js';
import {
  EnablePlaybookSourceHandler,
  type EnablePlaybookSourceCommand,
} from './enable-playbook-source.js';

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
  | { readonly kind: 'playbook'; readonly playbook: PlaybookClass }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubPlaybookRepository implements PlaybookRepository {
  readonly findByIdCalls: { workspaceId: WorkspaceId; playbookId: PlaybookId }[] = [];

  constructor(private readonly findResult: PlaybookResult) {}

  async findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<
    Result<
      ReturnType<typeof createPersistedAggregate<PlaybookClass>> | null,
      PersistenceOperationFailedError
    >
  > {
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

  async list(): Promise<
    Result<
      { items: PlaybookClass[]; offset: number; limit: number; hasMore: boolean },
      PersistenceOperationFailedError
    >
  > {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
  }

  async insert(): Promise<Result<PersistenceRevision, PersistenceOperationFailedError>> {
    const rev = PersistenceRevision.from(1);
    if (!rev.success) return err(persistenceOperationFailed('playbook.insert'));
    return ok(rev.value);
  }

  async update(): Promise<Result<PersistenceRevision, never>> {
    const rev = PersistenceRevision.from(2);
    if (!rev.success) throw new Error('Expected revision 2 to be valid.');
    return ok(rev.value);
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
  readonly findEnabledByPlaybookIdCalls: {
    workspaceId: WorkspaceId;
    playbookId: PlaybookId;
  }[] = [];

  #findResult: SourceFindResult;
  #updateResult: Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError> | null = null;
  #findEnabledResult: Result<PlaybookSourceClass | null, PersistenceOperationFailedError> =
    ok(null);

  constructor(findResult: SourceFindResult) {
    this.#findResult = findResult;
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');
    this.#updateResult = ok(revResult.value);
  }

  setUpdateResult(result: Result<PersistenceRevision, PlaybookSourceRepositoryUpdateError>): void {
    this.#updateResult = result;
  }

  setFindEnabledResult(
    result: Result<PlaybookSourceClass | null, PersistenceOperationFailedError>,
  ): void {
    this.#findEnabledResult = result;
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

  async findEnabledByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookSourceClass | null, PersistenceOperationFailedError>> {
    this.findEnabledByPlaybookIdCalls.push({ workspaceId, playbookId });
    return this.#findEnabledResult;
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

function createArchivedWorkspace(): WorkspaceClass {
  const ws = createActiveWorkspace();
  valueFrom(ws.archive({ archivedAt: now() }));
  return ws;
}

function createActivePlaybook(): PlaybookClass {
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
  const pb = createActivePlaybook();
  valueFrom(pb.archive({ archivedAt: now() }));
  return pb;
}

function createDisabledSource(): PlaybookSourceClass {
  const source = PlaybookSourceClass.create({
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
  valueFrom(source.disable());
  return source;
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

function createSourceWithSyncHistory(): PlaybookSourceClass {
  const source = valueFrom(
    PlaybookSourceClass.restore({
      playbookSourceId: sourceIdValue,
      workspaceId: workspaceIdValue,
      playbookId: playbookIdValue,
      type: 'notion',
      status: 'disabled',
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
  return source;
}

function validCommand(): EnablePlaybookSourceCommand {
  return Object.freeze({ playbookSourceId: '00000000-0000-0000-0000-000000000003' });
}

function persistedSource(
  source: PlaybookSourceClass,
  revisionNumber = 1,
): ReturnType<typeof createPersistedAggregate<PlaybookSourceClass>> {
  const rev = valueFrom(PersistenceRevision.from(revisionNumber));
  return createPersistedAggregate(source, rev);
}

function createOtherEnabledSourceId(): PlaybookSourceId {
  return valueFrom(parsePlaybookSourceId('00000000-0000-0000-0000-000000000009'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnablePlaybookSourceHandler', () => {
  it('rejects an invalid identifier before making calls', async () => {
    const parsed = parsePlaybookSourceId('not-a-uuid');
    if (parsed.success) throw new Error('Expected an invalid identifier.');

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
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle({ playbookSourceId: 'not-a-uuid' });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected identifier rejection.');
    expect(result.error).toEqual(parsed.error);
    expect(provider.calls).toEqual([]);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns CURRENT_WORKSPACE_UNAVAILABLE without repository calls', async () => {
    const failure = currentWorkspaceUnavailable();
    const provider = new StubCurrentWorkspaceProvider({ kind: 'unavailable' });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(workspaceRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves the persistence error when workspace lookup fails', async () => {
    const failure = persistenceOperationFailed('workspace.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'error', error: failure });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns WORKSPACE_NOT_FOUND without source lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(workspaceNotFound());
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
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
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(workspaceNotActive(workspaceIdValue, 'archived'));
    expect(sourceRepo.findByIdCalls).toEqual([]);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('preserves the persistence error when source findById fails', async () => {
    const failure = persistenceOperationFailed('playbookSource.findById');
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'error', error: failure });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns PLAYBOOK_SOURCE_NOT_FOUND without playbook lookup', async () => {
    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'null' });
    const sourceRepo = new StubPlaybookSourceRepository({ kind: 'null' });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(playbookSourceNotFound(sourceIdValue));
    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
  });

  it('returns transition error when the source is already enabled', async () => {
    const enabledSource = createEnabledSource();
    const snapshotBefore = enabledSource.toSnapshot();

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
      kind: 'persisted',
      persisted: persistedSource(enabledSource),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error).toEqual({
      code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED',
      message: 'The playbook source transition is not allowed.',
      details: {
        operation: 'enable',
        currentStatus: 'enabled',
        expectedStatus: 'disabled',
      },
    });

    expect(playbookRepo.findByIdCalls).toEqual([]);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(enabledSource.toSnapshot()).toEqual(snapshotBefore);
  });

  it('preserves the persistence error when playbook findById fails', async () => {
    const failure = persistenceOperationFailed('playbook.findById');
    const disabledSource = createDisabledSource();

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
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.status).toBe('disabled');
  });

  it('returns PLAYBOOK_NOT_FOUND without enabled source check', async () => {
    const disabledSource = createDisabledSource();

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
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(playbookNotFound());
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.status).toBe('disabled');
  });

  it('returns PLAYBOOK_ARCHIVED without enabled source check', async () => {
    const disabledSource = createDisabledSource();
    const archivedPlaybook = createArchivedPlaybook();

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
      playbook: archivedPlaybook,
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(playbookArchived(archivedPlaybook.id));
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toEqual([]);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.status).toBe('disabled');
  });

  it('propagates persistence error when findEnabledByPlaybookId fails', async () => {
    const failure = persistenceOperationFailed('playbookSource.findEnabledByPlaybookId');
    const disabledSource = createDisabledSource();
    const activePlaybook = createActivePlaybook();

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'playbook', playbook: activePlaybook });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    sourceRepo.setFindEnabledResult(err(failure));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(failure);
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.status).toBe('disabled');
  });

  it('returns enabled source conflict when another source is already enabled', async () => {
    const disabledSource = createDisabledSource();
    const activePlaybook = createActivePlaybook();
    const otherId = createOtherEnabledSourceId();
    const otherEnabledSource = PlaybookSourceClass.create({
      playbookSourceId: otherId,
      workspaceId: workspaceIdValue,
      playbookId: playbookIdValue,
      type: 'notion',
      externalRootReference: valueFrom(
        PlaybookSourceExternalRootReference.create('https://example.com/other'),
      ),
      configurationReference: valueFrom(
        PlaybookSourceConfigurationReference.create('config-other'),
      ),
      createdAt: now(),
    });

    const provider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: workspaceIdValue,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new StubPlaybookRepository({ kind: 'playbook', playbook: activePlaybook });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: persistedSource(disabledSource),
    });
    sourceRepo.setFindEnabledResult(ok(otherEnabledSource));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toEqual(enabledPlaybookSourceConflict(disabledSource.playbookId));
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toEqual([]);
    expect(disabledSource.status).toBe('disabled');
    expect(otherEnabledSource.status).toBe('enabled');
  });

  it('enables a disabled source and returns complete DTO', async () => {
    const source = createSourceWithSyncHistory();
    const snapshotBefore = source.toSnapshot();
    const revResult = PersistenceRevision.from(7);
    if (!revResult.success) throw new Error('Expected revision 7 to be valid.');
    const rev8Result = PersistenceRevision.from(8);
    if (!rev8Result.success) throw new Error('Expected revision 8 to be valid.');

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
      playbook: createActivePlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(source, revResult.value),
    });
    sourceRepo.setUpdateResult(ok(rev8Result.value));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.status).toBe('enabled');
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
    expect(playbookRepo.findByIdCalls).toHaveLength(1);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(source);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(revResult.value);

    // Only status changed from disabled to enabled
    expect(source.toSnapshot()).toEqual({
      ...snapshotBefore,
      status: 'enabled',
    });
  });

  it('propagates playbookSourceNotFound error from update', async () => {
    const disabledSource = createDisabledSource();
    const expectedRevisionResult = PersistenceRevision.from(5);
    if (!expectedRevisionResult.success) throw new Error('Expected revision 5 to be valid.');
    const expectedRevision = expectedRevisionResult.value;
    const expectedError = playbookSourceNotFound(sourceIdValue);

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
      playbook: createActivePlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(disabledSource, expectedRevision),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected update to fail.');
    expect(result.error).toEqual(expectedError);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(disabledSource);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(expectedRevision);
    expect(disabledSource.status).toBe('enabled');
  });

  it('propagates enabledPlaybookSourceConflict error from update', async () => {
    const disabledSource = createDisabledSource();
    const expectedRevisionResult = PersistenceRevision.from(5);
    if (!expectedRevisionResult.success) throw new Error('Expected revision 5 to be valid.');
    const expectedRevision = expectedRevisionResult.value;
    const expectedError = enabledPlaybookSourceConflict(disabledSource.playbookId);

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
      playbook: createActivePlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(disabledSource, expectedRevision),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected update to fail.');
    expect(result.error).toEqual(expectedError);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(disabledSource);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(expectedRevision);
    expect(disabledSource.status).toBe('enabled');
  });

  it('propagates persistenceRevisionConflict error from update', async () => {
    const disabledSource = createDisabledSource();
    const expectedRevisionResult = PersistenceRevision.from(5);
    if (!expectedRevisionResult.success) throw new Error('Expected revision 5 to be valid.');
    const expectedRevision = expectedRevisionResult.value;
    const expectedError = persistenceRevisionConflict(expectedRevision);

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
      playbook: createActivePlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(disabledSource, expectedRevision),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected update to fail.');
    expect(result.error).toEqual(expectedError);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(disabledSource);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(expectedRevision);
    expect(disabledSource.status).toBe('enabled');
  });

  it('propagates persistenceOperationFailed error from update', async () => {
    const disabledSource = createDisabledSource();
    const expectedRevisionResult = PersistenceRevision.from(5);
    if (!expectedRevisionResult.success) throw new Error('Expected revision 5 to be valid.');
    const expectedRevision = expectedRevisionResult.value;
    const expectedError = persistenceOperationFailed('playbookSource.update');

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
      playbook: createActivePlaybook(),
    });
    const sourceRepo = new StubPlaybookSourceRepository({
      kind: 'persisted',
      persisted: createPersistedAggregate(disabledSource, expectedRevision),
    });
    sourceRepo.setUpdateResult(err(expectedError));
    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected update to fail.');
    expect(result.error).toEqual(expectedError);
    expect(sourceRepo.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls).toHaveLength(1);
    expect(sourceRepo.updateCalls[0]?.source).toBe(disabledSource);
    expect(sourceRepo.updateCalls[0]?.revision).toBe(expectedRevision);
    expect(disabledSource.status).toBe('enabled');
  });

  it('does not depend on Clock or PlaybookSourceIdGenerator', () => {
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
      kind: 'persisted',
      persisted: persistedSource(createDisabledSource()),
    });

    const handler = new EnablePlaybookSourceHandler(
      provider,
      workspaceRepo,
      playbookRepo,
      sourceRepo,
    );
    expect(handler).toBeInstanceOf(EnablePlaybookSourceHandler);
  });
});
