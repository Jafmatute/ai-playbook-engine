import { describe, expect, it } from 'vitest';

import { DatabasePool } from '../connection/pool.js';
import { runMigrations } from './runner.js';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

describe.runIf(TEST_DATABASE_URL)('MigrationRunner', () => {
  it('applies initial migration', async () => {
    const pool = new DatabasePool(TEST_DATABASE_URL!);

    try {
      const result = await runMigrations(pool);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.appliedVersions.length).toBeGreaterThanOrEqual(1);
        expect(result.value.appliedVersions).toContain(1);
      }
    } finally {
      await pool.close();
    }
  });

  it('is idempotent (applying twice does not error)', async () => {
    const pool = new DatabasePool(TEST_DATABASE_URL!);

    try {
      const first = await runMigrations(pool);
      expect(first.success).toBe(true);

      const second = await runMigrations(pool);
      expect(second.success).toBe(true);
      if (second.success) {
        expect(second.value.appliedVersions).toHaveLength(0);
      }
    } finally {
      await pool.close();
    }
  });
});
