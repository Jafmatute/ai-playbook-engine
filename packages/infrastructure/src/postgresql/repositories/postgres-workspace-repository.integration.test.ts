import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'vitest';

import { Instant, parseWorkspaceId, WorkspaceName, Workspace } from '@ai-playbook-engine/core';
import { WORKSPACE_ALREADY_INITIALIZED } from '@ai-playbook-engine/application';

import { DatabasePool } from '../connection/pool.js';
import type { DatabaseConfig } from '../connection/pool.js';
import { runMigrations } from '../migrations/runner.js';
import { PostgresWorkspaceRepository } from './postgres-workspace-repository.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

function parsedWorkspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid workspace ID fixture.');
  return result.value;
}

function instant(value: string) {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid instant fixture.');
  return result.value;
}

function workspaceName(value = 'Test Workspace') {
  const result = WorkspaceName.create(value);
  if (!result.success) throw new Error('Invalid workspace name fixture.');
  return result.value;
}

function createWorkspaceFixture(description?: string) {
  const result = Workspace.create({
    workspaceId: parsedWorkspaceId('00000000-0000-0000-0000-000000000001'),
    name: workspaceName(),
    createdAt: instant('2026-07-12T10:00:00Z'),
    ...(description === undefined ? {} : { description }),
  });
  if (!result.success) throw new Error('Failed to create workspace fixture.');
  return result.value;
}

describe.runIf(TEST_DATABASE_URL)('PostgresWorkspaceRepository', () => {
  let pool: DatabasePool;
  let repo: PostgresWorkspaceRepository;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL not set');
    }
    const config: DatabaseConfig = { connectionString: TEST_DATABASE_URL };
    pool = new DatabasePool(config);
    const migrationResult = await runMigrations(pool);
    if (!migrationResult.success) {
      throw new Error('Failed to run migrations for test setup.');
    }
    repo = new PostgresWorkspaceRepository(pool);
  });

  afterAll(async () => {
    await pool?.close();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM workspaces CASCADE');
  });

  it('insert and findById workspace', async () => {
    const ws = createWorkspaceFixture();
    const insertResult = await repo.insert(ws);
    expect(insertResult.success).toBe(true);

    const found = await repo.findById(ws.id);
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).not.toBeNull();
      expect(found.value!.id).toEqual(ws.id);
    }
  });

  it('hasAnyWorkspace returns false when empty', async () => {
    const result = await repo.hasAnyWorkspace();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(false);
    }
  });

  it('hasAnyWorkspace returns true after insert', async () => {
    const ws = createWorkspaceFixture();
    await repo.insert(ws);

    const result = await repo.hasAnyWorkspace();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(true);
    }
  });

  it('prevents two initializations (insert returns WORKSPACE_ALREADY_INITIALIZED)', async () => {
    const ws1 = createWorkspaceFixture('first');
    const insert1 = await repo.insert(ws1);
    expect(insert1.success).toBe(true);

    const ws2 = Workspace.create({
      workspaceId: parsedWorkspaceId('00000000-0000-0000-0000-000000000002'),
      name: workspaceName('Second Workspace'),
      createdAt: instant('2026-07-12T11:00:00Z'),
      description: 'second',
    });
    if (!ws2.success) throw new Error('Failed to create second workspace fixture.');

    const insert2 = await repo.insert(ws2.value);
    expect(insert2.success).toBe(false);
    if (!insert2.success) {
      expect(insert2.error.code).toBe(WORKSPACE_ALREADY_INITIALIZED);
    }
  });
});
