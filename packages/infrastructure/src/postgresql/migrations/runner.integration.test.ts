import { describe, expect, it, beforeAll, beforeEach, afterAll } from 'vitest';

import { DatabasePool } from '../connection/pool.js';
import type { DatabaseConfig } from '@ai-playbook-engine/config';
import { runMigrations } from './runner.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

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

  it('applies initial migration', async () => {
    const result = await runMigrations(pool);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions.length).toBeGreaterThanOrEqual(1);
      expect(result.value.appliedVersions).toContain(1);
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

  it('applies missing migration version 1 when version 2 is already present', async () => {
    await pool.query(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', [2]);

    const result = await runMigrations(pool);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.appliedVersions).toEqual([1]);
    }

    const dbResult = await pool.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC',
    );
    expect(dbResult.rows).toHaveLength(2);

    const row0 = dbResult.rows[0];
    const row1 = dbResult.rows[1];
    expect(row0).toBeDefined();
    expect(row1).toBeDefined();
    if (row0 !== undefined && row1 !== undefined) {
      expect(row0.version).toBe(1);
      expect(row1.version).toBe(2);
    }
  });
});
