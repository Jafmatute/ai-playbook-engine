import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseSynchronizationRunId,
  parseWorkspaceId,
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
} from '@ai-playbook-engine/core';
import {
  ENABLED_PLAYBOOK_SOURCE_CONFLICT,
  persistenceOperationFailed,
} from '@ai-playbook-engine/application';
import {
  PersistenceRevision,
  playbookSourceNotFound,
  persistenceRevisionConflict,
  enabledPlaybookSourceConflict,
} from '@ai-playbook-engine/application';
import { DatabasePool } from '../connection/pool.js';
import type { PostgresParameter } from '../connection/pool.js';
import { runMigrations } from '../migrations/runner.js';
import { PostgresPlaybookSourceRepository } from './postgres-playbook-source-repository.js';

const databaseUrl = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;
const workspaceA = '00000000-0000-0000-0000-000000000001';
const workspaceB = '00000000-0000-0000-0000-000000000002';
const playbookA = '00000000-0000-0000-0000-000000000011';
const playbookB = '00000000-0000-0000-0000-000000000012';
const playbookC = '00000000-0000-0000-0000-000000000013';

function workspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid workspace fixture.');
  return result.value;
}
function playbookId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid playbook fixture.');
  return result.value;
}
function sourceId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid source fixture.');
  return result.value;
}
function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid instant fixture.');
  return result.value;
}
function externalRootReference(value: string): PlaybookSourceExternalRootReference {
  const result = PlaybookSourceExternalRootReference.create(value);
  if (!result.success) throw new Error('Invalid external root reference fixture.');
  return result.value;
}
function configurationReference(value: string): PlaybookSourceConfigurationReference {
  const result = PlaybookSourceConfigurationReference.create(value);
  if (!result.success) throw new Error('Invalid configuration reference fixture.');
  return result.value;
}
function createPlaybookSource(input: {
  readonly id: string;
  readonly workspace?: string;
  readonly playbook?: string;
  readonly externalRootReference?: string;
  readonly configurationReference?: string;
  readonly createdAt?: string;
}): PlaybookSource {
  return PlaybookSource.create({
    playbookSourceId: sourceId(input.id),
    workspaceId: workspaceId(input.workspace ?? workspaceA),
    playbookId: playbookId(input.playbook ?? playbookA),
    type: 'notion',
    externalRootReference: externalRootReference(input.externalRootReference ?? 'root-page'),
    configurationReference: configurationReference(input.configurationReference ?? 'config-ref'),
    createdAt: instant(input.createdAt ?? '2026-07-01T10:00:00.000Z'),
  });
}

describe.runIf(databaseUrl)('PostgresPlaybookSourceRepository', () => {
  let pool: DatabasePool;
  let repository: PostgresPlaybookSourceRepository;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL not set');
    pool = new DatabasePool({ connectionString: databaseUrl });
    const result = await runMigrations(pool);
    if (!result.success) throw new Error('Migration setup failed');
    repository = new PostgresPlaybookSourceRepository(pool);
  });
  afterAll(async () => {
    await pool.close();
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE playbook_sources, playbooks, workspaces CASCADE');
    await insertWorkspace(workspaceA, 'Workspace A');
    await insertWorkspace(workspaceB, 'Workspace B');
    await insertPlaybook(workspaceA, playbookA, 'Playbook A');
    await insertPlaybook(workspaceA, playbookB, 'Playbook B');
    await insertPlaybook(workspaceB, playbookC, 'Playbook C');
  });

  async function insertWorkspace(id: string, name: string): Promise<void> {
    await pool.query(
      `INSERT INTO workspaces (workspace_id, name, normalized_name, status, description, created_at, updated_at, archived_at) VALUES ($1, $2, $3, 'active', NULL, $4, $4, NULL)`,
      [id, name, name.toLowerCase(), '2026-07-01T10:00:00.000Z'],
    );
  }
  async function insertPlaybook(workspace: string, id: string, name: string): Promise<void> {
    await pool.query(
      `INSERT INTO playbooks (playbook_id, workspace_id, name, normalized_name, status, description, active_version_id, created_at, updated_at, archived_at, revision) VALUES ($1, $2, $3, $4, 'active', NULL, NULL, $5, $5, NULL, 1)`,
      [id, workspace, name, name.toLowerCase(), '2026-07-01T10:00:00.000Z'],
    );
  }
  async function insertSource(input: {
    readonly id: string;
    readonly workspace?: string;
    readonly playbook?: string;
    readonly status?: 'enabled' | 'disabled';
    readonly createdAt?: string;
    readonly revision?: number;
    readonly successRun?: string | null;
    readonly successAt?: string | null;
    readonly failedRun?: string | null;
    readonly failedAt?: string | null;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at) VALUES ($1, $2, $3, 'notion', $4, 'root-page', 'config-ref', $5, $6, $7, $8, $9, $10)`,
      [
        input.id,
        input.workspace ?? workspaceA,
        input.playbook ?? playbookA,
        input.status ?? 'enabled',
        input.createdAt ?? '2026-07-01T10:00:00.000Z',
        input.revision ?? 1,
        input.successRun ?? null,
        input.successAt ?? null,
        input.failedRun ?? null,
        input.failedAt ?? null,
      ],
    );
  }
  interface PostgresConstraintError {
    readonly code: string;
    readonly constraint?: string;
  }
  function isPostgresConstraintError(error: unknown): error is PostgresConstraintError {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string' &&
      (!('constraint' in error) ||
        error.constraint === undefined ||
        typeof error.constraint === 'string')
    );
  }
  async function rejects(
    query: string,
    values: readonly PostgresParameter[],
    expectedCode: string,
    expectedConstraint: string,
  ): Promise<void> {
    try {
      await pool.query(query, values);
    } catch (error) {
      expect(isPostgresConstraintError(error)).toBe(true);
      if (!isPostgresConstraintError(error))
        throw new Error('Expected PostgreSQL constraint error.', { cause: error });
      expect(error.code).toBe(expectedCode);
      expect(error.constraint).toBe(expectedConstraint);
      return;
    }
    throw new Error('Expected PostgreSQL to reject the statement.');
  }

  // ---------------------------------------------------------------------------
  // insert
  // ---------------------------------------------------------------------------

  it('insert returns revision 1', async () => {
    const source = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000301' });
    const result = await repository.insert(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(1);
    }

    const stored = await pool.query<{ revision: number }>(
      'SELECT revision FROM playbook_sources WHERE playbook_source_id = $1',
      [source.id],
    );
    expect(stored.rows[0]?.revision).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------

  it('findById preserves fields and isolates workspace', async () => {
    const id = '00000000-0000-0000-0000-000000000101';
    await insertSource({
      id,
      successRun: '00000000-0000-0000-0000-000000000201',
      successAt: '2026-07-01T11:00:00.000Z',
    });
    const found = await repository.findById(workspaceId(workspaceA), sourceId(id));
    expect(found.success).toBe(true);
    if (!found.success) throw new Error('Expected successful source lookup.');
    expect(found.value).not.toBeNull();
    if (found.value === null) throw new Error('Expected the playbook source to exist.');
    expect(found.value.aggregate.toSnapshot()).toEqual({
      playbookSourceId: id,
      workspaceId: workspaceA,
      playbookId: playbookA,
      type: 'notion',
      status: 'enabled',
      externalRootReference: 'root-page',
      configurationReference: 'config-ref',
      createdAt: '2026-07-01T10:00:00.000Z',
      lastSuccessfulSynchronizationRunId: '00000000-0000-0000-0000-000000000201',
      lastSuccessfulSynchronizationAt: '2026-07-01T11:00:00.000Z',
      lastFailedSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
    });
    expect(found.value.revision.value).toBe(1);

    const wrongWorkspace = await repository.findById(workspaceId(workspaceB), sourceId(id));
    expect(wrongWorkspace.success).toBe(true);
    if (wrongWorkspace.success) expect(wrongWorkspace.value).toBeNull();

    const missing = await repository.findById(
      workspaceId(workspaceA),
      sourceId('00000000-0000-0000-0000-000000000199'),
    );
    expect(missing.success).toBe(true);
    if (missing.success) expect(missing.value).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // findEnabledByPlaybookId (unchanged behavior)
  // ---------------------------------------------------------------------------

  it('findEnabledByPlaybookId finds enabled source and ignores disabled', async () => {
    await insertSource({ id: '00000000-0000-0000-0000-000000000102', status: 'disabled' });
    let result = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBeNull();
    await insertSource({ id: '00000000-0000-0000-0000-000000000103' });
    result = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
    );
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected enabled source lookup.');
    expect(result.value).not.toBeNull();
    if (result.value === null) throw new Error('Expected enabled source.');
    expect(result.value.toSnapshot()).toMatchObject({
      playbookSourceId: '00000000-0000-0000-0000-000000000103',
      workspaceId: workspaceA,
      playbookId: playbookA,
      status: 'enabled',
    });
    await insertSource({ id: '00000000-0000-0000-0000-000000000107', playbook: playbookB });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000108',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const otherPlaybook = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookB),
    );
    expect(otherPlaybook.success).toBe(true);
    if (!otherPlaybook.success || otherPlaybook.value === null)
      throw new Error('Expected Playbook B source.');
    expect(otherPlaybook.value.toSnapshot()).toMatchObject({
      playbookId: playbookB,
      workspaceId: workspaceA,
    });
    const workspaceBSource = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceB),
      playbookId(playbookC),
    );
    expect(workspaceBSource.success).toBe(true);
    if (!workspaceBSource.success || workspaceBSource.value === null)
      throw new Error('Expected Playbook C source.');
    expect(workspaceBSource.value.toSnapshot()).toMatchObject({
      playbookId: playbookC,
      workspaceId: workspaceB,
    });
    const wrongWorkspace = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookC),
    );
    expect(wrongWorkspace.success).toBe(true);
    if (wrongWorkspace.success) expect(wrongWorkspace.value).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // insert — data integrity
  // ---------------------------------------------------------------------------

  it('inserts all source columns into storage', async () => {
    const source = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000301',
      externalRootReference: 'root-301',
      configurationReference: 'config-301',
      createdAt: '2026-07-02T10:00:00.000Z',
    });

    const inserted = await repository.insert(source);
    expect(inserted.success).toBe(true);

    const stored = await pool.query<{
      playbook_source_id: string;
      workspace_id: string;
      playbook_id: string;
      type: string;
      status: string;
      external_root_reference: string;
      configuration_reference: string;
      created_at: Date;
      revision: number;
      last_successful_synchronization_run_id: string | null;
      last_successful_synchronization_at: Date | null;
      last_failed_synchronization_run_id: string | null;
      last_failed_synchronization_at: Date | null;
    }>(
      `SELECT playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at FROM playbook_sources WHERE playbook_source_id = $1`,
      [source.id],
    );
    expect(stored.rows).toEqual([
      {
        playbook_source_id: '00000000-0000-0000-0000-000000000301',
        workspace_id: workspaceA,
        playbook_id: playbookA,
        type: 'notion',
        status: 'enabled',
        external_root_reference: 'root-301',
        configuration_reference: 'config-301',
        created_at: new Date('2026-07-02T10:00:00.000Z'),
        revision: 1,
        last_successful_synchronization_run_id: null,
        last_successful_synchronization_at: null,
        last_failed_synchronization_run_id: null,
        last_failed_synchronization_at: null,
      },
    ]);

    const rebuilt = await repository.findById(source.workspaceId, source.id);
    expect(rebuilt.success).toBe(true);
    if (!rebuilt.success || rebuilt.value === null)
      throw new Error('Expected inserted source to be rebuilt.');
    expect(rebuilt.value.aggregate.toSnapshot()).toEqual(source.toSnapshot());
    expect(rebuilt.value.revision.value).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // enabled source conflict (insert)
  // ---------------------------------------------------------------------------

  it('returns an enabled-source conflict when the playbook already has one', async () => {
    const existing = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000302' });
    const conflicting = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000303' });
    expect((await repository.insert(existing)).success).toBe(true);

    const result = await repository.insert(conflicting);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ENABLED_PLAYBOOK_SOURCE_CONFLICT);
      if (result.error.code === ENABLED_PLAYBOOK_SOURCE_CONFLICT) {
        expect(result.error.details.playbookId).toBe(playbookA);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // insert after disabled
  // ---------------------------------------------------------------------------

  it('inserts an enabled source after a disabled source for the same playbook', async () => {
    const disabled = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000304' });
    const disabledResult = disabled.disable();
    expect(disabledResult.success).toBe(true);
    const enabled = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000305' });

    expect((await repository.insert(disabled)).success).toBe(true);
    expect((await repository.insert(enabled)).success).toBe(true);

    const found = await repository.findEnabledByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
    );
    expect(found.success).toBe(true);
    if (!found.success || found.value === null) throw new Error('Expected enabled source.');
    expect(found.value.id).toBe(enabled.id);
  });

  it('isolates real aggregate inserts across workspace and playbook scopes', async () => {
    const sources = [
      createPlaybookSource({ id: '00000000-0000-0000-0000-000000000306' }),
      createPlaybookSource({ id: '00000000-0000-0000-0000-000000000307', playbook: playbookB }),
      createPlaybookSource({
        id: '00000000-0000-0000-0000-000000000308',
        workspace: workspaceB,
        playbook: playbookC,
      }),
    ];
    for (const source of sources) expect((await repository.insert(source)).success).toBe(true);

    for (const source of sources) {
      const found = await repository.findEnabledByPlaybookId(source.workspaceId, source.playbookId);
      expect(found.success).toBe(true);
      if (!found.success || found.value === null) throw new Error('Expected inserted source.');
      expect(found.value.id).toBe(source.id);
    }

    const missingScopes = [
      { workspace: workspaceId(workspaceA), playbook: playbookId(playbookC) },
      { workspace: workspaceId(workspaceB), playbook: playbookId(playbookA) },
      { workspace: workspaceId(workspaceB), playbook: playbookId(playbookB) },
    ];
    for (const scope of missingScopes) {
      const found = await repository.findEnabledByPlaybookId(scope.workspace, scope.playbook);
      expect(found.success).toBe(true);
      if (found.success) expect(found.value).toBeNull();
    }
  });

  // ---------------------------------------------------------------------------
  // insert errors
  // ---------------------------------------------------------------------------

  it('returns a persistence failure when the source id already exists', async () => {
    const id = '00000000-0000-0000-0000-000000000307';
    const existing = createPlaybookSource({ id });
    const collision = createPlaybookSource({ id, playbook: playbookB });
    expect((await repository.insert(existing)).success).toBe(true);

    const result = await repository.insert(collision);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toEqual(persistenceOperationFailed('playbookSource.insert'));
  });

  it('returns a persistence failure when the playbook belongs to another workspace', async () => {
    const source = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000308',
      workspace: workspaceB,
      playbook: playbookA,
    });

    const result = await repository.insert(source);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error).toEqual(persistenceOperationFailed('playbookSource.insert'));
  });

  it('returns persistence operation failed when insert returns no rows', async () => {
    // Create a trigger that suppresses the insert
    await pool.query(`
      CREATE OR REPLACE FUNCTION fn_suppress_playbook_source_insert()
      RETURNS TRIGGER AS $$
      BEGIN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await pool.query(`
      CREATE TRIGGER trg_suppress_playbook_source_insert
        BEFORE INSERT ON playbook_sources
        FOR EACH ROW
        EXECUTE FUNCTION fn_suppress_playbook_source_insert()
    `);

    try {
      const source = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000309' });
      const result = await repository.insert(source);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toEqual(persistenceOperationFailed('playbookSource.insert'));
      }

      // Verify no row was stored
      const stored = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM playbook_sources WHERE playbook_source_id = $1',
        [source.id],
      );
      expect(Number(stored.rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await pool.query(
        'DROP TRIGGER IF EXISTS trg_suppress_playbook_source_insert ON playbook_sources',
      );
      await pool.query('DROP FUNCTION IF EXISTS fn_suppress_playbook_source_insert()');
    }
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  it('update persists all mutable fields and preserves identity', async () => {
    const source = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000401',
      externalRootReference: 'root-401',
      configurationReference: 'config-401',
      createdAt: '2026-07-01T10:00:00.000Z',
    });
    const insertResult = await repository.insert(source);
    expect(insertResult.success).toBe(true);
    if (!insertResult.success) throw new Error('Expected insert to succeed.');

    const revision1 = insertResult.value;
    expect(revision1.value).toBe(1);

    // Apply all mutable domain transitions
    const disableResult = source.disable();
    expect(disableResult.success).toBe(true);

    const newExternalRoot = externalRootReference('https://example.com/updated');
    const updateExternalResult = source.updateExternalRootReference({
      externalRootReference: newExternalRoot,
    });
    expect(updateExternalResult.success).toBe(true);

    const newConfigRef = configurationReference('config-updated');
    const updateConfigResult = source.updateConfigurationReference({
      configurationReference: newConfigRef,
    });
    expect(updateConfigResult.success).toBe(true);

    const successRunId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000501');
    if (!successRunId.success) throw new Error('Invalid success run id fixture.');
    const successAt = instant('2026-07-01T11:00:00.000Z');
    const successfulSynchronizationResult = source.recordSuccessfulSynchronization({
      synchronizationRunId: successRunId.value,
      succeededAt: successAt,
    });
    expect(successfulSynchronizationResult.success).toBe(true);
    if (!successfulSynchronizationResult.success) {
      throw new Error('Expected successful synchronization metadata to be recorded.');
    }

    const failedRunId = parseSynchronizationRunId('00000000-0000-0000-0000-000000000601');
    if (!failedRunId.success) throw new Error('Invalid failed run id fixture.');
    const failedAt = instant('2026-07-01T12:00:00.000Z');
    const failedSynchronizationResult = source.recordFailedSynchronization({
      synchronizationRunId: failedRunId.value,
      failedAt,
    });
    expect(failedSynchronizationResult.success).toBe(true);
    if (!failedSynchronizationResult.success) {
      throw new Error('Expected failed synchronization metadata to be recorded.');
    }

    const updateResult = await repository.update(source, revision1);
    expect(updateResult.success).toBe(true);
    if (!updateResult.success) throw new Error('Expected update to succeed.');
    expect(updateResult.value.value).toBe(2);

    const reloaded = await repository.findById(source.workspaceId, source.id);
    expect(reloaded.success).toBe(true);
    if (!reloaded.success || reloaded.value === null) throw new Error('Expected reloaded source.');

    // Snapshot exacto completo
    expect(reloaded.value.aggregate.toSnapshot()).toEqual(source.toSnapshot());

    // Ownership e identidad preservados
    expect(reloaded.value.aggregate.id).toBe(source.id);
    expect(reloaded.value.aggregate.workspaceId).toBe(source.workspaceId);
    expect(reloaded.value.aggregate.playbookId).toBe(source.playbookId);
    expect(reloaded.value.aggregate.type).toBe('notion');
    expect(reloaded.value.aggregate.createdAt.toString()).toBe('2026-07-01T10:00:00.000Z');

    // Campos mutables persistidos
    expect(reloaded.value.aggregate.status).toBe('disabled');
    expect(reloaded.value.aggregate.externalRootReference.toString()).toBe(
      'https://example.com/updated',
    );
    expect(reloaded.value.aggregate.configurationReference.toString()).toBe('config-updated');
    expect(reloaded.value.aggregate.lastSuccessfulSynchronizationRunId?.toString()).toBe(
      '00000000-0000-0000-0000-000000000501',
    );
    expect(reloaded.value.aggregate.lastSuccessfulSynchronizationAt?.toString()).toBe(
      '2026-07-01T11:00:00.000Z',
    );
    expect(reloaded.value.aggregate.lastFailedSynchronizationRunId?.toString()).toBe(
      '00000000-0000-0000-0000-000000000601',
    );
    expect(reloaded.value.aggregate.lastFailedSynchronizationAt?.toString()).toBe(
      '2026-07-01T12:00:00.000Z',
    );
    expect(reloaded.value.revision.value).toBe(2);
  });

  it('update returns revision conflict when expectedRevision does not match', async () => {
    const source = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000403' });
    const insertResult = await repository.insert(source);
    expect(insertResult.success).toBe(true);
    if (!insertResult.success) throw new Error('Expected insert to succeed.');

    const revision1 = insertResult.value;
    expect(revision1.value).toBe(1);

    // First update succeeds: change configuration reference
    const newConfigRef = configurationReference('config-v2');
    const updateConfigResult = source.updateConfigurationReference({
      configurationReference: newConfigRef,
    });
    expect(updateConfigResult.success).toBe(true);

    const update1 = await repository.update(source, revision1);
    expect(update1.success).toBe(true);
    if (!update1.success) throw new Error('Expected update to succeed.');

    // Stale aggregate with a different mutation to prove the conflict is not an identity collision
    const staleSource = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000403',
      configurationReference: 'config-stale',
    });
    const staleConfigRefResult = staleSource.updateConfigurationReference({
      configurationReference: configurationReference('config-stale-2'),
    });
    expect(staleConfigRefResult.success).toBe(true);

    const update2 = await repository.update(staleSource, revision1);
    expect(update2.success).toBe(false);
    if (!update2.success) {
      expect(update2.error).toEqual(persistenceRevisionConflict(revision1));
    }

    // Verify stored revision is still 2 and state is from the first update
    const reloaded = await repository.findById(source.workspaceId, source.id);
    expect(reloaded.success).toBe(true);
    if (!reloaded.success || reloaded.value === null) throw new Error('Expected reloaded source.');
    expect(reloaded.value.revision.value).toBe(2);
    expect(reloaded.value.aggregate.configurationReference.toString()).toBe('config-v2');
    expect(reloaded.value.aggregate.toSnapshot()).toEqual(source.toSnapshot());
  });

  it('update returns source not found for non-existent source', async () => {
    const source = createPlaybookSource({ id: '00000000-0000-0000-0000-000000000404' });
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');

    const result = await repository.update(source, revResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(playbookSourceNotFound(source.id));
    }
  });

  it('update returns source not found when workspace does not match', async () => {
    // Insert source with valid ownership: workspaceB + playbookC
    const source = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000405',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const insertResult = await repository.insert(source);
    expect(insertResult.success).toBe(true);
    if (!insertResult.success) throw new Error('Expected insert to succeed.');
    expect(insertResult.value.value).toBe(1);

    // Attempt update with a different valid ownership (workspaceA + playbookA) but same source ID
    const wrongWorkspaceSource = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000405',
      workspace: workspaceA,
      playbook: playbookA,
    });
    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');

    const result = await repository.update(wrongWorkspaceSource, revResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(playbookSourceNotFound(wrongWorkspaceSource.id));
    }

    // Verify source still exists in workspaceB with playbookC and revision 1
    const stored = await pool.query<{
      revision: number;
      workspace_id: string;
      playbook_id: string;
      status: string;
    }>(
      'SELECT revision, workspace_id, playbook_id, status FROM playbook_sources WHERE playbook_source_id = $1',
      [source.id],
    );
    expect(stored.rows).toHaveLength(1);
    if (stored.rows[0] !== undefined) {
      expect(stored.rows[0].revision).toBe(1);
      expect(stored.rows[0].workspace_id).toBe(workspaceB);
      expect(stored.rows[0].playbook_id).toBe(playbookC);
      expect(stored.rows[0].status).toBe('enabled');
    }
  });

  it('update returns enabled source conflict when enabling would conflict', async () => {
    // Insert first source (enabled)
    const source1 = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000406',
    });
    expect((await repository.insert(source1)).success).toBe(true);

    // Insert second source (disabled)
    const source2 = createPlaybookSource({
      id: '00000000-0000-0000-0000-000000000407',
    });
    source2.disable();
    expect((await repository.insert(source2)).success).toBe(true);

    // Try to enable source2
    const enableResult = source2.enable();
    expect(enableResult.success).toBe(true);

    const revResult = PersistenceRevision.from(1);
    if (!revResult.success) throw new Error('Expected revision 1 to be valid.');

    const result = await repository.update(source2, revResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toEqual(enabledPlaybookSourceConflict(playbookId(playbookA)));
    }

    // Verify source2 is still disabled and revision is still 1
    const reloaded2 = await repository.findById(source2.workspaceId, source2.id);
    expect(reloaded2.success).toBe(true);
    if (!reloaded2.success || reloaded2.value === null)
      throw new Error('Expected reloaded source.');
    expect(reloaded2.value.aggregate.status).toBe('disabled');
    expect(reloaded2.value.revision.value).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // listByPlaybookId (unchanged behavior)
  // ---------------------------------------------------------------------------

  it('lists both statuses in deterministic order with pagination', async () => {
    await insertSource({
      id: '00000000-0000-0000-0000-000000000105',
      createdAt: '2026-07-02T10:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000104',
      status: 'disabled',
      createdAt: '2026-07-02T10:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000106',
      status: 'disabled',
      createdAt: '2026-07-01T11:00:00.000Z',
    });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000109',
      status: 'disabled',
      createdAt: '2026-07-01T10:30:00.000Z',
    });
    await insertSource({ id: '00000000-0000-0000-0000-000000000107', playbook: playbookB });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000108',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const page = await repository.listByPlaybookId(workspaceId(workspaceA), playbookId(playbookA), {
      offset: 0,
      limit: 2,
    });
    expect(page.success).toBe(true);
    if (page.success) {
      expect(page.value.items.map((item) => item.id)).toEqual([
        '00000000-0000-0000-0000-000000000104',
        '00000000-0000-0000-0000-000000000105',
      ]);
      expect(page.value.totalCount).toBe(4);
      expect(page.value.hasMore).toBe(true);
      expect(page.value.offset).toBe(0);
      expect(page.value.limit).toBe(2);
      expect(
        page.value.items.every(
          (item) =>
            item.workspaceId === workspaceId(workspaceA) &&
            item.playbookId === playbookId(playbookA),
        ),
      ).toBe(true);
    }
    const second = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
      { offset: 2, limit: 2 },
    );
    expect(second.success).toBe(true);
    if (!second.success) throw new Error('Expected second page.');
    expect(second.value.items.map((item) => item.id)).toEqual([
      '00000000-0000-0000-0000-000000000106',
      '00000000-0000-0000-0000-000000000109',
    ]);
    expect(second.value.offset).toBe(2);
    expect(second.value.limit).toBe(2);
    expect(second.value.totalCount).toBe(4);
    expect(second.value.hasMore).toBe(false);
    const siblingPlaybook = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookB),
      { offset: 0, limit: 5 },
    );
    expect(siblingPlaybook.success).toBe(true);
    if (!siblingPlaybook.success) throw new Error('Expected sibling playbook page.');
    expect(siblingPlaybook.value.items.map((item) => item.id)).toEqual([
      sourceId('00000000-0000-0000-0000-000000000107'),
    ]);
    const otherWorkspace = await repository.listByPlaybookId(
      workspaceId(workspaceB),
      playbookId(playbookC),
      { offset: 0, limit: 5 },
    );
    expect(otherWorkspace.success).toBe(true);
    if (!otherWorkspace.success) throw new Error('Expected other workspace page.');
    expect(otherWorkspace.value.items.map((item) => item.id)).toEqual([
      sourceId('00000000-0000-0000-0000-000000000108'),
    ]);
    const crossWorkspace = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookC),
      { offset: 0, limit: 5 },
    );
    expect(crossWorkspace.success).toBe(true);
    if (!crossWorkspace.success) throw new Error('Expected cross-workspace page.');
    expect(crossWorkspace.value.items).toEqual([]);
    expect(crossWorkspace.value.totalCount).toBe(0);
    const empty = await repository.listByPlaybookId(
      workspaceId(workspaceA),
      playbookId(playbookA),
      { offset: 20, limit: 5 },
    );
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.value.items).toEqual([]);
      expect(empty.value.offset).toBe(20);
      expect(empty.value.limit).toBe(5);
      expect(empty.value.totalCount).toBe(4);
      expect(empty.value.hasMore).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // constraint enforcement (unchanged)
  // ---------------------------------------------------------------------------

  it('enforces source constraints and ownership', async () => {
    const base = `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision, last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12)`;
    const type = 'notion';
    const status = 'disabled';
    const root = 'root';
    const configuration = 'config';
    const created = '2026-07-01T10:00:00.000Z';
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000110',
        workspaceA,
        playbookA,
        'other',
        status,
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_type_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000111',
        workspaceA,
        playbookA,
        type,
        'other',
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_status_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000112',
        workspaceA,
        playbookA,
        type,
        status,
        ' ',
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_external_root_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000118',
        workspaceA,
        playbookA,
        type,
        status,
        '',
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_external_root_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000119',
        workspaceA,
        playbookA,
        type,
        status,
        ' root ',
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_external_root_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000120',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        '',
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_configuration_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000121',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        ' ',
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_configuration_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000122',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        ' config ',
        created,
        null,
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_configuration_reference_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000113',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        '00000000-0000-0000-0000-000000000211',
        null,
        null,
        null,
      ],
      '23514',
      'playbook_sources_success_metadata_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000123',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        created,
        null,
        null,
      ],
      '23514',
      'playbook_sources_success_metadata_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000124',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        '00000000-0000-0000-0000-000000000212',
        '2026-06-30T10:00:00.000Z',
        null,
        null,
      ],
      '23514',
      'playbook_sources_success_after_created_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000125',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        null,
        '00000000-0000-0000-0000-000000000213',
        null,
      ],
      '23514',
      'playbook_sources_failure_metadata_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000126',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        null,
        null,
        created,
      ],
      '23514',
      'playbook_sources_failure_metadata_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000127',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        null,
        '00000000-0000-0000-0000-000000000214',
        '2026-06-30T10:00:00.000Z',
      ],
      '23514',
      'playbook_sources_failure_after_created_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000128',
        workspaceA,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        '00000000-0000-0000-0000-000000000215',
        created,
        '00000000-0000-0000-0000-000000000215',
        '2026-07-01T11:00:00.000Z',
      ],
      '23514',
      'playbook_sources_distinct_outcome_runs_check',
    );
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000114',
        workspaceB,
        playbookA,
        type,
        status,
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23503',
      'playbook_sources_playbook_owner_fk',
    );
    await insertSource({ id: '00000000-0000-0000-0000-000000000115' });
    await rejects(
      base,
      [
        '00000000-0000-0000-0000-000000000116',
        workspaceA,
        playbookA,
        type,
        'enabled',
        root,
        configuration,
        created,
        null,
        null,
        null,
        null,
      ],
      '23505',
      'idx_playbook_sources_one_enabled_per_playbook',
    );
    await insertSource({ id: '00000000-0000-0000-0000-000000000117', status: 'disabled' });
  });

  it('allows valid source history and enabled-source isolation', async () => {
    await insertSource({ id: '00000000-0000-0000-0000-000000000130' });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000131',
      status: 'disabled',
      successRun: '00000000-0000-0000-0000-000000000220',
      successAt: '2026-07-01T10:00:00.000Z',
      failedRun: '00000000-0000-0000-0000-000000000221',
      failedAt: '2026-07-01T11:00:00.000Z',
    });
    await insertSource({ id: '00000000-0000-0000-0000-000000000132', status: 'disabled' });
    await insertSource({ id: '00000000-0000-0000-0000-000000000133', playbook: playbookB });
    await insertSource({
      id: '00000000-0000-0000-0000-000000000134',
      workspace: workspaceB,
      playbook: playbookC,
    });
    const grouped = await pool.query<{
      workspace_id: string;
      playbook_id: string;
      status: string;
      total: string;
    }>(
      'SELECT workspace_id, playbook_id, status, COUNT(*) AS total FROM playbook_sources GROUP BY workspace_id, playbook_id, status ORDER BY workspace_id, playbook_id, status',
    );
    expect(grouped.rows).toEqual([
      { workspace_id: workspaceA, playbook_id: playbookA, status: 'disabled', total: '2' },
      { workspace_id: workspaceA, playbook_id: playbookA, status: 'enabled', total: '1' },
      { workspace_id: workspaceA, playbook_id: playbookB, status: 'enabled', total: '1' },
      { workspace_id: workspaceB, playbook_id: playbookC, status: 'enabled', total: '1' },
    ]);
    const disabledSourceCount = await pool.query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM playbook_sources WHERE status = 'disabled'",
    );
    expect(disabledSourceCount.rows).toEqual([{ total: '2' }]);
    const history = await pool.query<{
      last_successful_synchronization_run_id: string;
      last_successful_synchronization_at: Date;
      last_failed_synchronization_run_id: string;
      last_failed_synchronization_at: Date;
    }>(
      'SELECT last_successful_synchronization_run_id, last_successful_synchronization_at, last_failed_synchronization_run_id, last_failed_synchronization_at FROM playbook_sources WHERE playbook_source_id = $1',
      ['00000000-0000-0000-0000-000000000131'],
    );
    const row = history.rows[0];
    if (row === undefined) throw new Error('Expected source history.');
    expect(row.last_successful_synchronization_run_id).toBe('00000000-0000-0000-0000-000000000220');
    expect(row.last_successful_synchronization_at.toISOString()).toBe('2026-07-01T10:00:00.000Z');
    expect(row.last_failed_synchronization_run_id).toBe('00000000-0000-0000-0000-000000000221');
    expect(row.last_failed_synchronization_at.toISOString()).toBe('2026-07-01T11:00:00.000Z');
  });
});
