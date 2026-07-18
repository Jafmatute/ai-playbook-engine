import { createPage, persistenceOperationFailed } from '@ai-playbook-engine/application';
import type {
  Page,
  PaginationRequest,
  PersistenceOperationFailedError,
  PlaybookSourceRepository,
} from '@ai-playbook-engine/application';
import type {
  PlaybookId,
  PlaybookSource,
  PlaybookSourceId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import { err, ok, type Result } from '@ai-playbook-engine/shared';
import type { DatabasePool } from '../connection/pool.js';
import {
  mapRowToPlaybookSource,
  type PlaybookSourceRow,
} from '../mapping/playbook-source-mapper.js';

export class PostgresPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly #pool: DatabasePool;
  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    return this.findOne(
      'playbookSource.findById',
      'SELECT * FROM playbook_sources WHERE workspace_id = $1 AND playbook_source_id = $2',
      [workspaceId, playbookSourceId],
    );
  }

  async findEnabledByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    return this.findOne(
      'playbookSource.findEnabledByPlaybookId',
      'SELECT * FROM playbook_sources WHERE workspace_id = $1 AND playbook_id = $2 AND status = $3',
      [workspaceId, playbookId, 'enabled'],
    );
  }

  async listByPlaybookId(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
    pagination: PaginationRequest,
  ): Promise<Result<Page<PlaybookSource>, PersistenceOperationFailedError>> {
    try {
      const count = await this.#pool.query<{ total: string }>(
        'SELECT COUNT(*) AS total FROM playbook_sources WHERE workspace_id = $1 AND playbook_id = $2',
        [workspaceId, playbookId],
      );
      const totalCount = Number(count.rows[0]?.total ?? 0);
      const data = await this.#pool.query<PlaybookSourceRow>(
        `SELECT * FROM playbook_sources WHERE workspace_id = $1 AND playbook_id = $2 ORDER BY created_at DESC, playbook_source_id ASC OFFSET $3 LIMIT $4`,
        [workspaceId, playbookId, pagination.offset, pagination.limit],
      );
      const items: PlaybookSource[] = [];
      for (const row of data.rows) {
        const source = mapRowToPlaybookSource(row);
        if (source === null)
          return err(persistenceOperationFailed('playbookSource.listByPlaybookId'));
        items.push(source);
      }
      return ok(
        createPage({
          items,
          offset: pagination.offset,
          limit: pagination.limit,
          totalCount,
          hasMore: pagination.offset + items.length < totalCount,
        }),
      );
    } catch {
      return err(persistenceOperationFailed('playbookSource.listByPlaybookId'));
    }
  }

  private async findOne(
    operation: 'playbookSource.findById' | 'playbookSource.findEnabledByPlaybookId',
    query: string,
    values: readonly string[],
  ): Promise<Result<PlaybookSource | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query<PlaybookSourceRow>(query, values);
      if (result.rows.length === 0) return ok(null);
      if (result.rows.length !== 1) return err(persistenceOperationFailed(operation));
      const row = result.rows[0];
      if (row === undefined) return err(persistenceOperationFailed(operation));
      const source = mapRowToPlaybookSource(row);
      return source === null ? err(persistenceOperationFailed(operation)) : ok(source);
    } catch {
      return err(persistenceOperationFailed(operation));
    }
  }
}
