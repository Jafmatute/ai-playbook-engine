import { ok, err, type Result } from '@ai-playbook-engine/shared';
import {
  persistenceOperationFailed,
  type PersistenceOperationFailedError,
} from '@ai-playbook-engine/application';

import type { DatabasePool } from '../connection/pool.js';
import { VERSION, UP } from './001-initial.js';

interface Migration {
  readonly version: number;
  readonly up: string;
}

const MIGRATIONS: readonly Migration[] = Object.freeze([
  Object.freeze({ version: VERSION, up: UP }),
]);

export interface MigrationResult {
  readonly appliedVersions: readonly number[];
}

export async function runMigrations(
  pool: DatabasePool,
): Promise<Result<MigrationResult, PersistenceOperationFailedError>> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const currentResult = await pool.query(
      'SELECT COALESCE(MAX(version), 0) AS current_version FROM schema_migrations',
    );
    const currentVersion: number = currentResult.rows[0]?.current_version ?? 0;

    const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
      (a, b) => a.version - b.version,
    );

    if (pending.length === 0) {
      return ok({ appliedVersions: [] });
    }

    const appliedVersions: number[] = [];

    for (const migration of pending) {
      const client = await pool.pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(migration.up);

        await client.query(
          'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())',
          [migration.version],
        );

        await client.query('COMMIT');
        appliedVersions.push(migration.version);
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return ok(Object.freeze({ appliedVersions: Object.freeze(appliedVersions) }));
  } catch {
    return err(persistenceOperationFailed('migration'));
  }
}
