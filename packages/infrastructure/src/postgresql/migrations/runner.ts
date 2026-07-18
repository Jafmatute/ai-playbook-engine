import pg from 'pg';
import { ok, err, type Result } from '@ai-playbook-engine/shared';

import type { DatabasePool } from '../connection/pool.js';
import { VERSION, UP } from './001-initial.js';
import type { MigrationFailedError } from './migration-error.js';
import { migrationFailed } from './migration-error.js';

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

interface AppliedMigrationRow extends pg.QueryResultRow {
  readonly version: number;
}

export async function runMigrations(
  pool: DatabasePool,
): Promise<Result<MigrationResult, MigrationFailedError>> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await pool.query<AppliedMigrationRow>('SELECT version FROM schema_migrations');
    const versions: number[] = [];
    for (const row of appliedResult.rows) {
      const v = row.version;
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1) {
        return err(migrationFailed());
      }
      versions.push(v);
    }
    const appliedVersions = new Set<number>(versions);

    const pending = MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).sort(
      (a, b) => a.version - b.version,
    );

    if (pending.length === 0) {
      return ok(Object.freeze({ appliedVersions: Object.freeze([]) }));
    }

    const applied: number[] = [];

    for (const migration of pending) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(migration.up);
        await client.query(
          'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())',
          [migration.version],
        );
        await client.query('COMMIT');
        applied.push(migration.version);
      } catch {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore rollback errors
        }
        return err(migrationFailed());
      } finally {
        client.release();
      }
    }

    return ok(Object.freeze({ appliedVersions: Object.freeze(applied) }));
  } catch {
    return err(migrationFailed());
  }
}
