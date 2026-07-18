import type {
  PlaybookRepository,
  FindPlaybookByNormalizedNameOptions,
  PlaybookListFilter,
  PersistenceOperationFailedError,
  PlaybookNameConflictError,
  PaginationRequest,
  Page,
  PersistedAggregate,
  PlaybookRepositoryUpdateError,
} from '@ai-playbook-engine/application';
import {
  persistenceOperationFailed,
  playbookNameConflict,
  createPage,
  PersistenceRevision,
  persistenceRevisionConflict,
  playbookNotFound,
} from '@ai-playbook-engine/application';
import type { Playbook, PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';
import { err, ok } from '@ai-playbook-engine/shared';

import type { DatabasePool, PostgresParameter } from '../connection/pool.js';
import { mapRowToPlaybook, mapRowToPersistedPlaybook } from '../mapping/playbook-mapper.js';
import type { PlaybookRow } from '../mapping/playbook-mapper.js';

const PLAYBOOK_NAME_CONFLICT_CONSTRAINT = 'idx_playbooks_workspace_normalized_name';

export class PostgresPlaybookRepository implements PlaybookRepository {
  readonly #pool: DatabasePool;

  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async findById(
    workspaceId: WorkspaceId,
    playbookId: PlaybookId,
  ): Promise<Result<PersistedAggregate<Playbook> | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query<PlaybookRow>(
        'SELECT * FROM playbooks WHERE workspace_id = $1 AND playbook_id = $2',
        [workspaceId, playbookId],
      );

      const row = result.rows[0];
      if (row === undefined) {
        return ok(null);
      }

      const persisted = mapRowToPersistedPlaybook(row);
      if (persisted === null) {
        return err(persistenceOperationFailed('playbook.findById'));
      }

      return ok(persisted);
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
      let params: PostgresParameter[];

      if (options.includeArchived) {
        query = 'SELECT * FROM playbooks WHERE workspace_id = $1 AND normalized_name = $2';
        params = [workspaceId, normalizedName];
      } else {
        query =
          'SELECT * FROM playbooks WHERE workspace_id = $1 AND normalized_name = $2 AND status <> $3';
        params = [workspaceId, normalizedName, 'archived'];
      }

      const result = await this.#pool.query<PlaybookRow>(query, params);

      const row = result.rows[0];
      if (row === undefined) {
        return ok(null);
      }

      const playbook = mapRowToPlaybook(row);
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
      const params: PostgresParameter[] = [workspaceId];
      let paramIndex = 2;

      if (filter.status !== undefined) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filter.status);
        paramIndex++;
      }

      if (filter.normalizedNamePrefix !== undefined) {
        conditions.push(
          `LEFT(normalized_name, CHAR_LENGTH($${paramIndex}::text)) = $${paramIndex}`,
        );
        params.push(filter.normalizedNamePrefix);
        paramIndex++;
      }

      if (filter.hasActiveVersion === true) {
        conditions.push('active_version_id IS NOT NULL');
      } else if (filter.hasActiveVersion === false) {
        conditions.push('active_version_id IS NULL');
      }

      const whereClause = conditions.join(' AND ');

      const countResult = await this.#pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM playbooks WHERE ${whereClause}`,
        params,
      );
      const countRow = countResult.rows[0];
      const totalCount = Number(countRow?.total ?? 0);

      const limitParam = paramIndex;
      const offsetParam = paramIndex + 1;
      params.push(pagination.offset, pagination.limit);

      const dataResult = await this.#pool.query<PlaybookRow>(
        `SELECT * FROM playbooks WHERE ${whereClause} ORDER BY normalized_name ASC, playbook_id ASC OFFSET $${limitParam} LIMIT $${offsetParam}`,
        params,
      );

      const items: Playbook[] = [];
      for (const row of dataResult.rows) {
        const playbook = mapRowToPlaybook(row);
        if (playbook === null) {
          return err(persistenceOperationFailed('playbook.list'));
        }
        items.push(playbook);
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
  ): Promise<
    Result<PersistenceRevision, PlaybookNameConflictError | PersistenceOperationFailedError>
  > {
    try {
      const snapshot = playbook.toSnapshot();

      const result = await this.#pool.query<{ revision: number }>(
        `INSERT INTO playbooks (
          playbook_id, workspace_id, name, normalized_name,
          status, description, active_version_id,
          created_at, updated_at, archived_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING revision`,
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

      const row = result.rows[0];
      if (row === undefined) {
        return err(persistenceOperationFailed('playbook.insert'));
      }

      const revisionResult = PersistenceRevision.from(row.revision);
      if (!revisionResult.success) {
        return err(persistenceOperationFailed('playbook.insert'));
      }

      return ok(revisionResult.value);
    } catch (e) {
      if (isUniqueConstraintViolation(e, PLAYBOOK_NAME_CONFLICT_CONSTRAINT)) {
        return err(playbookNameConflict());
      }

      return err(persistenceOperationFailed('playbook.insert'));
    }
  }

  async update(
    playbook: Playbook,
    expectedRevision: PersistenceRevision,
  ): Promise<Result<PersistenceRevision, PlaybookRepositoryUpdateError>> {
    try {
      const snapshot = playbook.toSnapshot();

      const result = await this.#pool.query<{ revision: number }>(
        `UPDATE playbooks
         SET name = $1,
             normalized_name = $2,
             status = $3,
             description = $4,
             active_version_id = $5,
             updated_at = $6,
             archived_at = $7,
             revision = revision + 1
         WHERE workspace_id = $8
           AND playbook_id = $9
           AND revision = $10
         RETURNING revision`,
        [
          snapshot.name,
          snapshot.normalizedName,
          snapshot.status,
          snapshot.description,
          snapshot.activeVersionId,
          snapshot.updatedAt,
          snapshot.archivedAt,
          snapshot.workspaceId,
          snapshot.playbookId,
          expectedRevision.value,
        ],
      );

      const row = result.rows[0];
      if (row === undefined) {
        const existResult = await this.#pool.query<{ playbook_id: string }>(
          'SELECT playbook_id FROM playbooks WHERE workspace_id = $1 AND playbook_id = $2',
          [snapshot.workspaceId, snapshot.playbookId],
        );
        if (existResult.rows.length === 0) {
          return err(playbookNotFound());
        }
        return err(persistenceRevisionConflict(expectedRevision));
      }

      const revisionResult = PersistenceRevision.from(row.revision);
      if (!revisionResult.success) {
        return err(persistenceOperationFailed('playbook.update'));
      }

      return ok(revisionResult.value);
    } catch (e) {
      if (isUniqueConstraintViolation(e, PLAYBOOK_NAME_CONFLICT_CONSTRAINT)) {
        return err(playbookNameConflict());
      }

      return err(persistenceOperationFailed('playbook.update'));
    }
  }
}

function isUniqueConstraintViolation(error: unknown, constraintName: string): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === constraintName
  );
}
