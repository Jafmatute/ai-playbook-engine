import { describe, expect, it } from 'vitest';

import type { Workspace } from '@ai-playbook-engine/core';
import { Instant, parseWorkspaceId } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Clock, WorkspaceIdGenerator } from '../../ports/index.js';
import type { PersistenceOperationFailedError } from '../../persistence/index.js';
import { persistenceOperationFailed } from '../../persistence/index.js';
import type { WorkspaceRepository } from '../ports/workspace-repository.js';
import {
  InitializeWorkspaceHandler,
  type InitializeWorkspaceCommand,
} from './initialize-workspace.js';
import type { WorkspaceAlreadyInitializedError } from '../../errors/index.js';
import { WORKSPACE_ALREADY_INITIALIZED } from '../../errors/index.js';

class StubClock implements Clock {
  readonly #now: Instant;

  constructor(now: Instant) {
    this.#now = now;
  }

  now(): Instant {
    return this.#now;
  }
}

class StubWorkspaceIdGenerator implements WorkspaceIdGenerator {
  readonly #id = parseWorkspaceId('11111111-1111-1111-1111-111111111111');
  generate() {
    if (!this.#id.success) throw new Error('bad fixture');
    return this.#id.value;
  }
}

type HasAnyResult =
  | { readonly kind: 'ok'; readonly value: boolean }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

type InsertResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'alreadyInitialized' }
  | { readonly kind: 'error'; readonly error: PersistenceOperationFailedError };

class StubWorkspaceRepository implements WorkspaceRepository {
  readonly #hasAnyResult: HasAnyResult;
  readonly #insertResult: InsertResult;

  constructor(hasAnyResult: HasAnyResult, insertResult: InsertResult = { kind: 'ok' }) {
    this.#hasAnyResult = hasAnyResult;
    this.#insertResult = insertResult;
  }

  async findById(): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    return ok(null);
  }

  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    switch (this.#hasAnyResult.kind) {
      case 'ok':
        return ok(this.#hasAnyResult.value);
      case 'error':
        return err(this.#hasAnyResult.error);
    }
  }

  async insert(): Promise<
    Result<void, WorkspaceAlreadyInitializedError | PersistenceOperationFailedError>
  > {
    switch (this.#insertResult.kind) {
      case 'ok':
        return ok(undefined);
      case 'alreadyInitialized':
        return err({
          code: WORKSPACE_ALREADY_INITIALIZED,
          message: '',
          details: Object.freeze({}),
        });
      case 'error':
        return err(this.#insertResult.error);
    }
  }
}

function validNow(): Instant {
  const now = Instant.parse('2026-07-17T12:00:00.000Z');
  if (!now.success) throw new Error('bad fixture');
  return now.value;
}

function validCommand(): InitializeWorkspaceCommand {
  return Object.freeze({ name: 'My Workspace' });
}

describe('InitializeWorkspaceHandler', () => {
  it('creates a workspace successfully', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({ kind: 'ok', value: false }),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.workspaceId).toBe('11111111-1111-1111-1111-111111111111');
    expect(result.value.name).toBe('My Workspace');
    expect(result.value.status).toBe('active');
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('returns error when workspace already initialized', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({ kind: 'ok', value: true }),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe(WORKSPACE_ALREADY_INITIALIZED);
  });

  it('returns error when name is empty', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({ kind: 'ok', value: false }),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle({ name: '' });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('WORKSPACE_NAME_REQUIRED');
  });

  it('returns error when hasAnyWorkspace fails', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({
        kind: 'error',
        error: persistenceOperationFailed('workspace.hasAnyWorkspace'),
      }),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('PERSISTENCE_OPERATION_FAILED');
  });

  it('returns error when insert fails with persistence error', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository(
        { kind: 'ok', value: false },
        { kind: 'error', error: persistenceOperationFailed('workspace.insert') },
      ),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.code).toBe('PERSISTENCE_OPERATION_FAILED');
  });

  it('uses provided clock instant for timestamps', async () => {
    const now = validNow();
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({ kind: 'ok', value: false }),
      new StubClock(now),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.value.createdAt).toBe(now.toString());
  });

  it('returns frozen DTO', async () => {
    const handler = new InitializeWorkspaceHandler(
      new StubWorkspaceRepository({ kind: 'ok', value: false }),
      new StubClock(validNow()),
      new StubWorkspaceIdGenerator(),
    );

    const result = await handler.handle(validCommand());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });
});
