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
  playbookNameConflict,
  playbookNotFound,
  type PlaybookNameConflictError,
} from '../../errors/index.js';
import type { Page } from '../../pagination/index.js';
import {
  createPersistedAggregate,
  persistenceOperationFailed,
  persistenceRevisionConflict,
  PersistenceRevision,
  type PersistedAggregate,
  type PersistenceOperationFailedError,
} from '../../persistence/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type {
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepository,
  PlaybookRepositoryUpdateError,
} from '../ports/playbook-repository.js';
import { RestorePlaybookHandler } from './restore-playbook.js';

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
function workspaceId(value: string): WorkspaceId {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('invalid workspace id fixture');
  return result.value;
}
function versionId(value: string): PlaybookVersionId {
  const result = parsePlaybookVersionId(value);
  if (!result.success) throw new Error('invalid version id fixture');
  return result.value;
}
function revision(value: number): PersistenceRevision {
  const result = PersistenceRevision.from(value);
  if (!result.success) throw new Error('invalid revision fixture');
  return result.value;
}

const workspaceIdFixture = workspaceId('00000000-0000-0000-0000-000000000002');
const playbookIdFixture = playbookId('11111111-1111-1111-1111-111111111111');
const otherPlaybookId = playbookId('33333333-3333-3333-3333-333333333333');
const activeVersionId = versionId('22222222-2222-2222-2222-222222222222');
const createdAt = instant('2026-07-15T10:00:00.000Z');
const archivedAt = instant('2026-07-17T12:00:00.000Z');
const restoredAt = instant('2026-07-18T12:00:00.000Z');

function activeWorkspace(): Workspace {
  const name = WorkspaceName.create('Test Workspace');
  if (!name.success) throw new Error('invalid workspace fixture');
  const result = Workspace.create({ workspaceId: workspaceIdFixture, name: name.value, createdAt });
  if (!result.success) throw new Error('invalid workspace fixture');
  return result.value;
}
function archivedPlaybook(
  input: {
    readonly id?: PlaybookId;
    readonly updatedAt?: Instant;
    readonly status?: 'active' | 'archived';
  } = {},
): Playbook {
  const name = PlaybookName.create('Release Readiness');
  if (!name.success) throw new Error('invalid playbook fixture');
  const status = input.status ?? 'archived';
  const result = Playbook.restore({
    playbookId: input.id ?? playbookIdFixture,
    workspaceId: workspaceIdFixture,
    name: name.value,
    status,
    description: 'Checks release readiness.',
    activeVersionId,
    createdAt,
    updatedAt: input.updatedAt ?? archivedAt,
    archivedAt: status === 'archived' ? archivedAt : null,
  });
  if (!result.success) throw new Error('invalid playbook fixture');
  return result.value;
}

class StubProvider implements CurrentWorkspaceProvider {
  calls = 0;
  constructor(private readonly available = true) {}
  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    this.calls++;
    return this.available ? ok(workspaceIdFixture) : err(currentWorkspaceUnavailable());
  }
}
class StubWorkspaceRepository implements WorkspaceRepository {
  readonly findByIdCalls: WorkspaceId[] = [];
  constructor(private readonly result: Result<Workspace | null, PersistenceOperationFailedError>) {}
  async findById(
    id: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(id);
    return this.result;
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
  readonly findByNormalizedNameCalls: [WorkspaceId, string, FindPlaybookByNormalizedNameOptions][] =
    [];
  readonly updateCalls: [Playbook, PersistenceRevision][] = [];
  readonly insertCalls: Playbook[] = [];
  constructor(
    private readonly findResult: Result<
      PersistedAggregate<Playbook> | null,
      PersistenceOperationFailedError
    >,
    private readonly nameResult: Result<Playbook | null, PersistenceOperationFailedError> = ok(
      null,
    ),
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
    workspace: WorkspaceId,
    name: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    this.findByNormalizedNameCalls.push([workspace, name, options]);
    return this.nameResult;
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
    expected: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    this.updateCalls.push([playbook, expected]);
    return this.updateResult;
  }
}
class StubClock implements Clock {
  calls = 0;
  now(): Instant {
    this.calls++;
    return restoredAt;
  }
}

function subject(input: {
  readonly providerAvailable?: boolean;
  readonly workspace?: Result<Workspace | null, PersistenceOperationFailedError>;
  readonly find?: Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>;
  readonly name?: Result<Playbook | null, PersistenceOperationFailedError>;
  readonly update?: Result<PersistenceRevision, PlaybookRepositoryUpdateError>;
}) {
  const provider = new StubProvider(input.providerAvailable);
  const workspace = new StubWorkspaceRepository(input.workspace ?? ok(activeWorkspace()));
  const playbooks = new StubPlaybookRepository(input.find ?? ok(null), input.name, input.update);
  const clock = new StubClock();
  return {
    handler: new RestorePlaybookHandler(provider, workspace, playbooks, clock),
    provider,
    workspace,
    playbooks,
    clock,
  };
}

describe('RestorePlaybookHandler', () => {
  it('validates identifier before dependencies', async () => {
    const value = subject({});
    const result = await value.handler.handle({ playbookId: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_IDENTIFIER');
    expect(value.provider.calls).toBe(0);
    expect(value.workspace.findByIdCalls).toHaveLength(0);
    expect(value.playbooks.findByIdCalls).toHaveLength(0);
    expect(value.clock.calls).toBe(0);
  });
  it('returns current workspace unavailable without consulting dependencies', async () => {
    const unavailable = subject({ providerAvailable: false });

    const result = await unavailable.handler.handle({ playbookId: playbookIdFixture });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected current workspace failure.');
    }
    expect(result.error.code).toBe('CURRENT_WORKSPACE_UNAVAILABLE');
    expect(unavailable.workspace.findByIdCalls).toHaveLength(0);
    expect(unavailable.playbooks.findByIdCalls).toHaveLength(0);
    expect(unavailable.clock.calls).toBe(0);
  });
  it('preserves workspace lookup failure and short-circuits dependencies', async () => {
    const error = persistenceOperationFailed('workspace.findById');
    const failed = subject({ workspace: err(error) });

    const result = await failed.handler.handle({ playbookId: playbookIdFixture });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected workspace persistence failure.');
    }
    expect(result.error).toEqual(error);
    expect(failed.playbooks.findByIdCalls).toHaveLength(0);
    expect(failed.clock.calls).toBe(0);
  });
  it('returns missing and inactive workspace errors without loading a playbook', async () => {
    const missing = subject({ workspace: ok(null) });
    const archived = activeWorkspace();
    archived.archive({ archivedAt });
    const inactive = subject({ workspace: ok(archived) });

    const missingResult = await missing.handler.handle({ playbookId: playbookIdFixture });
    const inactiveResult = await inactive.handler.handle({ playbookId: playbookIdFixture });

    expect(missingResult.success).toBe(false);
    if (missingResult.success) throw new Error('Expected missing workspace failure.');
    expect(missingResult.error.code).toBe('WORKSPACE_NOT_FOUND');
    expect(inactiveResult.success).toBe(false);
    if (inactiveResult.success) throw new Error('Expected inactive workspace failure.');
    expect(inactiveResult.error.code).toBe('WORKSPACE_NOT_ACTIVE');
    expect(inactiveResult.error.details).toEqual({
      workspaceId: workspaceIdFixture,
      status: 'archived',
    });
    for (const value of [missing, inactive]) {
      expect(value.playbooks.findByIdCalls).toHaveLength(0);
      expect(value.clock.calls).toBe(0);
      expect(value.playbooks.updateCalls).toHaveLength(0);
    }
  });
  it('loads exact parsed identifiers and preserves playbook lookup failures', async () => {
    const error = persistenceOperationFailed('playbook.findById');
    const failed = subject({ find: err(error) });
    const missing = subject({ find: ok(null) });

    const failedResult = await failed.handler.handle({ playbookId: playbookIdFixture });
    const missingResult = await missing.handler.handle({ playbookId: playbookIdFixture });

    expect(failed.playbooks.findByIdCalls).toEqual([[workspaceIdFixture, playbookIdFixture]]);
    expect(failedResult.success).toBe(false);
    if (failedResult.success) throw new Error('Expected playbook persistence failure.');
    expect(failedResult.error).toEqual(error);
    expect(failed.playbooks.findByNormalizedNameCalls).toHaveLength(0);
    expect(failed.clock.calls).toBe(0);
    expect(failed.playbooks.updateCalls).toHaveLength(0);
    expect(missingResult.success).toBe(false);
    if (missingResult.success) throw new Error('Expected missing playbook failure.');
    expect(missingResult.error.code).toBe('PLAYBOOK_NOT_FOUND');
    expect(missing.playbooks.findByNormalizedNameCalls).toHaveLength(0);
    expect(missing.clock.calls).toBe(0);
    expect(missing.playbooks.updateCalls).toHaveLength(0);
  });
  it('prechecks loaded normalized name and rejects another active playbook without mutation', async () => {
    const playbook = archivedPlaybook();
    const conflict = archivedPlaybook({ id: otherPlaybookId, status: 'active' });
    const value = subject({
      find: ok(createPersistedAggregate(playbook, revision(7))),
      name: ok(conflict),
    });
    const expectedError = playbookNameConflict();
    const result = await value.handler.handle({ playbookId: playbookIdFixture });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected playbook name conflict.');
    expect(result.error.code).toBe('PLAYBOOK_NAME_CONFLICT');
    expect(result.error.message).toBe(expectedError.message);
    expect(result.error.details).toEqual(expectedError.details);
    expect(value.playbooks.findByNormalizedNameCalls).toEqual([
      [workspaceIdFixture, playbook.name.normalizedValue, { includeArchived: false }],
    ]);
    expect(value.clock.calls).toBe(0);
    expect(value.playbooks.updateCalls).toHaveLength(0);
    expect(value.playbooks.insertCalls).toHaveLength(0);
    expect(playbook.status).toBe('archived');
  });
  it('allows same id, restores fields, uses exact revision once, and hides revision', async () => {
    const playbook = archivedPlaybook();
    const expected = revision(7);
    const value = subject({
      find: ok(createPersistedAggregate(playbook, expected)),
      name: ok(playbook),
    });
    const result = await value.handler.handle({ playbookId: playbookIdFixture });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toEqual({
      playbookId: playbookIdFixture,
      workspaceId: workspaceIdFixture,
      name: 'Release Readiness',
      normalizedName: 'release readiness',
      status: 'active',
      description: 'Checks release readiness.',
      activeVersionId,
      createdAt: createdAt.toString(),
      updatedAt: restoredAt.toString(),
      archivedAt: null,
    });
    expect(Object.keys(result.value)).not.toContain('revision');
    expect(value.clock.calls).toBe(1);
    expect(value.playbooks.updateCalls).toEqual([[playbook, expected]]);
    expect(value.playbooks.insertCalls).toHaveLength(0);
  });
  it('preserves precheck and update errors without retry', async () => {
    const precheckError = persistenceOperationFailed('playbook.findByNormalizedName');
    const precheckPlaybook = archivedPlaybook();
    const precheck = subject({
      find: ok(createPersistedAggregate(precheckPlaybook, revision(7))),
      name: err(precheckError),
    });
    const precheckResult = await precheck.handler.handle({ playbookId: playbookIdFixture });
    expect(precheckResult.success).toBe(false);
    if (precheckResult.success) {
      throw new Error('Expected normalized-name lookup failure.');
    }
    expect(precheckResult.error).toEqual(precheckError);
    expect(precheck.clock.calls).toBe(0);
    expect(precheckPlaybook.status).toBe('archived');
    expect(precheck.playbooks.updateCalls).toHaveLength(0);
    expect(precheck.playbooks.insertCalls).toHaveLength(0);
    const errors: PlaybookRepositoryUpdateError[] = [
      playbookNotFound(),
      playbookNameConflict(),
      persistenceRevisionConflict(revision(7)),
      persistenceOperationFailed('playbook.update'),
    ];
    for (const error of errors) {
      const value = subject({
        find: ok(createPersistedAggregate(archivedPlaybook(), revision(7))),
        update: err(error),
      });
      const result = await value.handler.handle({ playbookId: playbookIdFixture });
      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error('Expected update failure.');
      }
      expect(result.error).toEqual(error);
      expect(value.playbooks.updateCalls).toHaveLength(1);
      expect(value.playbooks.findByIdCalls).toHaveLength(1);
      expect(value.playbooks.findByNormalizedNameCalls).toHaveLength(1);
      expect(value.clock.calls).toBe(1);
      expect(value.playbooks.insertCalls).toHaveLength(0);
    }
  });
  it('propagates domain transition failures without update', async () => {
    const active = subject({
      find: ok(createPersistedAggregate(archivedPlaybook({ status: 'active' }), revision(7))),
    });
    const stale = subject({
      find: ok(
        createPersistedAggregate(
          archivedPlaybook({ updatedAt: instant('2026-07-19T12:00:00.000Z') }),
          revision(7),
        ),
      ),
    });
    const activeResult = await active.handler.handle({ playbookId: playbookIdFixture });
    const staleResult = await stale.handler.handle({ playbookId: playbookIdFixture });
    expect(activeResult.success).toBe(false);
    if (!activeResult.success) expect(activeResult.error.code).toBe('PLAYBOOK_NOT_ARCHIVED');
    expect(staleResult.success).toBe(false);
    if (!staleResult.success) expect(staleResult.error.code).toBe('PLAYBOOK_STATE_INVALID');
    expect(active.playbooks.updateCalls).toHaveLength(0);
    expect(stale.playbooks.updateCalls).toHaveLength(0);
  });
});
