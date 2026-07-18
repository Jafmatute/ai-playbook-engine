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

export class PostgresWorkspaceRepository implements WorkspaceRepository {
  readonly #pool: DatabasePool;

  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async findById(
    workspaceId: WorkspaceId,
  ): Promise<Result<Workspace | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query('SELECT * FROM workspaces WHERE workspace_id = $1', [
        workspaceId,
      ]);

      if (result.rows.length === 0) {
        return ok(null);
      }

      const workspace = mapRowToWorkspace(result.rows[0] as Record<string, unknown>);
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
      const result = await this.#pool.query('SELECT COUNT(*) AS count FROM workspaces');

      const count = Number(result.rows[0]?.count ?? 0);
      return ok(count > 0);
    } catch {
      return err(persistenceOperationFailed('workspace.hasAnyWorkspace'));
    }
  }

  async insert(
    workspace: Workspace,
  ): Promise<Result<void, WorkspaceAlreadyInitializedError | PersistenceOperationFailedError>> {
    const client = await this.#pool.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT COUNT(*) AS count FROM workspaces');

      if (Number(existing.rows[0]?.count ?? 0) > 0) {
        await client.query('ROLLBACK');
        client.release();
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
      client.release();
      return ok(undefined);
    } catch {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      client.release();
      return err(persistenceOperationFailed('workspace.insert'));
    }
  }
}
