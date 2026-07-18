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
import {
  PLAYBOOK_NAME_CONFLICT,
  PLAYBOOK_NOT_FOUND,
  PERSISTENCE_REVISION_CONFLICT,
  PersistenceRevision,
} from '@ai-playbook-engine/application';
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

async function insertWorkspaceFixture(pool: DatabasePool, workspace: Workspace): Promise<void> {
  const snapshot = workspace.toSnapshot();
  await pool.query(
    `INSERT INTO workspaces (
      workspace_id, name, normalized_name, status,
      description, created_at, updated_at, archived_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      snapshot.workspaceId,
      snapshot.name,
      snapshot.normalizedName,
      snapshot.status,
      snapshot.description,
      snapshot.createdAt,
      snapshot.updatedAt,
      snapshot.archivedAt,
    ],
  );
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
    if (insertResult.success) {
      expect(insertResult.value.value).toBe(1);
    }

    const found = await playbookRepo.findById(workspaceId, pb.id);
    expect(found.success).toBe(true);
    if (found.success) {
      expect(found.value).not.toBeNull();
      const val = found.value;
      if (val !== null) {
        expect(val.aggregate.id).toEqual(pb.id);
        expect(val.revision.value).toBe(1);
      }
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
      const val = found.value;
      if (val !== null) {
        expect(val.id).toEqual(pb.id);
      }
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
      const itemA = result.value.items[0];
      const itemB = result.value.items[1];
      expect(itemA).toBeDefined();
      expect(itemB).toBeDefined();
      if (itemA !== undefined && itemB !== undefined) {
        expect(itemA.id).toBe(pbA.id);
        expect(itemB.id).toBe(pbB.id);
      }
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
      const item = activeResult.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(activePb.id);
      }
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
    await pool.query(`UPDATE playbooks SET active_version_id = $1 WHERE playbook_id = $2`, [
      activeVersionId,
      withVersion.id,
    ]);

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
      const item = withResult.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(withVersion.id);
      }
    }

    const withoutResult = await playbookRepo.list(
      workspaceId,
      { hasActiveVersion: false },
      { offset: 0, limit: 25 },
    );
    expect(withoutResult.success).toBe(true);
    if (withoutResult.success) {
      expect(withoutResult.value.items).toHaveLength(1);
      const item = withoutResult.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(withoutVersion.id);
      }
    }

    const allResult = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(allResult.success).toBe(true);
    if (allResult.success) {
      expect(allResult.value.items).toHaveLength(2);
      const item1 = allResult.value.items[0];
      const item2 = allResult.value.items[1];
      expect(item1).toBeDefined();
      expect(item2).toBeDefined();
      if (item1 !== undefined && item2 !== undefined) {
        const ids = [item1.id, item2.id];
        expect(ids).toContain(withVersion.id);
        expect(ids).toContain(withoutVersion.id);
      }
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
    await insertWorkspaceFixture(pool, ws2);

    const pb1 = createPlaybookFixture(workspaceId, '000000000015', 'Shared Name');
    const pb2 = createPlaybookFixture(ws2.id, '000000000016', 'Shared Name');

    const insert1 = await playbookRepo.insert(pb1);
    expect(insert1.success).toBe(true);

    const insert2 = await playbookRepo.insert(pb2);
    expect(insert2.success).toBe(true);
  });

  it('workspace isolation', async () => {
    const ws2 = createWorkspaceFixture('000000000003', 'Isolation Workspace');
    await insertWorkspaceFixture(pool, ws2);

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
      const item = resUnder.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(pbUnder.id);
      }
    }

    const resPercent = await playbookRepo.list(
      workspaceId,
      { normalizedNamePrefix: 'abc%' },
      { offset: 0, limit: 25 },
    );
    expect(resPercent.success).toBe(true);
    if (resPercent.success) {
      expect(resPercent.value.items).toHaveLength(1);
      const item = resPercent.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(pbPercent.id);
      }
    }
  });

  it('list — returns PERSISTENCE_OPERATION_FAILED if a row has corrupted normalized_name', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000024', 'Corrupted Name');
    await playbookRepo.insert(pb);

    await pool.query(
      `UPDATE playbooks SET normalized_name = 'totally-mismatched-normalized-name' WHERE playbook_id = $1`,
      [pb.id],
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
      expect(found.value.aggregate.activeVersionId).toBeNull();
    }
  });

  it('list — returns empty page when no playbooks exist in workspace', async () => {
    const result = await playbookRepo.list(workspaceId, {}, { offset: 0, limit: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toEqual([]);
      expect(result.value.offset).toBe(0);
      expect(result.value.limit).toBe(25);
      expect(result.value.hasMore).toBe(false);
      expect(result.value.totalCount).toBe(0);
    }
  });

  it('list — filtered by combined status, prefix, and active version', async () => {
    const archivedAt = '2026-07-12T11:00:00.000Z';

    const pb1 = createPlaybookFixture(workspaceId, '000000000091', 'AI Engineering One');
    await playbookRepo.insert(pb1);
    const pb1ActiveVersionId = '99999999-9999-9999-9999-000000000001';
    await pool.query(
      `UPDATE playbooks
       SET status = 'archived',
           active_version_id = $1,
           archived_at = $2,
           updated_at = $2
       WHERE playbook_id = $3`,
      [pb1ActiveVersionId, archivedAt, pb1.id],
    );

    const pb2 = createPlaybookFixture(workspaceId, '000000000092', 'Other Engineering');
    await playbookRepo.insert(pb2);
    const pb2ActiveVersionId = '99999999-9999-9999-9999-000000000002';
    await pool.query(
      `UPDATE playbooks
       SET active_version_id = $1
       WHERE playbook_id = $2`,
      [pb2ActiveVersionId, pb2.id],
    );

    const pb3 = createPlaybookFixture(workspaceId, '000000000093', 'AI Engineering Three');
    await playbookRepo.insert(pb3);

    const pb4 = createPlaybookFixture(workspaceId, '000000000094', 'AI Engineering Four');
    await playbookRepo.insert(pb4);
    const pb4ActiveVersionId = '99999999-9999-9999-9999-000000000004';
    await pool.query(
      `UPDATE playbooks
       SET active_version_id = $1
       WHERE playbook_id = $2`,
      [pb4ActiveVersionId, pb4.id],
    );

    const result = await playbookRepo.list(
      workspaceId,
      {
        status: 'active',
        normalizedNamePrefix: 'ai engineering',
        hasActiveVersion: true,
      },
      { offset: 0, limit: 25 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(1);
      const item = result.value.items[0];
      expect(item).toBeDefined();
      if (item !== undefined) {
        expect(item.id).toBe(pb4.id);
      }
    }
  });

  it('list — orders duplicate archived names by normalized_name ASC then playbook_id ASC', async () => {
    const archivedAt = '2026-07-12T11:00:00.000Z';

    const pbA = createPlaybookFixture(workspaceId, '000000000082', 'Duplicate Name');
    await playbookRepo.insert(pbA);
    await pool.query(
      `UPDATE playbooks
       SET status = 'archived',
           archived_at = $1,
           updated_at = $1
       WHERE playbook_id = $2`,
      [archivedAt, pbA.id],
    );

    const pbC = createPlaybookFixture(workspaceId, '000000000083', 'Alpha Duplicate');
    await playbookRepo.insert(pbC);
    await pool.query(
      `UPDATE playbooks
       SET status = 'archived',
           archived_at = $1,
           updated_at = $1
       WHERE playbook_id = $2`,
      [archivedAt, pbC.id],
    );

    const pbB = createPlaybookFixture(workspaceId, '000000000081', 'Duplicate Name');
    await playbookRepo.insert(pbB);
    await pool.query(
      `UPDATE playbooks
       SET status = 'archived',
           archived_at = $1,
           updated_at = $1
       WHERE playbook_id = $2`,
      [archivedAt, pbB.id],
    );

    const result = await playbookRepo.list(
      workspaceId,
      { status: 'archived' },
      { offset: 0, limit: 25 },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.items).toHaveLength(3);
      const item0 = result.value.items[0];
      const item1 = result.value.items[1];
      const item2 = result.value.items[2];
      expect(item0).toBeDefined();
      expect(item1).toBeDefined();
      expect(item2).toBeDefined();
      if (item0 !== undefined && item1 !== undefined && item2 !== undefined) {
        expect(item0.id).toBe(pbC.id);
        expect(item1.id).toBe(pbB.id);
        expect(item2.id).toBe(pbA.id);
      }
    }
  });

  it('update playbook — optimistic concurrency success and increment', async () => {
    // 1. insertar un Playbook;
    const pb = createPlaybookFixture(workspaceId, '000000000301');
    const insertRes = await playbookRepo.insert(pb);
    expect(insertRes.success).toBe(true);
    if (!insertRes.success) return;

    // 2. comprobar revisión inicial 1;
    const revision1 = insertRes.value;
    expect(revision1.value).toBe(1);

    // 3. recuperarlo mediante findById();
    const found1 = await playbookRepo.findById(workspaceId, pb.id);
    expect(found1.success).toBe(true);
    if (!found1.success || found1.value === null) return;
    const loadedPb = found1.value.aggregate;

    // 4. guardar: playbookId, workspaceId, createdAt;
    const savedPlaybookId = loadedPb.id;
    const savedWorkspaceId = loadedPb.workspaceId;
    const savedCreatedAt = loadedPb.createdAt;

    // 5. mutar la copia recuperada mediante updateDescription() o rename();
    const transitionTime1 = Instant.parse('2026-07-18T10:00:00.000Z');
    expect(transitionTime1.success).toBe(true);
    if (!transitionTime1.success) return;
    const nameResult1 = PlaybookName.create('Mutated Playbook 1');
    expect(nameResult1.success).toBe(true);
    if (!nameResult1.success) return;
    const renameRes = loadedPb.rename({
      name: nameResult1.value,
      updatedAt: transitionTime1.value,
    });
    expect(renameRes.success).toBe(true);

    // 6. ejecutar update(aggregate, revision);
    const updateRes1 = await playbookRepo.update(loadedPb, found1.value.revision);
    expect(updateRes1.success).toBe(true);
    if (!updateRes1.success) return;

    // 7. comprobar revisión 2;
    const revision2 = updateRes1.value;
    expect(revision2.value).toBe(2);

    // 8. recuperarlo nuevamente;
    const found2 = await playbookRepo.findById(workspaceId, pb.id);
    expect(found2.success).toBe(true);
    if (!found2.success || found2.value === null) return;

    // 9. comprobar el valor modificado;
    expect(found2.value.aggregate.name.value).toBe('Mutated Playbook 1');

    // 10. comprobar que se preservan: playbookId, workspaceId, createdAt;
    expect(found2.value.aggregate.id).toEqual(savedPlaybookId);
    expect(found2.value.aggregate.workspaceId).toEqual(savedWorkspaceId);
    expect(found2.value.aggregate.createdAt.compare(savedCreatedAt)).toBe(0);

    // 11. realizar una segunda transición válida;
    const transitionTime2 = Instant.parse('2026-07-18T11:00:00.000Z');
    expect(transitionTime2.success).toBe(true);
    if (!transitionTime2.success) return;
    const descRes = found2.value.aggregate.updateDescription({
      description: 'Mutated Description 2',
      updatedAt: transitionTime2.value,
    });
    expect(descRes.success).toBe(true);

    // 12. actualizar usando revisión 2;
    const updateRes2 = await playbookRepo.update(found2.value.aggregate, found2.value.revision);
    expect(updateRes2.success).toBe(true);
    if (!updateRes2.success) return;

    // 13. comprobar revisión 3;
    const revision3 = updateRes2.value;
    expect(revision3.value).toBe(3);

    // 14. volver a cargar y comprobar el segundo cambio.
    const found3 = await playbookRepo.findById(workspaceId, pb.id);
    expect(found3.success).toBe(true);
    if (!found3.success || found3.value === null) return;
    expect(found3.value.aggregate.description).toBe('Mutated Description 2');
    expect(found3.value.revision.value).toBe(3);
  });

  it('update playbook — optimistic concurrency conflict due to mismatched revision', async () => {
    // 1. insertar Playbook con revisión 1;
    const pb = createPlaybookFixture(workspaceId, '000000000302');
    const insertRes = await playbookRepo.insert(pb);
    expect(insertRes.success).toBe(true);
    if (!insertRes.success) return;
    expect(insertRes.value.value).toBe(1);

    // 2. cargar dos copias independientes mediante dos llamadas a findById();
    const loadA = await playbookRepo.findById(workspaceId, pb.id);
    const loadB = await playbookRepo.findById(workspaceId, pb.id);
    expect(loadA.success).toBe(true);
    expect(loadB.success).toBe(true);
    if (!loadA.success || loadA.value === null) return;
    if (!loadB.success || loadB.value === null) return;

    // 3. verificar que ambas tienen revisión 1;
    expect(loadA.value.revision.value).toBe(1);
    expect(loadB.value.revision.value).toBe(1);
    expect(loadA.value.aggregate).not.toBe(loadB.value.aggregate);

    // 4. aplicar una mutación distinta a cada copia:
    // copia A: cambiar descripción
    const timeA = Instant.parse('2026-07-18T10:00:00.000Z');
    expect(timeA.success).toBe(true);
    if (!timeA.success) return;
    const mutateARes = loadA.value.aggregate.updateDescription({
      description: 'Mutated Description A',
      updatedAt: timeA.value,
    });
    expect(mutateARes.success).toBe(true);

    // copia B: renombrar
    const timeB = Instant.parse('2026-07-18T10:15:00.000Z');
    expect(timeB.success).toBe(true);
    if (!timeB.success) return;
    const nameResult2 = PlaybookName.create('Renamed Playbook B');
    expect(nameResult2.success).toBe(true);
    if (!nameResult2.success) return;
    const renameBRes = loadB.value.aggregate.rename({
      name: nameResult2.value,
      updatedAt: timeB.value,
    });
    expect(renameBRes.success).toBe(true);

    // 5. actualizar A con revisión 1;
    const updateResA = await playbookRepo.update(loadA.value.aggregate, loadA.value.revision);

    // 6. comprobar éxito y revisión 2;
    expect(updateResA.success).toBe(true);
    if (updateResA.success) {
      expect(updateResA.value.value).toBe(2);
    }

    // 7. actualizar B con su revisión obsoleta 1;
    const updateResB = await playbookRepo.update(loadB.value.aggregate, loadB.value.revision);

    // 8. comprobar: PERSISTENCE_REVISION_CONFLICT, operation: 'playbook.update', expectedRevision: 1;
    expect(updateResB.success).toBe(false);
    if (!updateResB.success) {
      expect(updateResB.error.code).toBe(PERSISTENCE_REVISION_CONFLICT);
      if (updateResB.error.code === PERSISTENCE_REVISION_CONFLICT) {
        expect(updateResB.error.details.operation).toBe('playbook.update');
        expect(updateResB.error.details.expectedRevision).toBe(1);
      }
    }

    // 9. recargar;
    const reload = await playbookRepo.findById(workspaceId, pb.id);
    expect(reload.success).toBe(true);
    if (!reload.success || reload.value === null) return;

    // 10. comprobar: revisión final 2, se conserva el cambio de A, el cambio de B no fue aplicado.
    expect(reload.value.revision.value).toBe(2);
    expect(reload.value.aggregate.description).toBe('Mutated Description A');
    expect(reload.value.aggregate.name.value).toBe(pb.name.value);
  });

  it('update playbook — not found error for non-existent playbook', async () => {
    const pb = createPlaybookFixture(workspaceId, '000000000303');
    const revisionResult = PersistenceRevision.from(1);
    expect(revisionResult.success).toBe(true);
    if (!revisionResult.success) return;

    const updateRes = await playbookRepo.update(pb, revisionResult.value);
    expect(updateRes.success).toBe(false);
    if (!updateRes.success) {
      expect(updateRes.error.code).toBe(PLAYBOOK_NOT_FOUND);
    }
  });

  it('update playbook — wrong workspace error', async () => {
    // 1. crear Workspace A (workspaceId) y Workspace B;
    const wsB = createWorkspaceFixture('000000000309', 'Workspace B');
    await insertWorkspaceFixture(pool, wsB);

    // 2. insertar Playbook perteneciente a A;
    const pbA = createPlaybookFixture(workspaceId, '000000000310', 'Playbook A');
    const insertRes = await playbookRepo.insert(pbA);
    expect(insertRes.success).toBe(true);
    if (!insertRes.success) return;

    // 3. construir Aggregate de Playbook bajo Workspace B, compartiendo el mismo playbook_id
    const pbB = Playbook.restore({
      playbookId: pbA.id,
      workspaceId: wsB.id,
      name: pbA.name,
      status: pbA.status,
      description: pbA.description,
      activeVersionId: pbA.activeVersionId,
      createdAt: pbA.createdAt,
      updatedAt: pbA.updatedAt,
      archivedAt: pbA.archivedAt,
    });
    expect(pbB.success).toBe(true);
    if (!pbB.success) return;

    // 4. intentar actualizar el Aggregate de B usando la revisión de A
    const updateRes = await playbookRepo.update(pbB.value, insertRes.value);

    // 5. verificar que retorna PLAYBOOK_NOT_FOUND
    expect(updateRes.success).toBe(false);
    if (!updateRes.success) {
      expect(updateRes.error.code).toBe(PLAYBOOK_NOT_FOUND);
    }
  });

  it('update playbook — conflict error for duplicate name in same workspace', async () => {
    // 1. insertar dos Playbooks activos;
    const pb1 = createPlaybookFixture(workspaceId, '000000000304', 'Duplicate One');
    const pb2 = createPlaybookFixture(workspaceId, '000000000305', 'Duplicate Two');
    const insert1 = await playbookRepo.insert(pb1);
    const insert2 = await playbookRepo.insert(pb2);
    expect(insert1.success).toBe(true);
    expect(insert2.success).toBe(true);
    if (!insert1.success || !insert2.success) return;

    // 2. cargar el segundo mediante findById();
    const found2 = await playbookRepo.findById(workspaceId, pb2.id);
    expect(found2.success).toBe(true);
    if (!found2.success || found2.value === null) return;

    // 3. renombrarlo usando rename() con el nombre del primero;
    const transitionTime = Instant.parse('2026-07-18T10:00:00.000Z');
    expect(transitionTime.success).toBe(true);
    if (!transitionTime.success) return;
    const renameRes = found2.value.aggregate.rename({
      name: pb1.name,
      updatedAt: transitionTime.value,
    });
    expect(renameRes.success).toBe(true);

    // 4. ejecutar update() con su revisión;
    const updateRes = await playbookRepo.update(found2.value.aggregate, found2.value.revision);

    // 5. comprobar PLAYBOOK_NAME_CONFLICT
    expect(updateRes.success).toBe(false);
    if (!updateRes.success) {
      expect(updateRes.error.code).toBe(PLAYBOOK_NAME_CONFLICT);
      expect(updateRes.error.message).not.toContain('idx_playbooks_workspace_normalized_name');
    }

    // 6. volver a cargar el segundo;
    const reloaded = await playbookRepo.findById(workspaceId, pb2.id);
    expect(reloaded.success).toBe(true);
    if (!reloaded.success || reloaded.value === null) return;

    // 7. comprobar: mantiene el nombre original, mantiene la revisión original, no existe mutación parcial
    expect(reloaded.value.aggregate.name.value).toBe('Duplicate Two');
    expect(reloaded.value.revision.value).toBe(1);
  });

  it('concurrency test — parallel updates only allow one success', async () => {
    // 1. insertar un Playbook;
    const pb = createPlaybookFixture(workspaceId, '000000000306');
    const insertRes = await playbookRepo.insert(pb);
    expect(insertRes.success).toBe(true);
    if (!insertRes.success) return;

    // 2. cargar dos copias independientes;
    const copyA = await playbookRepo.findById(workspaceId, pb.id);
    const copyB = await playbookRepo.findById(workspaceId, pb.id);
    expect(copyA.success).toBe(true);
    expect(copyB.success).toBe(true);
    if (!copyA.success || copyA.value === null) return;
    if (!copyB.success || copyB.value === null) return;

    // 3. comprobar que ambas tienen revisión 1;
    expect(copyA.value.revision.value).toBe(1);
    expect(copyB.value.revision.value).toBe(1);

    // 4. aplicar mutaciones válidas y diferentes;
    const timeA = Instant.parse('2026-07-18T10:00:00.000Z');
    const timeB = Instant.parse('2026-07-18T10:15:00.000Z');
    expect(timeA.success).toBe(true);
    expect(timeB.success).toBe(true);
    if (!timeA.success || !timeB.success) return;

    const mutateARes = copyA.value.aggregate.updateDescription({
      description: 'Description A',
      updatedAt: timeA.value,
    });
    const nameResultB = PlaybookName.create('Renamed B');
    expect(nameResultB.success).toBe(true);
    if (!nameResultB.success) return;
    const renameBRes = copyB.value.aggregate.rename({
      name: nameResultB.value,
      updatedAt: timeB.value,
    });
    expect(mutateARes.success).toBe(true);
    expect(renameBRes.success).toBe(true);

    // 5. ejecutar exactamente: const [resultA, resultB] = await Promise.all(...)
    const [resultA, resultB] = await Promise.all([
      playbookRepo.update(copyA.value.aggregate, copyA.value.revision),
      playbookRepo.update(copyB.value.aggregate, copyB.value.revision),
    ]);

    // 6. comprobar:
    // exactamente una operación exitosa
    const successes = [resultA, resultB].filter((r) => r.success);
    expect(successes).toHaveLength(1);

    // exactamente una operación con PERSISTENCE_REVISION_CONFLICT
    const failures = [resultA, resultB].filter((r) => !r.success);
    expect(failures).toHaveLength(1);
    const failedResult = failures[0];
    expect(failedResult).toBeDefined();
    if (failedResult !== undefined && !failedResult.success) {
      expect(failedResult.error.code).toBe(PERSISTENCE_REVISION_CONFLICT);
      if (failedResult.error.code === PERSISTENCE_REVISION_CONFLICT) {
        expect(failedResult.error.details.expectedRevision).toBe(1);
      }
    }

    // la revisión final es 2; nunca se produce revisión 3
    const reload = await playbookRepo.findById(workspaceId, pb.id);
    expect(reload.success).toBe(true);
    if (!reload.success || reload.value === null) return;
    expect(reload.value.revision.value).toBe(2);

    // el estado final corresponde a uno de los dos cambios completos, nunca parcial
    const finalPb = reload.value.aggregate;
    const isChangeA =
      finalPb.description === 'Description A' && finalPb.name.value === pb.name.value;
    const isChangeB = finalPb.description === pb.description && finalPb.name.value === 'Renamed B';
    expect(isChangeA || isChangeB).toBe(true);
    expect(isChangeA && isChangeB).toBe(false);
  });
});
