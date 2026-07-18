import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'vitest';

import { DatabasePool } from '../connection/pool.js';
import type { DatabaseConfig } from '@ai-playbook-engine/config';
import { runMigrations } from './runner.js';
import { UP as UP_001 } from './001-initial.js';

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
      expect(result.value.appliedVersions).toEqual([1, 2]);
    }

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
  });

  it('is idempotent (applying twice does not error)', async () => {
    const first = await runMigrations(pool);
    expect(first.success).toBe(true);

    const second = await runMigrations(pool);
    expect(second.success).toBe(true);
    if (second.success) {
      expect(second.value.appliedVersions).toHaveLength(0);
    }
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

    // 3. Run runner to apply v2
    const result = await runMigrations(pool);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions).toEqual([2]);
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
});
