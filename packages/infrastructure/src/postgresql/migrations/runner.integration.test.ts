import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'vitest';

import { DatabasePool } from '../connection/pool.js';
import type { DatabaseConfig } from '@ai-playbook-engine/config';
import { runMigrations } from './runner.js';
import { UP as UP_001 } from './001-initial.js';
import { UP as UP_002 } from './002-playbook-persistence-revision.js';
import { UP as UP_003 } from './003-playbook-sources.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

interface PostgresError {
  readonly code: string;
  readonly constraint?: string;
  readonly message: string;
}

function isPostgresError(error: unknown): error is PostgresError {
  if (!(error instanceof Error)) return false;
  if (!('code' in error) || typeof error.code !== 'string') return false;
  if (
    'constraint' in error &&
    error.constraint !== undefined &&
    typeof error.constraint !== 'string'
  ) {
    return false;
  }
  return true;
}

describe.runIf(TEST_DATABASE_URL)('MigrationRunner', () => {
  let pool: DatabasePool;

  beforeAll(() => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL not set');
    }
    const config: DatabaseConfig = { connectionString: TEST_DATABASE_URL };
    pool = new DatabasePool(config);
  });

  afterAll(async () => {
    if (pool !== undefined) {
      await pool.close();
    }
  });

  beforeEach(async () => {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  });

  it('applies all migrations on a fresh database', async () => {
    const result = await runMigrations(pool);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions).toEqual([1, 2, 3, 4]);
    }

    const sourcesTable = await pool.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'playbook_sources'",
    );
    expect(sourcesTable.rows).toHaveLength(1);

    const versions = await pool.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );
    expect(versions.rows.map((row) => row.version)).toEqual([1, 2, 3, 4]);

    // Verify playbooks table column structure
    const colInfo = await pool.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'playbooks' AND column_name = 'revision'`,
    );
    expect(colInfo.rows).toHaveLength(1);
    const col = colInfo.rows[0];
    expect(col).toBeDefined();
    if (col !== undefined) {
      expect(col.data_type).toBe('integer');
      expect(col.is_nullable).toBe('NO');
      expect(col.column_default).toContain('1');
    }

    const constraintInfo = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname = 'playbooks_revision_positive'`,
    );
    expect(constraintInfo.rows).toHaveLength(1);
    const constraintRow = constraintInfo.rows[0];
    expect(constraintRow).toBeDefined();
    if (constraintRow !== undefined) {
      expect(constraintRow.conname).toBe('playbooks_revision_positive');
    }

    // Verify playbook_sources revision column
    const psColInfo = await pool.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'playbook_sources' AND column_name = 'revision'`,
    );
    expect(psColInfo.rows).toHaveLength(1);
    const psCol = psColInfo.rows[0];
    expect(psCol).toBeDefined();
    if (psCol !== undefined) {
      expect(psCol.data_type).toBe('integer');
      expect(psCol.is_nullable).toBe('NO');
      expect(psCol.column_default).toContain('1');
    }

    const psConstraintInfo = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname = 'playbook_sources_revision_positive'`,
    );
    expect(psConstraintInfo.rows).toHaveLength(1);
    if (psConstraintInfo.rows[0] !== undefined) {
      expect(psConstraintInfo.rows[0].conname).toBe('playbook_sources_revision_positive');
    }
  });

  it('is idempotent (applying twice does not error)', async () => {
    const first = await runMigrations(pool);
    expect(first.success).toBe(true);

    const second = await runMigrations(pool);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.value.appliedVersions).toHaveLength(0);
    }
    const versions = await pool.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );
    expect(versions.rows.map((row) => row.version)).toEqual([1, 2, 3, 4]);
  });

  it('backfills existing playbooks with default revision 1 when migrating v1 to v2', async () => {
    // 1. Manually apply v1 schema
    await pool.query(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(UP_001);
    await pool.query('INSERT INTO schema_migrations (version) VALUES (1)');

    // 2. Insert workspace and playbook under v1 schema (no revision column yet)
    const wsId = '00000000-0000-0000-0000-000000000001';
    const pbId = '00000000-0000-0000-0000-000000000002';
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, 'Workspace', 'workspace', 'active', NOW(), NOW())`,
      [wsId],
    );
    await pool.query(
      `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, $2, 'Playbook', 'playbook', 'active', NOW(), NOW())`,
      [pbId, wsId],
    );

    // 3. Run runner to apply v2+
    const result = await runMigrations(pool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions).toEqual([2, 3, 4]);
    }

    // 4. Verify the existing playbook got revision = 1
    const pbResult = await pool.query<{ revision: number }>(
      'SELECT revision FROM playbooks WHERE playbook_id = $1',
      [pbId],
    );
    expect(pbResult.rows).toHaveLength(1);
    const row = pbResult.rows[0];
    expect(row).toBeDefined();
    if (row !== undefined) {
      expect(row.revision).toBe(1);
    }
  });

  it('enforces check constraint playbooks_revision_positive against non-positive values', async () => {
    await runMigrations(pool);

    const wsId = '00000000-0000-0000-0000-000000000001';
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, 'Workspace', 'workspace', 'active', NOW(), NOW())`,
      [wsId],
    );

    // Try inserting 0 -> should fail positive check constraint
    const pbId1 = '00000000-0000-0000-0000-000000000002';
    let failedConstraint0 = false;
    try {
      await pool.query(
        `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, created_at, updated_at, revision)
         VALUES ($1, $2, 'Playbook 1', 'playbook-1', 'active', NOW(), NOW(), 0)`,
        [pbId1, wsId],
      );
    } catch (e) {
      if (
        isPostgresError(e) &&
        e.code === '23514' &&
        e.constraint === 'playbooks_revision_positive'
      ) {
        failedConstraint0 = true;
      }
    }
    expect(failedConstraint0).toBe(true);

    // Try inserting -5 -> should fail positive check constraint
    const pbId2 = '00000000-0000-0000-0000-000000000003';
    let failedConstraintNegative = false;
    try {
      await pool.query(
        `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, created_at, updated_at, revision)
         VALUES ($1, $2, 'Playbook 2', 'playbook-2', 'active', NOW(), NOW(), -5)`,
        [pbId2, wsId],
      );
    } catch (e) {
      if (
        isPostgresError(e) &&
        e.code === '23514' &&
        e.constraint === 'playbooks_revision_positive'
      ) {
        failedConstraintNegative = true;
      }
    }
    expect(failedConstraintNegative).toBe(true);
  });

  it('enforces playbook_sources revision default and constraints', async () => {
    await runMigrations(pool);

    const wsId = '00000000-0000-0000-0000-000000000001';
    const pbId = '00000000-0000-0000-0000-000000000002';
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, 'Workspace', 'workspace', 'active', NOW(), NOW())`,
      [wsId],
    );
    await pool.query(
      `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, created_at, updated_at, revision)
       VALUES ($1, $2, 'Playbook', 'playbook', 'active', NOW(), NOW(), 1)`,
      [pbId, wsId],
    );

    // Insert playbook_source without specifying revision -> should default to 1
    await pool.query(
      `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at)
       VALUES ('00000000-0000-0000-0000-000000000101', $1, $2, 'notion', 'enabled', 'root-page', 'config-ref', NOW())`,
      [wsId, pbId],
    );

    const revisionResult = await pool.query<{ revision: number }>(
      'SELECT revision FROM playbook_sources WHERE playbook_source_id = $1',
      ['00000000-0000-0000-0000-000000000101'],
    );
    expect(revisionResult.rows).toHaveLength(1);
    if (revisionResult.rows[0] !== undefined) {
      expect(revisionResult.rows[0].revision).toBe(1);
    }

    // Try inserting 0 -> should fail positive check constraint
    let failed0 = false;
    try {
      await pool.query(
        `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision)
         VALUES ('00000000-0000-0000-0000-000000000102', $1, $2, 'notion', 'disabled', 'root-page', 'config-ref', NOW(), 0)`,
        [wsId, pbId],
      );
    } catch (e) {
      if (
        isPostgresError(e) &&
        e.code === '23514' &&
        e.constraint === 'playbook_sources_revision_positive'
      ) {
        failed0 = true;
      }
    }
    expect(failed0).toBe(true);

    // Try inserting -1 -> should fail positive check constraint
    let failedNeg = false;
    try {
      await pool.query(
        `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision)
         VALUES ('00000000-0000-0000-0000-000000000103', $1, $2, 'notion', 'disabled', 'root-page', 'config-ref', NOW(), -1)`,
        [wsId, pbId],
      );
    } catch (e) {
      if (
        isPostgresError(e) &&
        e.code === '23514' &&
        e.constraint === 'playbook_sources_revision_positive'
      ) {
        failedNeg = true;
      }
    }
    expect(failedNeg).toBe(true);
  });

  it('backfills existing playbook sources with revision 1 when migrating v3 to v4', async () => {
    // 1. Create schema_migrations manually
    await pool.query(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Apply v1, v2, v3 in order
    await pool.query(UP_001);
    await pool.query(UP_002);
    await pool.query(UP_003);

    // 3. Register migrations 1, 2, 3
    await pool.query('INSERT INTO schema_migrations (version) VALUES (1)');
    await pool.query('INSERT INTO schema_migrations (version) VALUES (2)');
    await pool.query('INSERT INTO schema_migrations (version) VALUES (3)');

    // 4. Insert workspace, playbook, and source under v3 schema (no revision column)
    const wsId = '00000000-0000-0000-0000-000000000001';
    const pbId = '00000000-0000-0000-0000-000000000002';
    const psId = '00000000-0000-0000-0000-000000000101';

    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, 'Workspace', 'workspace', 'active', NOW(), NOW())`,
      [wsId],
    );
    await pool.query(
      `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, created_at, updated_at)
       VALUES ($1, $2, 'Playbook', 'playbook', 'active', NOW(), NOW())`,
      [pbId, wsId],
    );
    // Insert source without revision column (v3 schema)
    await pool.query(
      `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at)
       VALUES ($1, $2, $3, 'notion', 'enabled', 'root-page', 'config-ref', $4, $5, $6, $7, $8)`,
      [
        psId,
        wsId,
        pbId,
        '2026-07-01T10:00:00.000Z',
        '00000000-0000-0000-0000-000000000201',
        '2026-07-01T11:00:00.000Z',
        '00000000-0000-0000-0000-000000000202',
        '2026-07-01T12:00:00.000Z',
      ],
    );

    // 5. Run runner to apply v4
    const result = await runMigrations(pool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions).toEqual([4]);
    }

    // 6. Verify the existing source got revision = 1 and all values remain intact
    const sourceRow = await pool.query<{
      playbook_source_id: string;
      workspace_id: string;
      playbook_id: string;
      type: string;
      status: string;
      external_root_reference: string;
      configuration_reference: string;
      revision: number;
      last_successful_synchronization_run_id: string | null;
      last_successful_synchronization_at: Date | null;
      last_failed_synchronization_run_id: string | null;
      last_failed_synchronization_at: Date | null;
    }>(
      `SELECT playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, revision, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at FROM playbook_sources WHERE playbook_source_id = $1`,
      [psId],
    );
    expect(sourceRow.rows).toHaveLength(1);
    const row = sourceRow.rows[0];
    expect(row).toBeDefined();
    if (row !== undefined) {
      expect(row.playbook_source_id).toBe(psId);
      expect(row.workspace_id).toBe(wsId);
      expect(row.playbook_id).toBe(pbId);
      expect(row.type).toBe('notion');
      expect(row.status).toBe('enabled');
      expect(row.external_root_reference).toBe('root-page');
      expect(row.configuration_reference).toBe('config-ref');
      expect(row.revision).toBe(1);
      expect(row.last_successful_synchronization_run_id).toBe(
        '00000000-0000-0000-0000-000000000201',
      );
      expect(row.last_successful_synchronization_at?.toISOString()).toBe(
        '2026-07-01T11:00:00.000Z',
      );
      expect(row.last_failed_synchronization_run_id).toBe('00000000-0000-0000-0000-000000000202');
      expect(row.last_failed_synchronization_at?.toISOString()).toBe('2026-07-01T12:00:00.000Z');
    }
  });
});
