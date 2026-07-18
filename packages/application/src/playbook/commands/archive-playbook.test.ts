import { describe, expect, it } from 'vitest';

import {
  Instant,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
  Workspace,
  WorkspaceName,
  type PlaybookId,
  type PlaybookVersionId,
  type WorkspaceId,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, CurrentWorkspaceProvider } from '../../ports/index.js';
import {
  currentWorkspaceUnavailable,
  type CurrentWorkspaceUnavailableError,
} from '../../ports/index.js';
import {
  PLAYBOOK_NAME_CONFLICT,
  PLAYBOOK_NOT_FOUND,
  WORKSPACE_NOT_ACTIVE,
  WORKSPACE_NOT_FOUND,
  playbookNameConflict,
  playbookNotFound,
  type PlaybookNameConflictError,
} from '../../errors/index.js';
import type { Page } from '../../pagination/index.js';
import {
  PERSISTENCE_OPERATION_FAILED,
  PERSISTENCE_REVISION_CONFLICT,
  PersistenceRevision,
  createPersistedAggregate,
  persistenceOperationFailed,
  persistenceRevisionConflict,
  type PersistedAggregate,
  type PersistenceOperationFailedError,
} from '../../persistence/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type {
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepository,
  PlaybookRepositoryUpdateError,
} from '../ports/playbook-repository.js';
import { ArchivePlaybookHandler, type ArchivePlaybookCommand } from './archive-playbook.js';

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('invalid instant fixture');
  return result.value;
}

function playbookId(value: string): PlaybookId {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('invalid playbook id fixture');
  return result.value;
}

function playbookVersionId(value: string): PlaybookVersionId {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('invalid playbook version id fixture');
  return result.value;
}

function workspaceId(value: string): WorkspaceId {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('invalid workspace id fixture');
  return result.value;
}

function revision(value: number): PersistenceRevision {
  const result = PersistenceRevision.from(value);
  if (!result.success) throw new Error('invalid revision fixture');
  return result.value;
}

function activeWorkspace(): Workspace {
  const name = WorkspaceName.create('Test Workspace');
  if (!name.success) throw new Error('invalid workspace fixture');
  const result = Workspace.create({
    workspaceId: fixtureWorkspaceId,
    name: name.value,
    createdAt: createdAt,
  });
  if (!result.success) throw new Error('invalid workspace fixture');
  return result.value;
}

function archivedWorkspace(): Workspace {
  const workspace = activeWorkspace();
  const result = workspace.archive({ archivedAt: archivedAt });
  if (!result.success) throw new Error('invalid workspace fixture');
  return workspace;
}

function restoredPlaybook(
  input: {
    readonly status?: 'active' | 'archived';
    readonly updatedAt?: Instant;
    readonly activeVersionId?: PlaybookVersionId | null;
  } = {},
): Playbook {
  const name = PlaybookName.create('Release Readiness');
  if (!name.success) throw new Error('invalid playbook fixture');
  const status = input.status ?? 'active';
  const result = Playbook.restore({
    playbookId: fixturePlaybookId,
    workspaceId: fixtureWorkspaceId,
    name: name.value,
    status,
    description: 'Checks release readiness.',
    activeVersionId: input.activeVersionId ?? fixtureVersionId,
    createdAt,
    updatedAt: input.updatedAt ?? (status === 'archived' ? archivedAt : createdAt),
    archivedAt: status === 'archived' ? archivedAt : null,
  });
  if (!result.success) throw new Error('invalid playbook fixture');
  return result.value;
}

type CurrentWorkspaceResult =
  | { readonly kind: 'available'; readonly workspaceId: WorkspaceId }
  | { readonly kind: 'unavailable' };

class StubCurrentWorkspaceProvider implements CurrentWorkspaceProvider {
  readonly #result: CurrentWorkspaceResult;
  calls = 0;

  constructor(result: CurrentWorkspaceResult) {
    this.#result = result;
  }

  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    this.calls++;
    if (this.#result.kind === 'available') return ok(this.#result.workspaceId);
    return err(currentWorkspaceUnavailable());
  }
}

type WorkspaceResult =
  | { readonly kind: 'workspace'; readonly workspace: Workspace }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly findByIdCalls: WorkspaceId[] = [];

  constructor(private readonly result: WorkspaceResult) {}

  async findById(
    id: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(id);
    if (this.result.kind === 'workspace') return ok(this.result.workspace);
    if (this.result.kind === 'notFound') return ok(null);
    return err(this.result.error);
  }

  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    return ok(false);
  }

  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

class StubPlaybookRepository implements PlaybookRepository {
  readonly findByIdCalls: [WorkspaceId, PlaybookId][] = [];
  readonly updateCalls: [Playbook, PersistenceRevision][] = [];
  readonly insertCalls: Playbook[] = [];

  constructor(
    private readonly findResult: Result<
      PersistedAggregate<Playbook> | null,
      PersistenceOperationFailedError
    >,
    private readonly updateResult: Result<PersistenceRevision, PlaybookRepositoryUpdateError> = ok(
      revision(8),
    ),
  ) {}

  async findById(
    workspace: WorkspaceId,
    playbook: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push([workspace, playbook]);
    return this.findResult;
  }

  async findByNormalizedName(
    _workspaceId: WorkspaceId,
    _normalizedName: string,
    _options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async list(): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false, totalCount: 0 });
  }

  async insert(
    playbook: Playbook,
  ): Promise<
    Result<PersistenceRevision, PlaybookNameConflictError | PersistenceOperationFailedError>
  > {
    this.insertCalls.push(playbook);
    return ok(revision(1));
  }

  async update(
    playbook: Playbook,
    expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    this.updateCalls.push([playbook, expectedRevision]);
    return this.updateResult;
  }
}

class StubClock implements Clock {
  calls = 0;

  constructor(private readonly value: Instant) {}

  now(): Instant {
    this.calls++;
    return this.value;
  }
}

const fixturePlaybookId = playbookId('11111111-1111-1111-1111-111111111111');
const fixtureWorkspaceId = workspaceId('00000000-0000-0000-0000-000000000002');
const fixtureVersionId = playbookVersionId('22222222-2222-2222-2222-222222222222');
const createdAt = instant('2026-07-15T10:00:00.000Z');
const archivedAt = instant('2026-07-17T12:00:00.000Z');

function command(): ArchivePlaybookCommand {
  return { playbookId: fixturePlaybookId };
}

function handlerFor(input: {
  readonly workspace?: WorkspaceResult;
  readonly playbook?: Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>;
  readonly update?: Result<PersistenceRevision, PlaybookRepositoryUpdateError>;
  readonly currentWorkspace?: CurrentWorkspaceResult;
  readonly clock?: Instant;
}): {
  readonly handler: ArchivePlaybookHandler;
  readonly currentWorkspace: StubCurrentWorkspaceProvider;
  readonly workspaceRepository: StubWorkspaceRepository;
  readonly playbookRepository: StubPlaybookRepository;
  readonly clock: StubClock;
} {
  const currentWorkspace = new StubCurrentWorkspaceProvider(
    input.currentWorkspace ?? { kind: 'available', workspaceId: fixtureWorkspaceId },
  );
  const workspaceRepository = new StubWorkspaceRepository(
    input.workspace ?? { kind: 'workspace', workspace: activeWorkspace() },
  );
  const playbookRepository = new StubPlaybookRepository(input.playbook ?? ok(null), input.update);
  const clock = new StubClock(input.clock ?? archivedAt);
  return {
    handler: new ArchivePlaybookHandler(
      currentWorkspace,
      workspaceRepository,
      playbookRepository,
      clock,
    ),
    currentWorkspace,
    workspaceRepository,
    playbookRepository,
    clock,
  };
}

describe('ArchivePlaybookHandler', () => {
  it('validates the playbook id before consulting dependencies', async () => {
    const subject = handlerFor({});

    const result = await subject.handler.handle({ playbookId: 'not-an-id' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('INVALID_IDENTIFIER');
    expect(subject.currentWorkspace.calls).toBe(0);
    expect(subject.workspaceRepository.findByIdCalls).toHaveLength(0);
    expect(subject.playbookRepository.findByIdCalls).toHaveLength(0);
    expect(subject.clock.calls).toBe(0);
  });

  it('short-circuits when no current workspace is available', async () => {
    const subject = handlerFor({ currentWorkspace: { kind: 'unavailable' } });

    const result = await subject.handler.handle(command());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('CURRENT_WORKSPACE_UNAVAILABLE');
    expect(subject.workspaceRepository.findByIdCalls).toHaveLength(0);
    expect(subject.playbookRepository.findByIdCalls).toHaveLength(0);
  });

  it('propagates workspace lookup failures and handles missing and inactive workspaces', async () => {
    const failed = handlerFor({
      workspace: { kind: 'error', error: persistenceOperationFailed('workspace.findById') },
    });
    const missing = handlerFor({ workspace: { kind: 'notFound' } });
    const inactive = handlerFor({
      workspace: { kind: 'workspace', workspace: archivedWorkspace() },
    });

    const failedResult = await failed.handler.handle(command());
    const missingResult = await missing.handler.handle(command());
    const inactiveResult = await inactive.handler.handle(command());

    expect(failedResult.success).toBe(false);
    if (!failedResult.success) expect(failedResult.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(missingResult.success).toBe(false);
    if (!missingResult.success) expect(missingResult.error.code).toBe(WORKSPACE_NOT_FOUND);
    expect(inactiveResult.success).toBe(false);
    if (!inactiveResult.success) expect(inactiveResult.error.code).toBe(WORKSPACE_NOT_ACTIVE);
    expect(failed.playbookRepository.findByIdCalls).toHaveLength(0);
    expect(missing.playbookRepository.findByIdCalls).toHaveLength(0);
    expect(inactive.playbookRepository.findByIdCalls).toHaveLength(0);
  });

  it('uses the exact workspace and playbook ids to find the aggregate', async () => {
    const subject = handlerFor({ playbook: err(persistenceOperationFailed('playbook.findById')) });

    await subject.handler.handle(command());

    expect(subject.workspaceRepository.findByIdCalls).toEqual([fixtureWorkspaceId]);
    expect(subject.playbookRepository.findByIdCalls).toEqual([
      [fixtureWorkspaceId, fixturePlaybookId],
    ]);
  });

  it('propagates playbook lookup errors and returns not found for an absent playbook', async () => {
    const failed = handlerFor({ playbook: err(persistenceOperationFailed('playbook.findById')) });
    const missing = handlerFor({ playbook: ok(null) });

    const failedResult = await failed.handler.handle(command());
    const missingResult = await missing.handler.handle(command());

    expect(failedResult.success).toBe(false);
    if (!failedResult.success) expect(failedResult.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(missingResult.success).toBe(false);
    if (!missingResult.success) expect(missingResult.error.code).toBe(PLAYBOOK_NOT_FOUND);
    expect(failed.clock.calls).toBe(0);
    expect(missing.clock.calls).toBe(0);
  });

  it('archives a restored aggregate while preserving its fields and hiding its revision', async () => {
    const playbook = restoredPlaybook();
    const expectedRevision = revision(7);
    const subject = handlerFor({
      playbook: ok(createPersistedAggregate(playbook, expectedRevision)),
    });

    const result = await subject.handler.handle(command());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toEqual({
      playbookId: fixturePlaybookId,
      workspaceId: fixtureWorkspaceId,
      name: 'Release Readiness',
      normalizedName: 'release readiness',
      status: 'archived',
      description: 'Checks release readiness.',
      activeVersionId: fixtureVersionId,
      createdAt: createdAt.toString(),
      updatedAt: archivedAt.toString(),
      archivedAt: archivedAt.toString(),
    });
    expect(Object.keys(result.value)).not.toContain('revision');
    expect(subject.clock.calls).toBe(1);
    expect(subject.playbookRepository.updateCalls).toHaveLength(1);
    const update = subject.playbookRepository.updateCalls[0];
    if (update === undefined) throw new Error('missing update call');
    expect(update[0]).toBe(playbook);
    expect(update[1]).toBe(expectedRevision);
    expect(subject.playbookRepository.insertCalls).toHaveLength(0);
  });

  it('does not update an already archived playbook', async () => {
    const playbook = restoredPlaybook({ status: 'archived' });
    const subject = handlerFor({ playbook: ok(createPersistedAggregate(playbook, revision(7))) });

    const result = await subject.handler.handle(command());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('PLAYBOOK_ALREADY_ARCHIVED');
    expect(subject.clock.calls).toBe(1);
    expect(subject.playbookRepository.updateCalls).toHaveLength(0);
  });

  it('does not update when the archive timestamp would invalidate state', async () => {
    const playbook = restoredPlaybook({ updatedAt: instant('2026-07-18T12:00:00.000Z') });
    const subject = handlerFor({ playbook: ok(createPersistedAggregate(playbook, revision(7))) });

    const result = await subject.handler.handle(command());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('PLAYBOOK_STATE_INVALID');
    expect(subject.clock.calls).toBe(1);
    expect(subject.playbookRepository.updateCalls).toHaveLength(0);
  });

  it('propagates every update error, performs no revision-conflict retry, and never inserts', async () => {
    const errors: PlaybookRepositoryUpdateError[] = [
      playbookNotFound(),
      playbookNameConflict(),
      persistenceRevisionConflict(revision(7)),
      persistenceOperationFailed('playbook.update'),
    ];
    const expectedCodes = [
      PLAYBOOK_NOT_FOUND,
      PLAYBOOK_NAME_CONFLICT,
      PERSISTENCE_REVISION_CONFLICT,
      PERSISTENCE_OPERATION_FAILED,
    ];

    for (const [index, updateError] of errors.entries()) {
      const playbook = restoredPlaybook();
      const subject = handlerFor({
        playbook: ok(createPersistedAggregate(playbook, revision(7))),
        update: err(updateError),
      });

      const result = await subject.handler.handle(command());

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe(expectedCodes[index]);
      expect(subject.playbookRepository.updateCalls).toHaveLength(1);
      expect(subject.playbookRepository.insertCalls).toHaveLength(0);
    }
  });
});
