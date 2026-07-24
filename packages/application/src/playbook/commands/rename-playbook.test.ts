import { describe, expect, it } from 'vitest';

import {
  Instant,
  parsePlaybookId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
  Workspace,
  WorkspaceName,
  type PlaybookId,
  type WorkspaceId,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, CurrentWorkspaceProvider } from '../../ports/index.js';
import type { CurrentWorkspaceUnavailableError } from '../../ports/index.js';
import { currentWorkspaceUnavailable } from '../../ports/index.js';
import type { WorkspaceRepository } from '../../workspace/ports/workspace-repository.js';
import type {
  PlaybookRepository,
  FindPlaybookByNormalizedNameOptions,
  PlaybookRepositoryUpdateError,
} from '../ports/playbook-repository.js';
import {
  WORKSPACE_NOT_FOUND,
  WORKSPACE_NOT_ACTIVE,
  PLAYBOOK_NOT_FOUND,
  PLAYBOOK_NAME_CONFLICT,
  playbookNameConflict,
} from '../../errors/index.js';
import type { PlaybookNameConflictError } from '../../errors/index.js';
import type { Page } from '../../pagination/index.js';
import {
  PersistenceRevision,
  persistenceOperationFailed,
  PERSISTENCE_OPERATION_FAILED,
  persistenceRevisionConflict,
  PERSISTENCE_REVISION_CONFLICT,
  createPersistedAggregate,
} from '../../persistence/index.js';
import type {
  PersistenceOperationFailedError,
  PersistedAggregate,
} from '../../persistence/index.js';
import { RenamePlaybookHandler, type RenamePlaybookCommand } from './rename-playbook.js';

// ---------------------------------------------------------------------------
// Helpers for safe value creation without casts/any/non-null assertions
// ---------------------------------------------------------------------------

function getRevision(v: number): PersistenceRevision {
  const rev = PersistenceRevision.from(v);
  if (!rev.success) {
    throw new Error('invalid revision value');
  }
  return rev.value;
}

function getInstant(s: string): Instant {
  const inst = Instant.parse(s);
  if (!inst.success) {
    throw new Error('invalid instant value');
  }
  return inst.value;
}

function getPlaybookId(s: string): PlaybookId {
  const id = parsePlaybookId(s);
  if (!id.success) {
    throw new Error('invalid playbook id');
  }
  return id.value;
}

function getWorkspaceId(s: string): WorkspaceId {
  const id = parseWorkspaceId(s);
  if (!id.success) {
    throw new Error('invalid workspace id');
  }
  return id.value;
}

function createActiveWorkspace(): Workspace {
  const wsId = getWorkspaceId('00000000-0000-0000-0000-000000000002');
  const name = WorkspaceName.create('Test Workspace');
  if (!name.success) throw new Error('bad fixture');
  const createdAt = getInstant('2026-07-15T10:00:00.000Z');

  const result = Workspace.create({
    workspaceId: wsId,
    name: name.value,
    createdAt: createdAt,
  });
  if (!result.success) throw new Error('bad fixture');
  return result.value;
}

function createArchivedWorkspace(): Workspace {
  const ws = createActiveWorkspace();
  const archivedAt = getInstant('2026-07-16T10:00:00.000Z');
  const result = ws.archive({ archivedAt: archivedAt });
  if (!result.success) throw new Error('bad fixture');
  return ws;
}

function createPlaybook(input: {
  readonly id: string;
  readonly name: string;
  readonly status?: 'active' | 'archived';
  readonly updatedAt?: Instant;
}): Playbook {
  const pId = getPlaybookId(input.id);
  const wId = getWorkspaceId('00000000-0000-0000-0000-000000000002');
  const pName = PlaybookName.create(input.name);
  if (!pName.success) throw new Error('bad playbook name');
  const createdAt = getInstant('2026-07-15T10:00:00.000Z');
  const updatedAt = input.updatedAt ?? createdAt;

  const result = Playbook.restore({
    playbookId: pId,
    workspaceId: wId,
    name: pName.value,
    status: input.status ?? 'active',
    description: null,
    activeVersionId: null,
    createdAt: createdAt,
    updatedAt: updatedAt,
    archivedAt: input.status === 'archived' ? createdAt : null,
  });

  if (!result.success) throw new Error('restore playbook failed');
  return result.value;
}

// ---------------------------------------------------------------------------
// Stubs and Mocks
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

type WorkspaceFindByIdResult =
  | { readonly kind: 'workspace'; readonly workspace: Workspace }
  | { readonly kind: 'null' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly findByIdCalls: WorkspaceId[] = [];
  readonly #findByIdResult: WorkspaceFindByIdResult;

  constructor(findByIdResult: WorkspaceFindByIdResult) {
    this.#findByIdResult = findByIdResult;
  }

  async findById(
    workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push(workspaceId);
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

  async insert(): Promise<Result<void, PersistenceOperationFailedError>> {
    return ok(undefined);
  }
}

class MockPlaybookRepository implements PlaybookRepository {
  readonly findByIdCalls: [WorkspaceId, PlaybookId][] = [];
  readonly findByNormalizedNameCalls: [WorkspaceId, string, FindPlaybookByNormalizedNameOptions][] =
    [];
  readonly insertCalls: Playbook[] = [];
  readonly updateCalls: [Playbook, PersistenceRevision][] = [];

  constructor(
    private readonly findByIdResult: Result<
      PersistedAggregate<Playbook> | null,
      PersistenceOperationFailedError
    > = ok(null),
    private readonly findByNormalizedNameResult: Result<
      Playbook | null,
      PersistenceOperationFailedError
    > = ok(null),
    private readonly updateResult: Result<PersistenceRevision, PlaybookRepositoryUpdateError> = ok(
      getRevision(1),
    ),
  ) {}

  async findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>> {
    this.findByIdCalls.push([workspaceId, playbookId]);
    return this.findByIdResult;
  }

  async findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    this.findByNormalizedNameCalls.push([workspaceId, normalizedName, options]);
    return this.findByNormalizedNameResult;
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
    return ok(getRevision(1));
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
  readonly #now: Instant;
  callsCount = 0;

  constructor(now: Instant) {
    this.#now = now;
  }

  now(): Instant {
    this.callsCount++;
    return this.#now;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RenamePlaybookHandler', () => {
  const validPlaybookIdStr = '11111111-1111-1111-1111-111111111111';
  const validWorkspaceIdObj = getWorkspaceId('00000000-0000-0000-0000-000000000002');
  const validNowInstant = getInstant('2026-07-17T12:00:00.000Z');

  function validCommand(): RenamePlaybookCommand {
    return {
      playbookId: validPlaybookIdStr,
      newName: 'Renamed Playbook',
    };
  }

  // 1. Identificador inválido
  it('returns error when playbook ID is invalid and does not consult repository or clock', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle({ playbookId: 'invalid-uuid', newName: 'New Name' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('INVALID_IDENTIFIER');
    expect(workspaceRepo.findByIdCalls.length).toBe(0);
    expect(playbookRepo.findByIdCalls.length).toBe(0);
    expect(clock.callsCount).toBe(0);
  });

  // 2. Workspace actual no disponible
  it('returns error when current workspace is unavailable', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({ kind: 'unavailable' });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('CURRENT_WORKSPACE_UNAVAILABLE');
    expect(workspaceRepo.findByIdCalls.length).toBe(0);
    expect(playbookRepo.findByIdCalls.length).toBe(0);
  });

  // 3. Fallo al consultar Workspace
  it('propagates error when workspace repository findById fails', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'error',
      error: persistenceOperationFailed('workspace.findById'),
    });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(workspaceRepo.findByIdCalls).toContainEqual(validWorkspaceIdObj);
    expect(playbookRepo.findByIdCalls.length).toBe(0);
  });

  // 4. Workspace inexistente
  it('returns error when workspace is not found', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({ kind: 'null' });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(WORKSPACE_NOT_FOUND);
    expect(playbookRepo.findByIdCalls.length).toBe(0);
  });

  // 5. Workspace inactivo
  it('returns error when workspace is inactive', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createArchivedWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(WORKSPACE_NOT_ACTIVE);
    expect(playbookRepo.findByIdCalls.length).toBe(0);
  });

  // 6. Nombre requerido o inválido
  it('returns error when the new name is invalid', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository();
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle({ playbookId: validPlaybookIdStr, newName: '' });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('PLAYBOOK_NAME_REQUIRED');
    expect(playbookRepo.findByIdCalls.length).toBe(0);
  });

  // 7. Fallo al cargar Playbook
  it('propagates error when loading the playbook fails', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository(
      err(persistenceOperationFailed('playbook.findById')),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(playbookRepo.findByIdCalls).toContainEqual([
      validWorkspaceIdObj,
      getPlaybookId(validPlaybookIdStr),
    ]);
  });

  // 8. Playbook inexistente
  it('returns error when playbook does not exist in workspace', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbookRepo = new MockPlaybookRepository(ok(null));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PLAYBOOK_NOT_FOUND);
  });

  // 9. Consulta por nombre recibe parámetros exactos
  it('checks uniqueness with exact parameters', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    await handler.handle(validCommand());

    expect(playbookRepo.findByNormalizedNameCalls.length).toBe(1);
    const call = playbookRepo.findByNormalizedNameCalls[0];
    if (call === undefined) {
      throw new Error('call is undefined');
    }
    expect(call[0]).toBe(validWorkspaceIdObj);
    expect(call[1]).toBe('renamed playbook'); // normalized value of 'Renamed Playbook'
    expect(call[2]).toEqual({ includeArchived: false });
  });

  // 10. Otro Playbook con el mismo nombre produce PLAYBOOK_NAME_CONFLICT
  it('returns name conflict when another playbook is found with the same normalized name', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));

    const otherPlaybook = createPlaybook({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Renamed Playbook',
    });

    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(otherPlaybook));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PLAYBOOK_NAME_CONFLICT);

    // 13. Ante conflicto previo no se llama a rename, update, ni clock
    expect(playbook.name.value).toBe('Old Name');
    expect(playbookRepo.updateCalls.length).toBe(0);
    expect(clock.callsCount).toBe(0);
  });

  // 11. El mismo Playbook encontrado por nombre no produce conflicto
  it('allows renaming to the same name or formatting change without conflict', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Renamed Playbook' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));

    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(playbook));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    expect(playbookRepo.updateCalls.length).toBe(1);
  });

  // 12. Si precheck falla, propagar PERSISTENCE_OPERATION_FAILED
  it('propagates error when name uniqueness precheck fails', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));

    const playbookRepo = new MockPlaybookRepository(
      ok(persisted),
      err(persistenceOperationFailed('playbook.findByNormalizedName')),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
    expect(playbookRepo.updateCalls.length).toBe(0);
    expect(clock.callsCount).toBe(0);
  });

  // 14. Playbook activo se renombra
  // 15. Se utiliza exactamente el instante retornado por Clock
  it('renames an active playbook successfully and sets updatedAt from clock', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.name).toBe('Renamed Playbook');
    expect(result.value.updatedAt).toBe(validNowInstant.toString());
    expect(playbook.name.value).toBe('Renamed Playbook');
    expect(playbook.updatedAt.compare(validNowInstant)).toBe(0);
  });

  // 16. Playbook archivado retorna PLAYBOOK_OPERATION_NOT_ALLOWED
  it('returns operation not allowed when renaming an archived playbook', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({
      id: validPlaybookIdStr,
      name: 'Old Name',
      status: 'archived',
    });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('PLAYBOOK_OPERATION_NOT_ALLOWED');
    expect(playbookRepo.updateCalls.length).toBe(0);
  });

  // 17. Timestamp anterior al updatedAt retorna PLAYBOOK_STATE_INVALID
  it('returns state invalid when clock now is before the last updatedAt of playbook', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const futureInstant = getInstant('2026-07-20T12:00:00.000Z');
    const playbook = createPlaybook({
      id: validPlaybookIdStr,
      name: 'Old Name',
      updatedAt: futureInstant,
    });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null));
    // Clock is behind the playbook's updatedAt
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('PLAYBOOK_STATE_INVALID');
    // 18. Ante error de dominio no se llama a update()
    expect(playbookRepo.updateCalls.length).toBe(0);
  });

  // 19. update() recibe exactamente la misma instancia cargada y la misma revisión
  it('invokes update with the correct aggregate and expected revision', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const expectedRevision = getRevision(5);
    const persisted = createPersistedAggregate(playbook, expectedRevision);
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    await handler.handle(validCommand());

    expect(playbookRepo.updateCalls.length).toBe(1);
    const call = playbookRepo.updateCalls[0];
    if (call === undefined) {
      throw new Error('call is undefined');
    }
    expect(call[0]).toBe(playbook);
    expect(call[1]).toBe(expectedRevision);
  });

  // 21. La revisión retornada por update() no aparece en el output
  it('does not expose persistence revision in the return output', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null), ok(getRevision(6)));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Check that there is no revision in PlaybookOutput
    const outputKeys = Object.keys(result.value);
    expect(outputKeys).not.toContain('revision');
  });

  // 22. Propaga PLAYBOOK_NAME_CONFLICT proveniente del update
  it('propagates PLAYBOOK_NAME_CONFLICT from update result', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(
      ok(persisted),
      ok(null),
      err(playbookNameConflict()),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PLAYBOOK_NAME_CONFLICT);
  });

  // 23. Propaga PERSISTENCE_REVISION_CONFLICT
  it('propagates PERSISTENCE_REVISION_CONFLICT from update result without retry', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(
      ok(persisted),
      ok(null),
      err(persistenceRevisionConflict(getRevision(5))),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PERSISTENCE_REVISION_CONFLICT);
    // 26. Un conflicto de revisión no genera retry (only 1 update call)
    expect(playbookRepo.updateCalls.length).toBe(1);
  });

  // 24. Propaga PLAYBOOK_NOT_FOUND
  it('propagates PLAYBOOK_NOT_FOUND from update result', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(
      ok(persisted),
      ok(null),
      err({ code: PLAYBOOK_NOT_FOUND, message: 'Not found', details: {} }),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PLAYBOOK_NOT_FOUND);
  });

  // 25. Propaga PERSISTENCE_OPERATION_FAILED
  it('propagates PERSISTENCE_OPERATION_FAILED from update result', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(
      ok(persisted),
      ok(null),
      err(persistenceOperationFailed('playbook.update')),
    );
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(PERSISTENCE_OPERATION_FAILED);
  });

  // 27. insert() nunca es invocado
  it('never calls insert on the playbook repository during rename', async () => {
    const workspaceProvider = new StubCurrentWorkspaceProvider({
      kind: 'workspaceId',
      workspaceId: validWorkspaceIdObj,
    });
    const workspaceRepo = new StubWorkspaceRepository({
      kind: 'workspace',
      workspace: createActiveWorkspace(),
    });
    const playbook = createPlaybook({ id: validPlaybookIdStr, name: 'Old Name' });
    const persisted = createPersistedAggregate(playbook, getRevision(5));
    const playbookRepo = new MockPlaybookRepository(ok(persisted), ok(null));
    const clock = new StubClock(validNowInstant);

    const handler = new RenamePlaybookHandler(
      workspaceProvider,
      workspaceRepo,
      playbookRepo,
      clock,
    );
    await handler.handle(validCommand());

    expect(playbookRepo.insertCalls.length).toBe(0);
  });
});
