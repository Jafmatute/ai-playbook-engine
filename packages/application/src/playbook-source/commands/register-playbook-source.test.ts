import { describe, expect, it } from 'vitest';
import type {
  Playbook,
  PlaybookId,
  PlaybookSource,
  PlaybookSourceId,
  Workspace,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
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
  Clock,
  CurrentWorkspaceProvider,
  PlaybookSourceIdGenerator,
} from '../../ports/index.js';
import {
  currentWorkspaceUnavailable,
  type CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type { Page, PaginationRequest } from '../../pagination/index.js';
import {
  PersistenceRevision,
  persistenceOperationFailed,
  type PersistedAggregate,
  type PersistenceOperationFailedError,
  type PersistenceRevision as PersistenceRevisionType,
} from '../../persistence/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import {
  enabledPlaybookSourceConflict,
  playbookArchived,
  playbookNotFound,
  playbookSourceTypeUnsupported,
  workspaceNotActive,
  workspaceNotFound,
} from '../../errors/index.js';
import type {
  PlaybookSourceRepository,
  PlaybookSourceRepositoryInsertError,
} from '../ports/index.js';
import {
  RegisterPlaybookSourceHandler,
  type RegisterPlaybookSourceCommand,
} from './register-playbook-source.js';

function valueFrom<T>(result: Result<T, unknown>): T {
  if (!result.success) throw new Error('Invalid fixture.');
  return result.value;
}

function errorFrom<E>(result: Result<unknown, E>): E {
  if (result.success) throw new Error('Expected an error fixture.');
  return result.error;
}

const workspaceId = valueFrom(parseWorkspaceId('00000000-0000-0000-0000-000000000002'));
const playbookId = valueFrom(parsePlaybookId('00000000-0000-0000-0000-000000000003'));
const sourceId = valueFrom(parsePlaybookSourceId('00000000-0000-0000-0000-000000000004'));
const command: RegisterPlaybookSourceCommand = Object.freeze({
  playbookId: '00000000-0000-0000-0000-000000000003',
  type: 'notion',
  externalRootReference: 'https://example.com/root',
  configurationReference: 'config-1',
});

function instant(): Instant {
  return valueFrom(Instant.parse('2026-07-17T12:00:00.000Z'));
}

function revision(): PersistenceRevisionType {
  return valueFrom(PersistenceRevision.from(1));
}

function activeWorkspace(): Workspace {
  return valueFrom(
    WorkspaceClass.create({
      workspaceId,
      name: valueFrom(WorkspaceName.create('Test workspace')),
      createdAt: instant(),
    }),
  );
}

function archivedWorkspace(): Workspace {
  const workspace = activeWorkspace();
  valueFrom(workspace.archive({ archivedAt: instant() }));
  return workspace;
}

function playbook(archived = false): Playbook {
  const aggregate = valueFrom(
    PlaybookClass.create({
      playbookId,
      workspaceId,
      name: valueFrom(PlaybookName.create('Test playbook')),
      createdAt: instant(),
    }),
  );
  if (archived) valueFrom(aggregate.archive({ archivedAt: instant() }));
  return aggregate;
}

function existingSource(): PlaybookSource {
  return PlaybookSourceClass.create({
    playbookSourceId: sourceId,
    workspaceId,
    playbookId,
    type: 'notion',
    externalRootReference: valueFrom(
      PlaybookSourceExternalRootReference.create(command.externalRootReference),
    ),
    configurationReference: valueFrom(
      PlaybookSourceConfigurationReference.create(command.configurationReference),
    ),
    createdAt: instant(),
  });
}

type WorkspaceFindCall = Readonly<{ workspaceId: WorkspaceId }>;
class WorkspaceStub implements WorkspaceRepository {
  readonly findByIdCalls: WorkspaceFindCall[] = [];

  constructor(
    private readonly findResult: Result<Workspace | null, PersistenceOperationFailedError> = ok(
      activeWorkspace(),
    ),
  ) {}

  async findById(
    requestedWorkspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(Object.freeze({ workspaceId: requestedWorkspaceId }));
    return this.findResult;
  }

  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    return ok(true);
  }

  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

type PlaybookFindCall = Readonly<{ workspaceId: WorkspaceId; playbookId: PlaybookId }>;
class PlaybookStub implements PlaybookRepository {
  readonly findByIdCalls: PlaybookFindCall[] = [];

  constructor(
    private readonly findResult: Result<
      PersistedAggregate<Playbook> | null,
      PersistenceOperationFailedError
    > = ok({ aggregate: playbook(), revision: revision() }),
  ) {}

  async findById(
    requestedWorkspaceId: WorkspaceId,
    requestedPlaybookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(
      Object.freeze({ workspaceId: requestedWorkspaceId, playbookId: requestedPlaybookId }),
    );
    return this.findResult;
  }

  async findByNormalizedName(): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async list(
    _: WorkspaceId,
    __: never,
    ___: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
  }

  async insert(): Promise<never> {
    throw new Error('Not used.');
  }

  async update(): Promise<never> {
    throw new Error('Not used.');
  }
}

type SourcePrecheckCall = Readonly<{ workspaceId: WorkspaceId; playbookId: PlaybookId }>;
class SourceStub implements PlaybookSourceRepository {
  readonly findEnabledByPlaybookIdCalls: SourcePrecheckCall[] = [];
  readonly insertCalls: PlaybookSource[] = [];

  constructor(
    private readonly precheckResult: Result<
      PlaybookSource | null,
      PersistenceOperationFailedError
    > = ok(null),
    private readonly insertResult: Result<void, PlaybookSourceRepositoryInsertError> = ok(
      undefined,
    ),
  ) {}

  async findEnabledByPlaybookId(
    requestedWorkspaceId: WorkspaceId,
    requestedPlaybookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    this.findEnabledByPlaybookIdCalls.push(
      Object.freeze({ workspaceId: requestedWorkspaceId, playbookId: requestedPlaybookId }),
    );
    return this.precheckResult;
  }

  async insert(source: PlaybookSource): Promise<Result<void, PlaybookSourceRepositoryInsertError>> {
    this.insertCalls.push(source);
    return this.insertResult;
  }

  async findById(): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async listByPlaybookId(): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
  }
}

class CurrentWorkspaceStub implements CurrentWorkspaceProvider {
  readonly calls: undefined[] = [];

  constructor(
    private readonly result: Result<WorkspaceId, CurrentWorkspaceUnavailableError> = ok(
      workspaceId,
    ),
  ) {}

  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    this.calls.push(undefined);
    return this.result;
  }
}

class ClockStub implements Clock {
  readonly calls: undefined[] = [];

  now(): Instant {
    this.calls.push(undefined);
    return instant();
  }
}

class SourceIdGeneratorStub implements PlaybookSourceIdGenerator {
  readonly calls: undefined[] = [];

  generate(): PlaybookSourceId {
    this.calls.push(undefined);
    return sourceId;
  }
}

function setup(
  current = new CurrentWorkspaceStub(),
  workspace = new WorkspaceStub(),
  playbookRepository = new PlaybookStub(),
  source = new SourceStub(),
): Readonly<{
  handler: RegisterPlaybookSourceHandler;
  current: CurrentWorkspaceStub;
  workspace: WorkspaceStub;
  playbook: PlaybookStub;
  source: SourceStub;
  clock: ClockStub;
  idGenerator: SourceIdGeneratorStub;
}> {
  const clock = new ClockStub();
  const idGenerator = new SourceIdGeneratorStub();
  return Object.freeze({
    handler: new RegisterPlaybookSourceHandler(
      current,
      workspace,
      playbookRepository,
      source,
      clock,
      idGenerator,
    ),
    current,
    workspace,
    playbook: playbookRepository,
    source,
    clock,
    idGenerator,
  });
}

function expectNoCalls(context: ReturnType<typeof setup>): void {
  expect(context.current.calls).toEqual([]);
  expect(context.workspace.findByIdCalls).toEqual([]);
  expect(context.playbook.findByIdCalls).toEqual([]);
  expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
  expect(context.source.insertCalls).toEqual([]);
  expect(context.clock.calls).toEqual([]);
  expect(context.idGenerator.calls).toEqual([]);
}

function expectSourceCreationNotAttempted(context: ReturnType<typeof setup>): void {
  expect(context.source.insertCalls).toEqual([]);
  expect(context.clock.calls).toEqual([]);
  expect(context.idGenerator.calls).toEqual([]);
}

describe('RegisterPlaybookSourceHandler', () => {
  it('rejects an invalid playbook id before making calls', async () => {
    const context = setup();
    const invalid = { ...command, playbookId: 'bad' };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(errorFrom(parsePlaybookId(invalid.playbookId)));
    expectNoCalls(context);
  });

  it('rejects source type casing before making calls', async () => {
    const context = setup();
    const result = await context.handler.handle({ ...command, type: 'Notion' });
    expect(errorFrom(result)).toEqual(playbookSourceTypeUnsupported('Notion'));
    expectNoCalls(context);
  });

  it('rejects trailing source type whitespace before making calls', async () => {
    const context = setup();
    const result = await context.handler.handle({ ...command, type: 'notion ' });
    expect(errorFrom(result)).toEqual(playbookSourceTypeUnsupported('notion '));
    expectNoCalls(context);
  });

  it('rejects an uppercase source type before making calls', async () => {
    const context = setup();

    const result = await context.handler.handle({
      ...command,
      type: 'NOTION',
    });

    expect(errorFrom(result)).toEqual(playbookSourceTypeUnsupported('NOTION'));

    expectNoCalls(context);
  });

  it('rejects an invalid external root reference before making calls', async () => {
    const context = setup();
    const invalid = { ...command, externalRootReference: '' };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceExternalRootReference.create(invalid.externalRootReference)),
    );
    expectNoCalls(context);
  });

  it('rejects an invalid configuration reference before making calls', async () => {
    const context = setup();
    const invalid = { ...command, configurationReference: '' };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceConfigurationReference.create(invalid.configurationReference)),
    );
    expectNoCalls(context);
  });

  it('rejects an external root reference longer than 512 characters before making calls', async () => {
    const context = setup();
    const invalid = { ...command, externalRootReference: 'a'.repeat(513) };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceExternalRootReference.create(invalid.externalRootReference)),
    );
    expectNoCalls(context);
  });

  it('rejects an external root reference with a control character before making calls', async () => {
    const context = setup();
    const invalid = { ...command, externalRootReference: 'root\u0000reference' };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceExternalRootReference.create(invalid.externalRootReference)),
    );
    expectNoCalls(context);
  });

  it('rejects a configuration reference longer than 512 characters before making calls', async () => {
    const context = setup();
    const invalid = { ...command, configurationReference: 'a'.repeat(513) };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceConfigurationReference.create(invalid.configurationReference)),
    );
    expectNoCalls(context);
  });

  it('rejects a configuration reference with a control character before making calls', async () => {
    const context = setup();
    const invalid = { ...command, configurationReference: 'config\u007freference' };
    const result = await context.handler.handle(invalid);
    expect(errorFrom(result)).toEqual(
      errorFrom(PlaybookSourceConfigurationReference.create(invalid.configurationReference)),
    );
    expectNoCalls(context);
  });

  it('returns the current workspace error without repository calls', async () => {
    const context = setup(new CurrentWorkspaceStub(err(currentWorkspaceUnavailable())));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(currentWorkspaceUnavailable());
    expect(context.current.calls).toHaveLength(1);
    expect(context.workspace.findByIdCalls).toEqual([]);
    expect(context.playbook.findByIdCalls).toEqual([]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns the workspace lookup error without later calls', async () => {
    const failure = persistenceOperationFailed('workspace.findById');
    const context = setup(undefined, new WorkspaceStub(err(failure)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(failure);
    expect(context.workspace.findByIdCalls).toEqual([Object.freeze({ workspaceId })]);
    expect(context.playbook.findByIdCalls).toEqual([]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns workspace not found without later calls', async () => {
    const context = setup(undefined, new WorkspaceStub(ok(null)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(workspaceNotFound());
    expect(context.playbook.findByIdCalls).toEqual([]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns workspace not active without later calls', async () => {
    const context = setup(undefined, new WorkspaceStub(ok(archivedWorkspace())));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(workspaceNotActive(workspaceId, 'archived'));
    expect(context.playbook.findByIdCalls).toEqual([]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns the playbook lookup error without source calls', async () => {
    const failure = persistenceOperationFailed('playbook.findById');
    const context = setup(undefined, undefined, new PlaybookStub(err(failure)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(failure);
    expect(context.playbook.findByIdCalls).toEqual([Object.freeze({ workspaceId, playbookId })]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns playbook not found without source calls', async () => {
    const context = setup(undefined, undefined, new PlaybookStub(ok(null)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(playbookNotFound());
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns playbook archived without source calls', async () => {
    const context = setup(
      undefined,
      undefined,
      new PlaybookStub(ok({ aggregate: playbook(true), revision: revision() })),
      new SourceStub(ok(existingSource())),
    );
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(playbookArchived(playbookId));
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns the source precheck error without inserting', async () => {
    const failure = persistenceOperationFailed('playbookSource.findEnabledByPlaybookId');
    const context = setup(undefined, undefined, undefined, new SourceStub(err(failure)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(failure);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([
      Object.freeze({ workspaceId, playbookId }),
    ]);
    expectSourceCreationNotAttempted(context);
  });

  it('returns the enabled source conflict without inserting', async () => {
    const context = setup(undefined, undefined, undefined, new SourceStub(ok(existingSource())));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(enabledPlaybookSourceConflict(playbookId));
    expect(context.source.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expectSourceCreationNotAttempted(context);
  });

  it('returns an insert conflict after creating the source once', async () => {
    const failure = enabledPlaybookSourceConflict(playbookId);
    const context = setup(undefined, undefined, undefined, new SourceStub(ok(null), err(failure)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(failure);
    expect(context.current.calls).toHaveLength(1);
    expect(context.workspace.findByIdCalls).toHaveLength(1);
    expect(context.playbook.findByIdCalls).toHaveLength(1);
    expect(context.source.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(context.source.insertCalls).toHaveLength(1);
    expect(context.clock.calls).toHaveLength(1);
    expect(context.idGenerator.calls).toHaveLength(1);
  });

  it('returns an insert error after creating the source', async () => {
    const failure = persistenceOperationFailed('playbookSource.insert');
    const context = setup(undefined, undefined, undefined, new SourceStub(ok(null), err(failure)));
    const result = await context.handler.handle(command);
    expect(errorFrom(result)).toEqual(failure);
    expect(context.current.calls).toHaveLength(1);
    expect(context.workspace.findByIdCalls).toHaveLength(1);
    expect(context.playbook.findByIdCalls).toHaveLength(1);
    expect(context.source.findEnabledByPlaybookIdCalls).toHaveLength(1);
    expect(context.source.insertCalls).toHaveLength(1);
    expect(context.clock.calls).toHaveLength(1);
    expect(context.idGenerator.calls).toHaveLength(1);
  });

  it('registers a source with the checked workspace and playbook and returns frozen output', async () => {
    const context = setup();
    const result = await context.handler.handle(command);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected registration to succeed.');
    expect(result.value).toEqual({
      playbookSourceId: sourceId,
      workspaceId,
      playbookId,
      type: 'notion',
      externalRootReference: 'https://example.com/root',
      configurationReference: 'config-1',
      status: 'enabled',
      createdAt: '2026-07-17T12:00:00.000Z',
      lastSuccessfulSynchronizationAt: null,
      lastSuccessfulSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
      lastFailedSynchronizationRunId: null,
    });
    expect(Object.isFrozen(result.value)).toBe(true);
    expect('revision' in result.value).toBe(false);
    expect('token' in result.value).toBe(false);
    expect('credential' in result.value).toBe(false);
    expect('secret' in result.value).toBe(false);
    expect(context.current.calls).toHaveLength(1);
    expect(context.workspace.findByIdCalls).toEqual([Object.freeze({ workspaceId })]);
    expect(context.playbook.findByIdCalls).toEqual([Object.freeze({ workspaceId, playbookId })]);
    expect(context.source.findEnabledByPlaybookIdCalls).toEqual([
      Object.freeze({ workspaceId, playbookId }),
    ]);
    expect(context.source.insertCalls).toHaveLength(1);
    const inserted = context.source.insertCalls[0];
    if (inserted === undefined) throw new Error('Expected inserted source.');
    expect(inserted.toSnapshot()).toEqual({
      playbookSourceId: sourceId,
      workspaceId,
      playbookId,
      type: 'notion',
      externalRootReference: 'https://example.com/root',
      configurationReference: 'config-1',
      status: 'enabled',
      createdAt: '2026-07-17T12:00:00.000Z',
      lastSuccessfulSynchronizationAt: null,
      lastSuccessfulSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
      lastFailedSynchronizationRunId: null,
    });
    expect(context.clock.calls).toEqual([undefined]);
    expect(context.idGenerator.calls).toEqual([undefined]);
  });
});
