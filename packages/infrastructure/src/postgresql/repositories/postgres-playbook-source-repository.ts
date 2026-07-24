import {
  createPage,
  enabledPlaybookSourceConflict,
  persistenceOperationFailed,
} from '@ai-playbook-engine/application';
import {
  PersistenceRevision,
  persistenceRevisionConflict,
  playbookSourceNotFound,
} from '@ai-playbook-engine/application';
import type {
  Page,
  PaginationRequest,
  PersistenceOperationFailedError,
  PersistenceRevision as PersistenceRevisionType,
  PersistedAggregate,
  PlaybookSourceRepository,
  PlaybookSourceRepositoryInsertError,
  PlaybookSourceRepositoryUpdateError,
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
  mapRowToPersistedPlaybookSource,
  type PlaybookSourceRow,
} from '../mapping/playbook-source-mapper.js';

export class PostgresPlaybookSourceRepository implements PlaybookSourceRepository {
  readonly #pool: DatabasePool;
  constructor(pool: DatabasePool) {
    this.#pool = pool;
  }

  async insert(
    source: PlaybookSource,
  ): Promise<Result<PersistenceRevisionType, PlaybookSourceRepositoryInsertError>> {
    try {
      const snapshot = source.toSnapshot();
      const result = await this.#pool.query<{ playbook_source_id: string; revision: number }>(
        `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING playbook_source_id, revision`,
        [
          snapshot.playbookSourceId,
          snapshot.workspaceId,
          snapshot.playbookId,
          snapshot.type,
          snapshot.status,
          snapshot.externalRootReference,
          snapshot.configurationReference,
          snapshot.createdAt,
          snapshot.lastSuccessfulSynchronizationRunId,
          snapshot.lastSuccessfulSynchronizationAt,
          snapshot.lastFailedSynchronizationRunId,
          snapshot.lastFailedSynchronizationAt,
        ],
      );
      if (
        result.rows.length !== 1 ||
        result.rows[0]?.playbook_source_id !== snapshot.playbookSourceId
      )
        return err(persistenceOperationFailed('playbookSource.insert'));

      const revisionResult = PersistenceRevision.from(result.rows[0].revision);
      if (!revisionResult.success) return err(persistenceOperationFailed('playbookSource.insert'));

      return ok(revisionResult.value);
    } catch (error) {
      if (isUniqueConstraintViolation(error, 'idx_playbook_sources_one_enabled_per_playbook'))
        return err(enabledPlaybookSourceConflict(source.playbookId));
      return err(persistenceOperationFailed('playbookSource.insert'));
    }
  }

  async findById(
    workspaceId: WorkspaceId,
    playbookSourceId: PlaybookSourceId,
  ): Promise<Result<PersistedAggregate<PlaybookSource> | null, PersistenceOperationFailedError>> {
    try {
      const result = await this.#pool.query<PlaybookSourceRow>(
        'SELECT * FROM playbook_sources WHERE workspace_id = $1 AND playbook_source_id = $2',
        [workspaceId, playbookSourceId],
      );
      if (result.rows.length === 0) return ok(null);
      if (result.rows.length !== 1)
        return err(persistenceOperationFailed('playbookSource.findById'));
      const row = result.rows[0];
      if (row === undefined) return err(persistenceOperationFailed('playbookSource.findById'));
      const persisted = mapRowToPersistedPlaybookSource(row);
      return persisted === null
        ? err(persistenceOperationFailed('playbookSource.findById'))
        : ok(persisted);
    } catch {
      return err(persistenceOperationFailed('playbookSource.findById'));
    }
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

  async update(
    source: PlaybookSource,
    expectedRevision: PersistenceRevisionType,
  ): Promise<Result<PersistenceRevisionType, PlaybookSourceRepositoryUpdateError>> {
    try {
      const snapshot = source.toSnapshot();
      const result = await this.#pool.query<{ revision: number }>(
        `UPDATE playbook_sources
         SET
           status = $1,
           external_root_reference = $2,
           configuration_reference = $3,
           last_successful_synchronization_run_id = $4,
           last_successful_synchronization_at = $5,
           last_failed_synchronization_run_id = $6,
           last_failed_synchronization_at = $7,
           revision = revision + 1
         WHERE workspace_id = $8
           AND playbook_source_id = $9
           AND revision = $10
         RETURNING revision`,
        [
          snapshot.status,
          snapshot.externalRootReference,
          snapshot.configurationReference,
          snapshot.lastSuccessfulSynchronizationRunId,
          snapshot.lastSuccessfulSynchronizationAt,
          snapshot.lastFailedSynchronizationRunId,
          snapshot.lastFailedSynchronizationAt,
          snapshot.workspaceId,
          snapshot.playbookSourceId,
          expectedRevision.value,
        ],
      );

      if (result.rows.length === 0) {
        // Check if the source exists at all
        const existence = await this.#pool.query<{ count: string }>(
          'SELECT COUNT(*) AS count FROM playbook_sources WHERE workspace_id = $1 AND playbook_source_id = $2',
          [snapshot.workspaceId, snapshot.playbookSourceId],
        );
        const count = Number(existence.rows[0]?.count ?? 0);
        if (count === 0) return err(playbookSourceNotFound(source.id));
        return err(persistenceRevisionConflict(expectedRevision));
      }

      if (result.rows.length !== 1) return err(persistenceOperationFailed('playbookSource.update'));

      const row = result.rows[0];
      if (row === undefined) return err(persistenceOperationFailed('playbookSource.update'));

      const revisionResult = PersistenceRevision.from(row.revision);
      if (!revisionResult.success) return err(persistenceOperationFailed('playbookSource.update'));

      return ok(revisionResult.value);
    } catch (error) {
      if (isUniqueConstraintViolation(error, 'idx_playbook_sources_one_enabled_per_playbook'))
        return err(enabledPlaybookSourceConflict(source.playbookId));
      return err(persistenceOperationFailed('playbookSource.update'));
    }
  }

  private async findOne(
    operation: 'playbookSource.findEnabledByPlaybookId',
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

function isUniqueConstraintViolation(error: unknown, constraint: string): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error &&
    error.constraint === constraint
  );
}
