import { describe, expect, it } from 'vitest';
import type {
  Playbook,
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
  PlaybookSource as PlaybookSourceClass,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
  PlaybookName,
  Workspace as WorkspaceClass,
  WorkspaceName,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';
import type {
  Clock,
  CurrentWorkspaceProvider,
  PlaybookSourceIdGenerator,
} from '../../ports/index.js';
import { currentWorkspaceUnavailable } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type { PlaybookRepository } from '../../playbook/ports/playbook-repository.js';
import type {
  PersistedAggregate,
  PersistenceRevision,
  PersistenceOperationFailedError,
} from '../../persistence/index.js';
import {
  PersistenceRevision as PersistenceRevisionClass,
  persistenceOperationFailed,
} from '../../persistence/index.js';
import type { Page, PaginationRequest } from '../../pagination/index.js';
import type { PlaybookSourceRepository } from '../ports/index.js';
import {
  RegisterPlaybookSourceHandler,
  type RegisterPlaybookSourceCommand,
} from './register-playbook-source.js';

function parsed<T>(result: Result<T, unknown>): T {
  if (!result.success) throw new Error('invalid fixture');
  return result.value;
}
const workspaceId = parsed(parseWorkspaceId('00000000-0000-0000-0000-000000000002'));
const playbookId = parsed(parsePlaybookId('00000000-0000-0000-0000-000000000003'));
const sourceId = parsed(parsePlaybookSourceId('00000000-0000-0000-0000-000000000004'));

function instant(): Instant {
  const result = Instant.parse('2026-07-17T12:00:00.000Z');
  if (!result.success) throw new Error('invalid fixture');
  return result.value;
}

function activeWorkspace(): Workspace {
  const name = WorkspaceName.create('Test workspace');
  if (!name.success) throw new Error('invalid fixture');
  const result = WorkspaceClass.create({ workspaceId, name: name.value, createdAt: instant() });
  if (!result.success) throw new Error('invalid fixture');
  return result.value;
}

function playbook(status: 'active' | 'archived' = 'active'): Playbook {
  const name = PlaybookName.create('Test playbook');
  if (!name.success) throw new Error('invalid fixture');
  const result = PlaybookClass.create({
    playbookId,
    workspaceId,
    name: name.value,
    createdAt: instant(),
  });
  if (!result.success) throw new Error('invalid fixture');
  if (status === 'archived') {
    const archived = result.value.archive({ archivedAt: instant() });
    if (!archived.success) throw new Error('invalid fixture');
  }
  return result.value;
}

const command: RegisterPlaybookSourceCommand = Object.freeze({
  playbookId: '00000000-0000-0000-0000-000000000003',
  type: 'notion',
  externalRootReference: 'https://example.com/root',
  configurationReference: 'config-1',
});

type WorkspaceResult =
  | { readonly kind: 'workspace'; readonly value: Workspace }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };
class WorkspaceStub implements WorkspaceRepository {
  constructor(private readonly result: WorkspaceResult) {}
  async findById(): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    return this.result.kind === 'workspace'
      ? ok(this.result.value)
      : this.result.kind === 'null'
        ? ok(null)
        : err(this.result.error);
  }
  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    return ok(true);
  }
  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

type PlaybookResult =
  | { readonly kind: 'playbook'; readonly value: Playbook }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };
class PlaybookStub implements PlaybookRepository {
  constructor(private readonly result: PlaybookResult) {}
  async findById(): Promise<
    Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>
  > {
    return this.result.kind === 'playbook'
      ? ok({ aggregate: this.result.value, revision: revision() })
      : this.result.kind === 'null'
        ? ok(null)
        : err(this.result.error);
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
    throw new Error('not used');
  }
  async update(): Promise<never> {
    throw new Error('not used');
  }
}

function revision(): PersistenceRevision {
  const result = PersistenceRevisionClass.from(1);
  if (!result.success) throw new Error('invalid fixture');
  return result.value;
}
class CurrentStub implements CurrentWorkspaceProvider {
  constructor(private readonly result: Result<WorkspaceId, CurrentWorkspaceUnavailableError>) {}
  getCurrentWorkspaceId(): Result<WorkspaceId, CurrentWorkspaceUnavailableError> {
    return this.result;
  }
}
class ClockStub implements Clock {
  now(): Instant {
    return instant();
  }
}
class IdStub implements PlaybookSourceIdGenerator {
  generate(): PlaybookSourceId {
    return sourceId;
  }
}
class SourceStub implements PlaybookSourceRepository {
  constructor(
    private readonly existing: PlaybookSource | null = null,
    private readonly failure: PersistenceOperationFailedError | null = null,
  ) {}
  inserted: PlaybookSource | null = null;
  async insert(source: PlaybookSource): Promise<Result<void, PersistenceOperationFailedError>> {
    this.inserted = source;
    return this.failure === null ? ok(undefined) : err(this.failure);
  }
  async findById(): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    return ok(null);
  }
  async findEnabledByPlaybookId(): Promise<
    Result<PlaybookSource | null, PersistenceOperationFailedError>
  > {
    return ok(this.existing);
  }
  async listByPlaybookId(): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>> {
    return ok({ items: [], offset: 0, limit: 25, hasMore: false });
  }
}

function existingSource(): PlaybookSource {
  const external = parsed(
    PlaybookSourceExternalRootReference.create(command.externalRootReference),
  );
  const configuration = parsed(
    PlaybookSourceConfigurationReference.create(command.configurationReference),
  );
  return PlaybookSourceClass.create({
    playbookSourceId: sourceId,
    workspaceId,
    playbookId,
    type: 'notion',
    externalRootReference: external,
    configurationReference: configuration,
    createdAt: instant(),
  });
}

function handler(
  workspace: WorkspaceResult = { kind: 'workspace', value: activeWorkspace() },
  pb: PlaybookResult = { kind: 'playbook', value: playbook() },
  source = new SourceStub(),
  current: Result<WorkspaceId, CurrentWorkspaceUnavailableError> = ok(workspaceId),
): RegisterPlaybookSourceHandler {
  return new RegisterPlaybookSourceHandler(
    new CurrentStub(current),
    new WorkspaceStub(workspace),
    new PlaybookStub(pb),
    source,
    new ClockStub(),
    new IdStub(),
  );
}

const missingWorkspace: WorkspaceResult = { kind: 'null' };
const inactiveWorkspace: WorkspaceResult = {
  kind: 'workspace',
  value: (() => {
    const value = activeWorkspace();
    const result = value.archive({ archivedAt: instant() });
    if (!result.success) throw new Error('fixture');
    return value;
  })(),
};
const missingPlaybook: PlaybookResult = { kind: 'null' };
const archivedPlaybook: PlaybookResult = { kind: 'playbook', value: playbook('archived') };

describe('RegisterPlaybookSourceHandler', () => {
  it('registers a source and returns a frozen output', async () => {
    const repository = new SourceStub();
    const result = await handler(
      { kind: 'workspace', value: activeWorkspace() },
      { kind: 'playbook', value: playbook() },
      repository,
    ).handle(command);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value).toMatchObject({
      playbookId,
      workspaceId,
      type: 'notion',
      status: 'enabled',
    });
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(repository.inserted?.id).toBe(sourceId);
  });
  it.each([
    ['invalid playbook id', { ...command, playbookId: 'bad' }],
    ['unsupported type', { ...command, type: 'csv' }],
    ['invalid external reference', { ...command, externalRootReference: '' }],
    ['invalid configuration reference', { ...command, configurationReference: '' }],
  ])('rejects %s', async (_, invalid) => {
    const result = await handler().handle(invalid);
    expect(result.success).toBe(false);
  });
  it('propagates unavailable current workspace', async () => {
    const result = await handler(
      undefined,
      undefined,
      undefined,
      err(currentWorkspaceUnavailable()),
    ).handle(command);
    expect(result.success).toBe(false);
  });
  it.each([
    ['workspace missing', missingWorkspace],
    ['workspace inactive', inactiveWorkspace],
  ])('rejects %s', async (_, configuration) => {
    const result = await handler(configuration).handle(command);
    expect(result.success).toBe(false);
  });
  it.each([
    ['playbook missing', missingPlaybook],
    ['playbook archived', archivedPlaybook],
  ])('rejects %s', async (_, configuration) => {
    const result = await handler(undefined, configuration).handle(command);
    expect(result.success).toBe(false);
  });
  it('rejects an existing enabled source', async () => {
    const result = await handler(undefined, undefined, new SourceStub(existingSource())).handle(
      command,
    );
    expect(result.success).toBe(false);
  });
  it('propagates source persistence failure', async () => {
    const result = await handler(
      undefined,
      undefined,
      new SourceStub(null, persistenceOperationFailed('playbookSource.insert')),
    ).handle(command);
    expect(result.success).toBe(false);
  });
});
