import pg from 'pg';
import type {
  WorkspaceRepository,
  PersistenceOperationFailedError,
  WorkspaceAlreadyInitializedError,
} from '@ai-playbook-engine/application';
import {
  persistenceOperationFailed,
  workspaceAlreadyInitialized,
} from '@ai-playbook-engine/application';
import type { Workspace, WorkspaceId } from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { DatabasePool } from '../connection/pool.js';
import { mapRowToWorkspace } from '../mapping/workspace-mapper.js';
import type { WorkspaceRow } from '../mapping/workspace-mapper.js';

const BOOTSTRAP_LOCK_KEY = 'ai-playbook-engine:personal-workspace-bootstrap';

export class PostgresWorkspaceRepository implements WorkspaceRepository {
  readonly #pool: DatabasePool;

  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async findById(
    workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query<WorkspaceRow>(
        'SELECT * FROM workspaces WHERE workspace_id = $1',
        [workspaceId],
      );

      const row = result.rows[0];
      if (row === undefined) {
        return ok(null);
      }

      const workspace = mapRowToWorkspace(row);
      if (workspace === null) {
        return err(persistenceOperationFailed('workspace.findById'));
      }

      return ok(workspace);
    } catch {
      return err(persistenceOperationFailed('workspace.findById'));
    }
  }

  async hasAnyWorkspace(): Promise<Result<boolean, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM workspaces',
      );

      const row = result.rows[0];
      const count = Number(row?.count ?? 0);
      return ok(count > 0);
    } catch {
      return err(persistenceOperationFailed('workspace.hasAnyWorkspace'));
    }
  }

  async insert(
    workspace: Workspace,
  ): Promise<Result<void, WorkspaceAlreadyInitializedError | PersistenceOperationFailedError>> {
    let client: pg.PoolClient | null = null;
    let transactionStarted = false;

    try {
      client = await this.#pool.connect();

      await client.query('BEGIN');
      transactionStarted = true;

      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [BOOTSTRAP_LOCK_KEY]);

      const existing = await client.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM workspaces',
      );

      const existingRow = existing.rows[0];
      if (Number(existingRow?.count ?? 0) > 0) {
        await client.query('ROLLBACK');
        transactionStarted = false;
        return err(workspaceAlreadyInitialized());
      }

      const snapshot = workspace.toSnapshot();

      await client.query(
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

      await client.query('COMMIT');
      transactionStarted = false;
      return ok(undefined);
    } catch {
      if (client !== null && transactionStarted) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore rollback errors
        }
      }

      return err(persistenceOperationFailed('workspace.insert'));
    } finally {
      if (client !== null) {
        client.release();
      }
    }
  }
}
