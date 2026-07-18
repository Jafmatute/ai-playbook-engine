import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'vitest';

import {
  Instant,
  parseWorkspaceId,
  parsePlaybookId,
  WorkspaceName,
  PlaybookName,
  Workspace,
  Playbook,
  type WorkspaceId,
} from '@ai-playbook-engine/core';
import { PLAYBOOK_NAME_CONFLICT } from '@ai-playbook-engine/application';

import { DatabasePool } from '../connection/pool.js';
import { runMigrations } from '../migrations/runner.js';
import { PostgresWorkspaceRepository } from './postgres-workspace-repository.js';
import { PostgresPlaybookRepository } from './postgres-playbook-repository.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

function parsedWorkspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid workspace ID fixture.');
  return result.value;
}

function parsedPlaybookId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid playbook ID fixture.');
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

function playbookName(value = 'Test Playbook') {
  const result = PlaybookName.create(value);
  if (!result.success) throw new Error('Invalid playbook name fixture.');
  return result.value;
}

function createWorkspaceFixture(idSuffix: string, name = 'Test Workspace') {
  const result = Workspace.create({
    workspaceId: parsedWorkspaceId(`00000000-0000-0000-0000-${idSuffix}`),
    name: workspaceName(name),
    createdAt: instant('2026-07-12T10:00:00Z'),
  });
  if (!result.success) throw new Error('Failed to create workspace fixture.');
  return result.value;
}

function createPlaybookFixture(
  workspaceId: WorkspaceId,
  idSuffix: string,
  name = 'Test Playbook',
  description?: string,
) {
  const result = Playbook.create({
    playbookId: parsedPlaybookId(`00000000-0000-0000-0000-${idSuffix}`),
    workspaceId,
    name: playbookName(name),
    createdAt: instant('2026-07-12T10:00:00Z'),
    ...(description === undefined ? {} : { description }),
  });
  if (!result.success) throw new Error('Failed to create playbook fixture.');
  return result.value;
}

describe.runIf(TEST_DATABASE_URL)('PostgresPlaybookRepository', () => {
  let pool: DatabasePool;
  let workspaceRepo: PostgresWorkspaceRepository;
  let playbookRepo: PostgresPlaybookRepository;
  let workspaceId: WorkspaceId;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL not set');
    }
    pool = new DatabasePool({ connectionString: TEST_DATABASE_URL });
    const migrationResult = await runMigrations(pool);
    if (!migrationResult.success) {
      throw new Error('Failed to run migrations for test setup.');
    }
    workspaceRepo = new PostgresWorkspaceRepository(pool);
    playbookRepo = new PostgresPlaybookRepository(pool);
  });

  afterAll(async () => {
    await pool?.close();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM workspaces CASCADE');
    const ws = createWorkspaceFixture('000000000001');
    const insertResult = await workspaceRepo.insert(ws);
    if (!insertResult.success) throw new Error('Failed to insert workspace fixture.');
    workspaceId = ws.id;
  });

  it('insert and findById playbook', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000001');
    const insertResult = await playbookRepo.insert(pb);
    expect(insertResult.success).toBe(true);

    const found = await playbookRepo.findById(workspaceId, pb.id);
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).not.toBeNull();
      expect(found.value!.id).toEqual(pb.id);
    }
  });

  it('findByNormalizedName — found', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000002', 'Alpha Playbook');
    await playbookRepo.insert(pb);

    const found = await playbookRepo.findByNormalizedName(workspaceId, 'alpha playbook', {
      includeArchived: false,
    });
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).not.toBeNull();
      expect(found.value!.id).toEqual(pb.id);
    }
  });

  it('findByNormalizedName — not found', async () => {
    const found = await playbookRepo.findByNormalizedName(workspaceId, 'nonexistent', {
      includeArchived: false,
    });
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).toBeNull();
    }
  });

  it('findByNormalizedName — archived excluded by default', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000003', 'Archived Soon');
    await playbookRepo.insert(pb);

    await pool.query(
      `UPDATE playbooks SET status = 'archived', archived_at = $1, updated_at = $1 WHERE playbook_id = $2`,
      [instant('2026-07-12T11:00:00Z').toString(), pb.id],
    );

    const found = await playbookRepo.findByNormalizedName(workspaceId, 'archived soon', {
      includeArchived: false,
    });
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).toBeNull();
    }

    const foundWithArchived = await playbookRepo.findByNormalizedName(
      workspaceId,
      'archived soon',
      { includeArchived: true },
    );
    expect(foundWithArchived.success).toBe(true);
    if (foundWithArchived.success) {
      expect(foundWithArchived.value).not.toBeNull();
    }
  });

  it('list — ordered', async () => {
    const pbB = createPlaybookFixture(workspaceId, '000000000004', 'Beta');
    const pbA = createPlaybookFixture(workspaceId, '000000000005', 'Alpha');
    await playbookRepo.insert(pbB);
    await playbookRepo.insert(pbA);

    const result = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(2);
      expect(result.value.items[0]!.id).toBe(pbA.id);
      expect(result.value.items[1]!.id).toBe(pbB.id);
    }
  });

  it('list — filtered by status', async () => {
    const activePb = createPlaybookFixture(workspaceId, '000000000006', 'Active One');
    await playbookRepo.insert(activePb);

    const archivedPb = createPlaybookFixture(workspaceId, '000000000007', 'Archived One');
    await playbookRepo.insert(archivedPb);
    await pool.query(
      `UPDATE playbooks SET status = 'archived', archived_at = $1, updated_at = $1 WHERE playbook_id = $2`,
      [instant('2026-07-12T11:00:00Z').toString(), archivedPb.id],
    );

    const activeResult = await playbookRepo.list(
      workspaceId,
      { status: 'active' },
      { offset: 0, limit: 25 },
    );
    expect(activeResult.success).toBe(true);
    if (activeResult.success) {
      expect(activeResult.value.items).toHaveLength(1);
      expect(activeResult.value.items[0]!.id).toBe(activePb.id);
    }
  });

  it('list — filtered by namePrefix', async () => {
    const pbFoo = createPlaybookFixture(workspaceId, '000000000008', 'Foo Launch');
    const pbBar = createPlaybookFixture(workspaceId, '000000000009', 'Bar Launch');
    const pbFood = createPlaybookFixture(workspaceId, '000000000010', 'Food Fight');
    await playbookRepo.insert(pbFoo);
    await playbookRepo.insert(pbBar);
    await playbookRepo.insert(pbFood);

    const result = await playbookRepo.list(
      workspaceId,
      { normalizedNamePrefix: 'foo' },
      { offset: 0, limit: 25 },
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(2);
    }
  });

  it('list — filtered by hasActiveVersion', async () => {
    const withVersion = createPlaybookFixture(workspaceId, '000000000011', 'With Version');
    await playbookRepo.insert(withVersion);

    const activeVersionId = '99999999-9999-9999-9999-999999999999';
    await pool.query(
      `UPDATE playbooks SET active_version_id = $1 WHERE playbook_id = $2`,
      [activeVersionId, withVersion.id]
    );

    const withoutVersion = createPlaybookFixture(workspaceId, '000000000012', 'Without Version');
    await playbookRepo.insert(withoutVersion);

    const withResult = await playbookRepo.list(
      workspaceId,
      { hasActiveVersion: true },
      { offset: 0, limit: 25 },
    );
    expect(withResult.success).toBe(true);
    if (withResult.success) {
      expect(withResult.value.items).toHaveLength(1);
      expect(withResult.value.items[0]!.id).toBe(withVersion.id);
    }

    const withoutResult = await playbookRepo.list(
      workspaceId,
      { hasActiveVersion: false },
      { offset: 0, limit: 25 },
    );
    expect(withoutResult.success).toBe(true);
    if (withoutResult.success) {
      expect(withoutResult.value.items).toHaveLength(1);
      expect(withoutResult.value.items[0]!.id).toBe(withoutVersion.id);
    }

    const allResult = await playbookRepo.list(
      workspaceId,
      {},
      { offset: 0, limit: 25 },
    );
    expect(allResult.success).toBe(true);
    if (allResult.success) {
      expect(allResult.value.items).toHaveLength(2);
    }
  });

  it('list — pagination', async () => {
    for (let i = 0; i < 5; i++) {
      const pb = createPlaybookFixture(workspaceId, `00000000010${i}`, `Playbook ${i}`);
      await playbookRepo.insert(pb);
    }

    const page1 = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 2 });
    expect(page1.success).toBe(true);
    if (page1.success) {
      expect(page1.value.items).toHaveLength(2);
      expect(page1.value.hasMore).toBe(true);
    }

    const page3 = await playbookRepo.list(workspaceId, {}, { offset: 4, limit: 2 });
    expect(page3.success).toBe(true);
    if (page3.success) {
      expect(page3.value.items).toHaveLength(1);
      expect(page3.value.hasMore).toBe(false);
    }
  });

  it('list — totalCount', async () => {
    for (let i = 0; i < 3; i++) {
      const pb = createPlaybookFixture(workspaceId, `00000000020${i}`, `Total ${i}`);
      await playbookRepo.insert(pb);
    }

    const result = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.totalCount).toBe(3);
    }
  });

  it('name conflict (same name in same workspace → PLAYBOOK_NAME_CONFLICT)', async () => {
    const pb1 = createPlaybookFixture(workspaceId, '000000000013', 'Conflict Name');
    const insert1 = await playbookRepo.insert(pb1);
    expect(insert1.success).toBe(true);

    const pb2 = createPlaybookFixture(workspaceId, '000000000014', 'Conflict Name');
    const insert2 = await playbookRepo.insert(pb2);
    expect(insert2.success).toBe(false);
    if (!insert2.success) {
      expect(insert2.error.code).toBe(PLAYBOOK_NAME_CONFLICT);
    }
  });

  it('same name in different workspace (allowed)', async () => {
    const ws2 = createWorkspaceFixture('000000000002', 'Second Workspace');
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ws2.id, ws2.name.value, ws2.name.normalized, 'active', ws2.createdAt.value, ws2.createdAt.value]
    );

    const pb1 = createPlaybookFixture(workspaceId, '000000000015', 'Shared Name');
    const pb2 = createPlaybookFixture(ws2.id, '000000000016', 'Shared Name');

    const insert1 = await playbookRepo.insert(pb1);
    expect(insert1.success).toBe(true);

    const insert2 = await playbookRepo.insert(pb2);
    expect(insert2.success).toBe(true);
  });

  it('workspace isolation', async () => {
    const ws2 = createWorkspaceFixture('000000000003', 'Isolation Workspace');
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ws2.id, ws2.name.value, ws2.name.normalized, 'active', ws2.createdAt.value, ws2.createdAt.value]
    );

    const pbA = createPlaybookFixture(workspaceId, '000000000017', 'Workspace A Playbook');
    await playbookRepo.insert(pbA);

    const listA = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(listA.success).toBe(true);
    if (listA.success) {
      expect(listA.value.items).toHaveLength(1);
    }

    const listB = await playbookRepo.list(ws2.id, {}, { offset: 0, limit: 25 });
    expect(listB.success).toBe(true);
    if (listB.success) {
      expect(listB.value.items).toHaveLength(0);
    }
  });

  it('list — filtered by prefix with literals % and _', async () => {
    const pbUnder = createPlaybookFixture(workspaceId, '000000000021', 'abc_def');
    const pbPercent = createPlaybookFixture(workspaceId, '000000000022', 'abc%def');
    const pbPlain = createPlaybookFixture(workspaceId, '000000000023', 'abcdef');

    await playbookRepo.insert(pbUnder);
    await playbookRepo.insert(pbPercent);
    await playbookRepo.insert(pbPlain);

    const resUnder = await playbookRepo.list(
      workspaceId,
      { normalizedNamePrefix: 'abc_' },
      { offset: 0, limit: 25 },
    );
    expect(resUnder.success).toBe(true);
    if (resUnder.success) {
      expect(resUnder.value.items).toHaveLength(1);
      expect(resUnder.value.items[0]!.id).toBe(pbUnder.id);
    }

    const resPercent = await playbookRepo.list(
      workspaceId,
      { normalizedNamePrefix: 'abc%' },
      { offset: 0, limit: 25 },
    );
    expect(resPercent.success).toBe(true);
    if (resPercent.success) {
      expect(resPercent.value.items).toHaveLength(1);
      expect(resPercent.value.items[0]!.id).toBe(pbPercent.id);
    }
  });

  it('list — returns PERSISTENCE_OPERATION_FAILED if a row has corrupted normalized_name', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000024', 'Corrupted Name');
    await playbookRepo.insert(pb);

    await pool.query(
      `UPDATE playbooks SET normalized_name = 'totally-mismatched-normalized-name' WHERE playbook_id = $1`,
      [pb.id]
    );

    const result = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PERSISTENCE_OPERATION_FAILED');
    }
  });

  it('insert with activeVersionId null → ok', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000018', 'No Version');
    expect(pb.activeVersionId).toBeNull();

    const insertResult = await playbookRepo.insert(pb);
    expect(insertResult.success).toBe(true);

    const found = await playbookRepo.findById(workspaceId, pb.id);
    expect(found.success).toBe(true);
    if (found.success && found.value) {
      expect(found.value.activeVersionId).toBeNull();
    }
  });
});
