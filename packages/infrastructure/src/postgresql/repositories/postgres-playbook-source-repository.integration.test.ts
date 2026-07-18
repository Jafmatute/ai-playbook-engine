import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parsePlaybookId, parsePlaybookSourceId, parseWorkspaceId } from '@ai-playbook-engine/core';
import { DatabasePool } from '../connection/pool.js';
import type { PostgresParameter } from '../connection/pool.js';
import { runMigrations } from '../migrations/runner.js';
import { PostgresPlaybookSourceRepository } from './postgres-playbook-source-repository.js';

const databaseUrl = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;
const workspaceA = '00000000-0000-0000-0000-000000000001';
const workspaceB = '00000000-0000-0000-0000-000000000002';
const playbookA = '00000000-0000-0000-0000-000000000011';
const playbookB = '00000000-0000-0000-0000-000000000012';
const playbookC = '00000000-0000-0000-0000-000000000013';

function workspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid workspace fixture.');
  return result.value;
}
function playbookId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid playbook fixture.');
  return result.value;
}
function sourceId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid source fixture.');
  return result.value;
}

describe.runIf(databaseUrl)('PostgresPlaybookSourceRepository', () => {
  let pool: DatabasePool;
  let repository: PostgresPlaybookSourceRepository;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL not set');
    pool = new DatabasePool({ connectionString: databaseUrl });
    const result = await runMigrations(pool);
    if (!result.success) throw new Error('Migration setup failed');
    repository = new PostgresPlaybookSourceRepository(pool);
  });
  afterAll(async () => {
    await pool.close();
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE playbook_sources, playbooks, workspaces CASCADE');
    await insertWorkspace(workspaceA, 'Workspace A');
    await insertWorkspace(workspaceB, 'Workspace B');
    await insertPlaybook(workspaceA, playbookA, 'Playbook A');
    await insertPlaybook(workspaceA, playbookB, 'Playbook B');
    await insertPlaybook(workspaceB, playbookC, 'Playbook C');
  });

  async function insertWorkspace(id: string, name: string): Promise<void> {
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, description, created_at, updated_at, archived_at) VALUES ($1, $2, $3, 'active', NULL, $4, $4, NULL)`,
      [id, name, name.toLowerCase(), '2026-07-01T10:00:00.000Z'],
    );
  }
  async function insertPlaybook(workspace: string, id: string, name: string): Promise<void> {
    await pool.query(
      `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, description, active_version_id, created_at, updated_at, archived_at) VALUES ($1, $2, $3, $4, 'active', NULL, NULL, $5, $5, NULL)`,
      [id, workspace, name, name.toLowerCase(), '2026-07-01T10:00:00.000Z'],
    );
  }
  async function insertSource(input: {
    readonly id: string;
    readonly workspace?: string;
    readonly playbook?: string;
    readonly status?: 'enabled' | 'disabled';
    readonly createdAt?: string;
    readonly successRun?: string | null;
    readonly successAt?: string | null;
    readonly failedRun?: string | null;
    readonly failedAt?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at) VALUES ($1, $2, $3, 'notion', $4, 'root-page', 'config-ref', $5, $6, $7, $8, $9)`,
      [
        input.id,
        input.workspace ?? workspaceA,
        input.playbook ?? playbookA,
        input.status ?? 'enabled',
        input.createdAt ?? '2026-07-01T10:00:00.000Z',
        input.successRun ?? null,
        input.successAt ?? null,
        input.failedRun ?? null,
        input.failedAt ?? null,
      ],
    );
  }
  interface PostgresConstraintError {
    readonly code: string;
    readonly constraint?: string;
  }
  function isPostgresConstraintError(error: unknown): error is PostgresConstraintError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string' &&
      (!('constraint' in error) ||
        error.constraint === undefined ||
        typeof error.constraint === 'string')
    );
  }
  async function rejects(
    query: string,
    values: readonly PostgresParameter[],
    expectedCode: string,
    expectedConstraint: string,
  ): Promise<void> {
    try {
      await pool.query(query, values);
    } catch (error) {
      expect(isPostgresConstraintError(error)).toBe(true);
      if (!isPostgresConstraintError(error))
        throw new Error('Expected PostgreSQL constraint error.');
      expect(error.code).toBe(expectedCode);
      expect(error.constraint).toBe(expectedConstraint);
      return;
    }
    throw new Error('Expected PostgreSQL to reject the statement.');
  }

  it('findById preserves fields and isolates workspace', async () => {
    const id = '00000000-0000-0000-0000-000000000101';
    await insertSource({
      id,
      successRun: '00000000-0000-0000-0000-000000000201',
      successAt: '2026-07-01T11:00:00.000Z',
    });
    const found = await repository.findById(workspaceId(workspaceA), sourceId(id));
    expect(found.success).toBe(true);
    if (!found.success) throw new Error('Expected successful source lookup.');
    expect(found.value).not.toBeNull();
    if (found.value === null) throw new Error('Expected the playbook source to exist.');
    expect(found.value.toSnapshot()).toEqual({
      playbookSourceId: id,
      workspaceId: workspaceA,
      playbookId: playbookA,
      type: 'notion',
      status: 'enabled',
      externalRootReference: 'root-page',
      configurationReference: 'config-ref',
      createdAt: '2026-07-01T10:00:00.000Z',
      lastSuccessfulSynchronizationRunId: '00000000-0000-0000-0000-000000000201',
      lastSuccessfulSynchronizationAt: '2026-07-01T11:00:00.000Z',
      lastFailedSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
    });
    const wrongWorkspace = await repository.findById(workspaceId(workspaceB), sourceId(id));
    expect(wrongWorkspace.success).toBe(true);
    if (wrongWorkspace.success) expect(wrongWorkspace.value).toBeNull();
    const missing = await repository.findById(
      workspaceId(workspaceA),
      sourceId('00000000-0000-0000-0000-000000000199'),
    );
    expect(missing.success).toBe(true);
    if (missing.success) expect(missing.value).toBeNull();
  });

  it('findEnabledByPlaybookId finds enabled source and ignores disabled', async () => {
    await insertSource({ id: '00000000-0000-0000-0000-000000000102', status: 'disabled' });
    let result = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
    await insertSource({ id: '00000000-0000-0000-0000-000000000103' });
    result = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
    );
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected enabled source lookup.');
    expect(result.value).not.toBeNull();
    if (result.value === null) throw new Error('Expected enabled source.');
    expect(result.value.toSnapshot()).toMatchObject({
      playbookSourceId: '00000000-0000-0000-0000-000000000103',
      workspaceId: workspaceA,
      playbookId: playbookA,
      status: 'enabled',
    });
    await insertSource({ id: '00000000-0000-0000-0000-000000000107', playbook: playbookB });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000108',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const otherPlaybook = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookB),
    );
    expect(otherPlaybook.success).toBe(true);
    if (!otherPlaybook.success || otherPlaybook.value === null)
      throw new Error('Expected Playbook B source.');
    expect(otherPlaybook.value.toSnapshot()).toMatchObject({
      playbookId: playbookB,
      workspaceId: workspaceA,
    });
    const workspaceBSource = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceB),
      playbookId(playbookC),
    );
    expect(workspaceBSource.success).toBe(true);
    if (!workspaceBSource.success || workspaceBSource.value === null)
      throw new Error('Expected Playbook C source.');
    expect(workspaceBSource.value.toSnapshot()).toMatchObject({
      playbookId: playbookC,
      workspaceId: workspaceB,
    });
    const wrongWorkspace = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookC),
    );
    expect(wrongWorkspace.success).toBe(true);
    if (wrongWorkspace.success) expect(wrongWorkspace.value).toBeNull();
  });

  it('lists both statuses in deterministic order with pagination', async () => {
    await insertSource({
      id: '00000000-0000-0000-0000-000000000105',
      createdAt: '2026-07-02T10:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000104',
      status: 'disabled',
      createdAt: '2026-07-02T10:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000106',
      status: 'disabled',
      createdAt: '2026-07-01T11:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000109',
      status: 'disabled',
      createdAt: '2026-07-01T10:30:00.000Z',
    });
    await insertSource({ id: '00000000-0000-0000-0000-000000000107', playbook: playbookB });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000108',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const page = await repository.listByPlaybookId(workspaceId(workspaceA), playbookId(playbookA), {
      offset: 0,
      limit: 2,
    });
    expect(page.success).toBe(true);
    if (page.success) {
      expect(page.value.items.map((item) => item.id)).toEqual([
        '00000000-0000-0000-0000-000000000104',
        '00000000-0000-0000-0000-000000000105',
      ]);
      expect(page.value.totalCount).toBe(4);
      expect(page.value.hasMore).toBe(true);
      expect(page.value.offset).toBe(0);
      expect(page.value.limit).toBe(2);
      expect(
        page.value.items.every(
          (item) =>
            item.workspaceId === workspaceId(workspaceA) &&
            item.playbookId === playbookId(playbookA),
        ),
      ).toBe(true);
    }
    const second = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
      { offset: 2, limit: 2 },
    );
    expect(second.success).toBe(true);
    if (!second.success) throw new Error('Expected second page.');
    expect(second.value.items.map((item) => item.id)).toEqual([
      '00000000-0000-0000-0000-000000000106',
      '00000000-0000-0000-0000-000000000109',
    ]);
    expect(second.value.offset).toBe(2);
    expect(second.value.limit).toBe(2);
    expect(second.value.totalCount).toBe(4);
    expect(second.value.hasMore).toBe(false);
    const empty = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
      { offset: 20, limit: 5 },
    );
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.value.items).toEqual([]);
      expect(empty.value.offset).toBe(20);
      expect(empty.value.limit).toBe(5);
      expect(empty.value.totalCount).toBe(4);
    }
  });

  it('enforces source constraints and ownership', async () => {
    const base = `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
    const type = 'notion';
    const status = 'disabled';
    const root = 'root';
    const configuration = 'config';
    const created = '2026-07-01T10:00:00.000Z';
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000110',
        workspaceA,
        playbookA,
        'other',
        status,
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_type_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000111',
        workspaceA,
        playbookA,
        type,
        'other',
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_status_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000112',
        workspaceA,
        playbookA,
        type,
        status,
        ' ',
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_external_root_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000113',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        '00000000-0000-0000-0000-000000000211',
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_success_metadata_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000114',
        workspaceB,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23503',
      'playbook_sources_playbook_owner_fk',
    );
    await insertSource({ id: '00000000-0000-0000-0000-000000000115' });
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000116',
        workspaceA,
        playbookA,
        type,
        'enabled',
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23505',
      'idx_playbook_sources_one_enabled_per_playbook',
    );
    await insertSource({ id: '00000000-0000-0000-0000-000000000117', status: 'disabled' });
  });
});
