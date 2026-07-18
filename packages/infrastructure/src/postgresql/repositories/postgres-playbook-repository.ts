import type {
  PlaybookRepository,
  FindPlaybookByNormalizedNameOptions,
  PlaybookListFilter,
  PersistenceOperationFailedError,
  PlaybookNameConflictError,
} from '@ai-playbook-engine/application';
import {
  persistenceOperationFailed,
  playbookNameConflict,
  createPage,
} from '@ai-playbook-engine/application';
import type { Playbook, PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';
import { err, ok } from '@ai-playbook-engine/shared';

import type { DatabasePool } from '../connection/pool.js';
import { mapRowToPlaybook } from '../mapping/playbook-mapper.js';

import type { PaginationRequest, Page } from '@ai-playbook-engine/application';

const PLAYBOOK_NAME_CONFLICT_CONSTRAINT = 'idx_playbooks_workspace_normalized_name';

export class PostgresPlaybookRepository implements PlaybookRepository {
  readonly #pool: DatabasePool;

  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query(
        'SELECT * FROM playbooks WHERE workspace_id = $1 AND playbook_id = $2',
        [workspaceId, playbookId],
      );

      if (result.rows.length === 0) {
        return ok(null);
      }

      const playbook = mapRowToPlaybook(result.rows[0] as Record<string, unknown>);
      if (playbook === null) {
        return err(persistenceOperationFailed('playbook.findById'));
      }

      return ok(playbook);
    } catch {
      return err(persistenceOperationFailed('playbook.findById'));
    }
  }

  async findByNormalizedName(
    workspaceId: WorkspaceId,
    normalizedName: string,
    options: FindPlaybookByNormalizedNameOptions,
  ): Promise<Result<Playbook | null, PersistenceOperationFailedError>> {
    try {
      let query: string;
      let params: unknown[];

      if (options.includeArchived) {
        query = 'SELECT * FROM playbooks WHERE workspace_id = $1 AND normalized_name = $2';
        params = [workspaceId, normalizedName];
      } else {
        query =
          'SELECT * FROM playbooks WHERE workspace_id = $1 AND normalized_name = $2 AND status <> $3';
        params = [workspaceId, normalizedName, 'archived'];
      }

      const result = await this.#pool.query(query, params);

      if (result.rows.length === 0) {
        return ok(null);
      }

      const playbook = mapRowToPlaybook(result.rows[0] as Record<string, unknown>);
      if (playbook === null) {
        return err(persistenceOperationFailed('playbook.findByNormalizedName'));
      }

      return ok(playbook);
    } catch {
      return err(persistenceOperationFailed('playbook.findByNormalizedName'));
    }
  }

  async list(
    workspaceId: WorkspaceId,
    filter: PlaybookListFilter,
    pagination: PaginationRequest,
  ): Promise<Result<Page<Playbook>, PersistenceOperationFailedError>> {
    try {
      const conditions: string[] = ['workspace_id = $1'];
      const params: unknown[] = [workspaceId];
      let paramIndex = 2;

      if (filter.status !== undefined) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filter.status);
        paramIndex++;
      }

      if (filter.normalizedNamePrefix !== undefined) {
        conditions.push(
          `normalized_name >= $${paramIndex} AND normalized_name < $${paramIndex + 1}`,
        );

        const prefix = filter.normalizedNamePrefix;
        const nextPrefix =
          prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);

        params.push(prefix, nextPrefix);
        paramIndex += 2;
      }

      if (filter.hasActiveVersion === true) {
        conditions.push('active_version_id IS NOT NULL');
      } else if (filter.hasActiveVersion === false) {
        conditions.push('active_version_id IS NULL');
      }

      const whereClause = conditions.join(' AND ');

      const countResult = await this.#pool.query(
        `SELECT COUNT(*) AS total FROM playbooks WHERE ${whereClause}`,
        params,
      );
      const totalCount = Number(countResult.rows[0]?.total ?? 0);

      params.push(pagination.offset, pagination.limit);

      const dataResult = await this.#pool.query(
        `SELECT * FROM playbooks WHERE ${whereClause} ORDER BY normalized_name ASC, playbook_id ASC OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`,
        params,
      );

      const items: Playbook[] = [];
      for (const row of dataResult.rows) {
        const playbook = mapRowToPlaybook(row as Record<string, unknown>);
        if (playbook !== null) {
          items.push(playbook);
        }
      }

      const hasMore = pagination.offset + items.length < totalCount;

      return ok(
        createPage({
          items,
          offset: pagination.offset,
          limit: pagination.limit,
          hasMore,
          totalCount,
        }),
      );
    } catch {
      return err(persistenceOperationFailed('playbook.list'));
    }
  }

  async insert(
    playbook: Playbook,
  ): Promise<Result<void, PlaybookNameConflictError | PersistenceOperationFailedError>> {
    try {
      const snapshot = playbook.toSnapshot();

      await this.#pool.query(
        `INSERT INTO playbooks (
          playbook_id, workspace_id, name, normalized_name,
          status, description, active_version_id,
          created_at, updated_at, archived_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          snapshot.playbookId,
          snapshot.workspaceId,
          snapshot.name,
          snapshot.normalizedName,
          snapshot.status,
          snapshot.description,
          snapshot.activeVersionId,
          snapshot.createdAt,
          snapshot.updatedAt,
          snapshot.archivedAt,
        ],
      );

      return ok(undefined);
    } catch (e) {
      if (isUniqueConstraintViolation(e, PLAYBOOK_NAME_CONFLICT_CONSTRAINT)) {
        return err(playbookNameConflict());
      }

      return err(persistenceOperationFailed('playbook.insert'));
    }
  }
}

function isUniqueConstraintViolation(error: unknown, constraintName: string): boolean {
  if (error !== null && typeof error === 'object' && 'code' in error && 'constraint' in error) {
    const pgError = error as { code: unknown; constraint: unknown };
    return pgError.code === '23505' && pgError.constraint === constraintName;
  }

  return false;
}
