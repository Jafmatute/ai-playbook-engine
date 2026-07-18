import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { DatabasePool } from '../connection/pool.js';
import type { DatabaseConfig } from '../connection/pool.js';
import { runMigrations } from './runner.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

describe.runIf(TEST_DATABASE_URL)('MigrationRunner', () => {
  let pool: DatabasePool;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL not set');
    }
    const config: DatabaseConfig = { connectionString: TEST_DATABASE_URL };
    pool = new DatabasePool(config);
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  });

  afterAll(async () => {
    await pool?.close();
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
});
