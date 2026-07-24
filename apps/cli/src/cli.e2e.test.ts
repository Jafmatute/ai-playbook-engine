import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const testDbUrl = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'dist', 'main.js');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function runCli(
  args: readonly string[],
  env?: Record<string, string>,
): { readonly stdout: string; readonly stderr: string; readonly status: number | null } {
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL is not set');
  }
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    env: {
      ...process.env,
      AI_PLAYBOOK_ENGINE_DATABASE_URL: testDbUrl,
      AI_PLAYBOOK_ENGINE_CLI_OUTPUT: 'human',
      ...env,
    },
    shell: false,
    encoding: 'utf-8',
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function assertSafeOutput(output: string): void {
  if (!testDbUrl) return;
  const urlObj = new URL(testDbUrl);
  if (urlObj.password) {
    expect(output).not.toContain(urlObj.password);
  }
  if (urlObj.username) {
    expect(output).not.toContain(urlObj.username);
  }
  expect(output).not.toContain(testDbUrl);
}

function expectIsoTimestamp(value: unknown): void {
  expect(typeof value).toBe('string');
  if (typeof value !== 'string') {
    throw new Error('Expected an ISO timestamp string.');
  }
  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(new Date(value).toISOString()).toBe(value);
}

describe.runIf(testDbUrl)('CLI E2E Single Flow', () => {
  it('runs the full workspace and playbook flow', async () => {
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is not set');
    }

    // 1. Reset test database with pool cleanup guarantees
    const pool = new pg.Pool({ connectionString: testDbUrl });
    try {
      await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    } finally {
      await pool.end();
    }

    // 2. database migrate
    const migrateRes = runCli(['database', 'migrate']);
    expect(migrateRes.status).toBe(0);
    expect(migrateRes.stderr).toBe('');
    assertSafeOutput(migrateRes.stdout);

    // 3. workspace initialize --output json
    const initRes = runCli([
      'workspace',
      'initialize',
      '--name',
      'Workspace con espacios',
      '--output',
      'json',
    ]);
    expect(initRes.status).toBe(0);
    expect(initRes.stderr).toBe('');
    assertSafeOutput(initRes.stdout);

    const initJson: unknown = JSON.parse(initRes.stdout);
    expect(initJson).not.toBeNull();
    expect(typeof initJson).toBe('object');

    let workspaceId = '';
    if (
      initJson !== null &&
      typeof initJson === 'object' &&
      'success' in initJson &&
      initJson.success === true &&
      'data' in initJson &&
      initJson.data !== null &&
      typeof initJson.data === 'object' &&
      'workspaceId' in initJson.data &&
      typeof initJson.data.workspaceId === 'string'
    ) {
      workspaceId = initJson.data.workspaceId;
    }

    expect(workspaceId).not.toBe('');
    expect(workspaceId).toMatch(UUID_PATTERN);

    // 4. workspace show (human output, verify workspace details are correct)
    const showRes = runCli(['workspace', 'show'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showRes.status).toBe(0);
    expect(showRes.stderr).toBe('');
    expect(showRes.stdout).toContain('Workspace con espacios');
    expect(showRes.stdout).toContain(workspaceId);
    assertSafeOutput(showRes.stdout);

    // 5. playbook create --output json
    const createRes = runCli(
      ['playbook', 'create', '--name', 'Playbook con espacios', '--output', 'json'],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(createRes.status).toBe(0);
    expect(createRes.stderr).toBe('');
    assertSafeOutput(createRes.stdout);

    const createJson: unknown = JSON.parse(createRes.stdout);
    expect(createJson).not.toBeNull();
    expect(typeof createJson).toBe('object');

    let playbookId = '';
    if (
      createJson !== null &&
      typeof createJson === 'object' &&
      'success' in createJson &&
      createJson.success === true &&
      'data' in createJson &&
      createJson.data !== null &&
      typeof createJson.data === 'object' &&
      'playbookId' in createJson.data &&
      typeof createJson.data.playbookId === 'string'
    ) {
      playbookId = createJson.data.playbookId;
    }

    expect(playbookId).not.toBe('');
    expect(playbookId).toMatch(UUID_PATTERN);

    // 6. playbook list (human output, verify persistence and listing works)
    const listRes = runCli(['playbook', 'list'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(listRes.status).toBe(0);
    expect(listRes.stderr).toBe('');
    expect(listRes.stdout).toContain('Playbook con espacios');
    assertSafeOutput(listRes.stdout);

    // 7. playbook show (human output, verify fetching playbook by ID works)
    const showPbRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showPbRes.status).toBe(0);
    expect(showPbRes.stderr).toBe('');
    expect(showPbRes.stdout).toContain('Playbook con espacios');
    expect(showPbRes.stdout).toContain(playbookId);
    assertSafeOutput(showPbRes.stdout);

    // 8. playbook rename --id <playbookId> --name <nuevo-nombre> --output json
    const renameRes = runCli(
      [
        'playbook',
        'rename',
        '--id',
        playbookId,
        '--name',
        'Playbook renombrado',
        '--output',
        'json',
      ],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(renameRes.status).toBe(0);
    expect(renameRes.stderr).toBe('');
    assertSafeOutput(renameRes.stdout);

    const renameJson: unknown = JSON.parse(renameRes.stdout);
    expect(renameJson).not.toBeNull();
    expect(typeof renameJson).toBe('object');
    if (
      renameJson !== null &&
      typeof renameJson === 'object' &&
      'success' in renameJson &&
      renameJson.success === true &&
      'data' in renameJson &&
      renameJson.data !== null &&
      typeof renameJson.data === 'object' &&
      'playbookId' in renameJson.data &&
      'name' in renameJson.data
    ) {
      expect(renameJson.data.playbookId).toBe(playbookId);
      expect(renameJson.data.name).toBe('Playbook renombrado');
    } else {
      throw new Error('Invalid rename json output structure');
    }

    // 9. playbook show (human output, verify it shows the new name)
    const showPbRenamedRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showPbRenamedRes.status).toBe(0);
    expect(showPbRenamedRes.stderr).toBe('');
    expect(showPbRenamedRes.stdout).toContain('Playbook renombrado');
    expect(showPbRenamedRes.stdout).not.toContain('Playbook con espacios');
    assertSafeOutput(showPbRenamedRes.stdout);

    // 10. playbook list (human output, verify it contains the new name and not the old name)
    const listPbRenamedRes = runCli(['playbook', 'list'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(listPbRenamedRes.status).toBe(0);
    expect(listPbRenamedRes.stderr).toBe('');
    expect(listPbRenamedRes.stdout).toContain('Playbook renombrado');
    expect(listPbRenamedRes.stdout).not.toContain('Playbook con espacios');
    assertSafeOutput(listPbRenamedRes.stdout);

    // 11. Create a second Playbook
    const createRes2 = runCli(
      ['playbook', 'create', '--name', 'Segundo Playbook', '--output', 'json'],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(createRes2.status).toBe(0);
    expect(createRes2.stderr).toBe('');
    assertSafeOutput(createRes2.stdout);

    const createJson2: unknown = JSON.parse(createRes2.stdout);
    expect(createJson2).not.toBeNull();
    expect(typeof createJson2).toBe('object');

    let playbookId2 = '';
    if (
      createJson2 !== null &&
      typeof createJson2 === 'object' &&
      'success' in createJson2 &&
      createJson2.success === true &&
      'data' in createJson2 &&
      createJson2.data !== null &&
      typeof createJson2.data === 'object' &&
      'playbookId' in createJson2.data &&
      typeof createJson2.data.playbookId === 'string'
    ) {
      playbookId2 = createJson2.data.playbookId;
    }
    expect(playbookId2).toMatch(UUID_PATTERN);

    // 12. Rename the second active Playbook to the first Playbook's name and verify the conflict.
    const renameConflictRes = runCli(
      [
        'playbook',
        'rename',
        '--id',
        playbookId2,
        '--name',
        'Playbook renombrado',
        '--output',
        'json',
      ],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(renameConflictRes.status).toBe(4);
    expect(renameConflictRes.stderr).toBe('');
    assertSafeOutput(renameConflictRes.stdout);

    const renameConflictJson: unknown = JSON.parse(renameConflictRes.stdout);
    expect(renameConflictJson).not.toBeNull();
    expect(typeof renameConflictJson).toBe('object');
    if (
      renameConflictJson !== null &&
      typeof renameConflictJson === 'object' &&
      'success' in renameConflictJson &&
      'error' in renameConflictJson &&
      renameConflictJson.error !== null &&
      typeof renameConflictJson.error === 'object' &&
      'code' in renameConflictJson.error
    ) {
      expect(renameConflictJson.success).toBe(false);
      expect(renameConflictJson.error.code).toBe('PLAYBOOK_NAME_CONFLICT');
      expect('details' in renameConflictJson.error).toBe(true);
      if (
        'details' in renameConflictJson.error &&
        renameConflictJson.error.details !== null &&
        typeof renameConflictJson.error.details === 'object'
      ) {
        expect(Object.keys(renameConflictJson.error.details)).toEqual([]);
      } else {
        throw new Error('Invalid rename conflict details.');
      }
    } else {
      throw new Error('Invalid rename conflict json output structure');
    }

    // 13. Verify that the conflicting rename leaves the second Playbook unchanged.
    const showPb2Res = runCli(['playbook', 'show', '--id', playbookId2], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showPb2Res.status).toBe(0);
    expect(showPb2Res.stderr).toBe('');
    expect(showPb2Res.stdout).toContain('Segundo Playbook');
    expect(showPb2Res.stdout).not.toContain('Playbook renombrado');
    assertSafeOutput(showPb2Res.stdout);

    // 14. Archive the first Playbook after the active-name conflict is verified.
    const archiveRes = runCli(['playbook', 'archive', '--id', playbookId, '--output', 'json'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(archiveRes.status).toBe(0);
    expect(archiveRes.stderr).toBe('');
    assertSafeOutput(archiveRes.stdout);
    const archiveJson: unknown = JSON.parse(archiveRes.stdout);
    if (
      archiveJson !== null &&
      typeof archiveJson === 'object' &&
      'success' in archiveJson &&
      archiveJson.success === true &&
      'data' in archiveJson &&
      archiveJson.data !== null &&
      typeof archiveJson.data === 'object' &&
      'playbookId' in archiveJson.data &&
      'name' in archiveJson.data &&
      'status' in archiveJson.data &&
      'archivedAt' in archiveJson.data &&
      'updatedAt' in archiveJson.data
    ) {
      expect(archiveJson.data.playbookId).toBe(playbookId);
      expect(typeof archiveJson.data.playbookId).toBe('string');
      expect(archiveJson.data.playbookId).toMatch(UUID_PATTERN);
      expect(archiveJson.data.name).toBe('Playbook renombrado');
      expect(archiveJson.data.status).toBe('archived');
      expectIsoTimestamp(archiveJson.data.archivedAt);
      expect(archiveJson.data.updatedAt).toBe(archiveJson.data.archivedAt);
      expect('revision' in archiveJson.data).toBe(false);
    } else {
      throw new Error('Invalid archive json output structure');
    }

    // 15. Show the archived Playbook.
    const showArchivedRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showArchivedRes.status).toBe(0);
    expect(showArchivedRes.stderr).toBe('');
    expect(showArchivedRes.stdout).toContain('Playbook renombrado');
    expect(showArchivedRes.stdout).toContain('Status:            archived');
    expect(showArchivedRes.stdout).toContain('Archived At:');
    assertSafeOutput(showArchivedRes.stdout);

    // 16. Filter archived and active Playbooks after archiving the first one.
    const archivedListRes = runCli(['playbook', 'list', '--status', 'archived'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(archivedListRes.status).toBe(0);
    expect(archivedListRes.stderr).toBe('');
    expect(archivedListRes.stdout).toContain('Playbook renombrado');
    assertSafeOutput(archivedListRes.stdout);

    const activeListRes = runCli(['playbook', 'list', '--status', 'active'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(activeListRes.status).toBe(0);
    expect(activeListRes.stderr).toBe('');
    expect(activeListRes.stdout).not.toContain('Playbook renombrado');
    expect(activeListRes.stdout).toContain('Segundo Playbook');
    assertSafeOutput(activeListRes.stdout);

    // 17. Reject a second archive without changing persisted state.
    const archiveAgainRes = runCli(
      ['playbook', 'archive', '--id', playbookId, '--output', 'json'],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(archiveAgainRes.status).toBe(4);
    expect(archiveAgainRes.stderr).toBe('');
    assertSafeOutput(archiveAgainRes.stdout);
    const archiveAgainJson: unknown = JSON.parse(archiveAgainRes.stdout);
    if (
      archiveAgainJson !== null &&
      typeof archiveAgainJson === 'object' &&
      'success' in archiveAgainJson &&
      'error' in archiveAgainJson &&
      archiveAgainJson.error !== null &&
      typeof archiveAgainJson.error === 'object' &&
      'code' in archiveAgainJson.error
    ) {
      expect(archiveAgainJson.success).toBe(false);
      expect(archiveAgainJson.error.code).toBe('PLAYBOOK_ALREADY_ARCHIVED');
      expect('details' in archiveAgainJson.error).toBe(true);
      if (
        'details' in archiveAgainJson.error &&
        archiveAgainJson.error.details !== null &&
        typeof archiveAgainJson.error.details === 'object' &&
        'currentStatus' in archiveAgainJson.error.details
      ) {
        expect(archiveAgainJson.error.details.currentStatus).toBe('archived');
      } else {
        throw new Error('Invalid archive conflict details.');
      }
    } else {
      throw new Error('Invalid archive conflict json output structure');
    }

    // 18. Verify the first Playbook remains archived after the rejected transition.
    const showAfterArchiveConflictRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showAfterArchiveConflictRes.status).toBe(0);
    expect(showAfterArchiveConflictRes.stderr).toBe('');
    expect(showAfterArchiveConflictRes.stdout).toContain('Playbook renombrado');
    expect(showAfterArchiveConflictRes.stdout).toContain('Status:            archived');
    expect(showAfterArchiveConflictRes.stdout).toContain('Archived At:');
    assertSafeOutput(showAfterArchiveConflictRes.stdout);

    // 19. An archived name can be reused by an active Playbook.
    const reuseNameRes = runCli(
      [
        'playbook',
        'rename',
        '--id',
        playbookId2,
        '--name',
        'Playbook renombrado',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(reuseNameRes.status).toBe(0);
    expect(reuseNameRes.stderr).toBe('');
    assertSafeOutput(reuseNameRes.stdout);
    const reuseNameJson: unknown = JSON.parse(reuseNameRes.stdout);
    if (
      reuseNameJson !== null &&
      typeof reuseNameJson === 'object' &&
      'success' in reuseNameJson &&
      reuseNameJson.success === true &&
      'data' in reuseNameJson &&
      reuseNameJson.data !== null &&
      typeof reuseNameJson.data === 'object' &&
      'playbookId' in reuseNameJson.data &&
      'name' in reuseNameJson.data
    ) {
      expect(reuseNameJson.data.playbookId).toBe(playbookId2);
      expect(reuseNameJson.data.name).toBe('Playbook renombrado');
    } else throw new Error('Invalid rename reuse json output structure');

    // 20. Restore rejects duplicate active names without partial update.
    const restoreConflictRes = runCli(
      ['playbook', 'restore', '--id', playbookId, '--output', 'json'],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(restoreConflictRes.status).toBe(4);
    expect(restoreConflictRes.stderr).toBe('');
    assertSafeOutput(restoreConflictRes.stdout);
    const restoreConflictJson: unknown = JSON.parse(restoreConflictRes.stdout);
    if (
      restoreConflictJson !== null &&
      typeof restoreConflictJson === 'object' &&
      'success' in restoreConflictJson &&
      'error' in restoreConflictJson &&
      restoreConflictJson.error !== null &&
      typeof restoreConflictJson.error === 'object' &&
      'code' in restoreConflictJson.error
    ) {
      expect(restoreConflictJson.success).toBe(false);
      expect(restoreConflictJson.error.code).toBe('PLAYBOOK_NAME_CONFLICT');
    } else throw new Error('Invalid restore conflict json output structure');
    const showRestoreConflictRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showRestoreConflictRes.status).toBe(0);
    expect(showRestoreConflictRes.stderr).toBe('');
    expect(showRestoreConflictRes.stdout).toContain('Status:            archived');
    expect(showRestoreConflictRes.stdout).toContain('Playbook renombrado');
    expect(showRestoreConflictRes.stdout).toContain('Archived At:');
    assertSafeOutput(showRestoreConflictRes.stdout);

    // 21. Release name, then restore archived Playbook.
    const releaseNameRes = runCli(
      [
        'playbook',
        'rename',
        '--id',
        playbookId2,
        '--name',
        'Segundo Playbook liberado',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(releaseNameRes.status).toBe(0);
    expect(releaseNameRes.stderr).toBe('');
    assertSafeOutput(releaseNameRes.stdout);
    const releaseNameJson: unknown = JSON.parse(releaseNameRes.stdout);
    if (
      releaseNameJson !== null &&
      typeof releaseNameJson === 'object' &&
      'success' in releaseNameJson &&
      releaseNameJson.success === true &&
      'data' in releaseNameJson &&
      releaseNameJson.data !== null &&
      typeof releaseNameJson.data === 'object' &&
      'playbookId' in releaseNameJson.data &&
      'name' in releaseNameJson.data
    ) {
      expect(releaseNameJson.data.playbookId).toBe(playbookId2);
      expect(releaseNameJson.data.name).toBe('Segundo Playbook liberado');
    } else {
      throw new Error('Invalid release-name json output structure');
    }
    const restoreRes = runCli(['playbook', 'restore', '--id', playbookId, '--output', 'json'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(restoreRes.status).toBe(0);
    expect(restoreRes.stderr).toBe('');
    assertSafeOutput(restoreRes.stdout);
    const restoreJson: unknown = JSON.parse(restoreRes.stdout);
    if (
      restoreJson !== null &&
      typeof restoreJson === 'object' &&
      'success' in restoreJson &&
      restoreJson.success === true &&
      'data' in restoreJson &&
      restoreJson.data !== null &&
      typeof restoreJson.data === 'object' &&
      'playbookId' in restoreJson.data &&
      'name' in restoreJson.data &&
      'status' in restoreJson.data &&
      'archivedAt' in restoreJson.data &&
      'updatedAt' in restoreJson.data
    ) {
      expect(restoreJson.data.playbookId).toBe(playbookId);
      expect(restoreJson.data.name).toBe('Playbook renombrado');
      expect(restoreJson.data.status).toBe('active');
      expect(restoreJson.data.archivedAt).toBeNull();
      expectIsoTimestamp(restoreJson.data.updatedAt);
      expect('revision' in restoreJson.data).toBe(false);
    } else throw new Error('Invalid restore json output structure');

    // 22. Verify restored state, filters, and rejected repeat transition.
    const showRestoredRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showRestoredRes.status).toBe(0);
    expect(showRestoredRes.stderr).toBe('');
    expect(showRestoredRes.stdout).toContain('Playbook renombrado');
    expect(showRestoredRes.stdout).toContain('Status:            active');
    expect(showRestoredRes.stdout).not.toContain('Archived At:');
    assertSafeOutput(showRestoredRes.stdout);
    const restoredActiveListRes = runCli(['playbook', 'list', '--status', 'active'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(restoredActiveListRes.status).toBe(0);
    expect(restoredActiveListRes.stderr).toBe('');
    expect(restoredActiveListRes.stdout).toContain('Playbook renombrado');
    expect(restoredActiveListRes.stdout).toContain('Segundo Playbook liberado');
    assertSafeOutput(restoredActiveListRes.stdout);
    const restoredArchivedListRes = runCli(['playbook', 'list', '--status', 'archived'], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(restoredArchivedListRes.status).toBe(0);
    expect(restoredArchivedListRes.stderr).toBe('');
    expect(restoredArchivedListRes.stdout).not.toContain('Playbook renombrado');
    assertSafeOutput(restoredArchivedListRes.stdout);
    const restoreAgainRes = runCli(
      ['playbook', 'restore', '--id', playbookId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(restoreAgainRes.status).toBe(4);
    expect(restoreAgainRes.stderr).toBe('');
    assertSafeOutput(restoreAgainRes.stdout);
    const restoreAgainJson: unknown = JSON.parse(restoreAgainRes.stdout);
    if (
      restoreAgainJson !== null &&
      typeof restoreAgainJson === 'object' &&
      'success' in restoreAgainJson &&
      'error' in restoreAgainJson &&
      restoreAgainJson.error !== null &&
      typeof restoreAgainJson.error === 'object' &&
      'code' in restoreAgainJson.error
    ) {
      expect(restoreAgainJson.success).toBe(false);
      expect(restoreAgainJson.error.code).toBe('PLAYBOOK_NOT_ARCHIVED');
    } else throw new Error('Invalid restore repeat json output structure');
    const showAfterRestoreAgainRes = runCli(['playbook', 'show', '--id', playbookId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showAfterRestoreAgainRes.status).toBe(0);
    expect(showAfterRestoreAgainRes.stderr).toBe('');
    expect(showAfterRestoreAgainRes.stdout).toContain('Playbook renombrado');
    expect(showAfterRestoreAgainRes.stdout).toContain('Status:            active');
    expect(showAfterRestoreAgainRes.stdout).not.toContain('Archived At:');
    assertSafeOutput(showAfterRestoreAgainRes.stdout);

    let firstPlaybookSourceId: string;
    let firstPlaybookSourceCreatedAt: string;
    let secondPlaybookSourceId: string;

    // 23. Register a source for the restored active Playbook.
    const registerSourceRes = runCli(
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        playbookId,
        '--type',
        'notion',
        '--external-root-reference',
        'notion-root-1',
        '--configuration-reference',
        'notion/main',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(registerSourceRes.status).toBe(0);
    expect(registerSourceRes.stderr).toBe('');
    assertSafeOutput(registerSourceRes.stdout);
    const registerSourceJson: unknown = JSON.parse(registerSourceRes.stdout);
    if (
      registerSourceJson !== null &&
      typeof registerSourceJson === 'object' &&
      'success' in registerSourceJson &&
      registerSourceJson.success === true &&
      'data' in registerSourceJson &&
      registerSourceJson.data !== null &&
      typeof registerSourceJson.data === 'object' &&
      'playbookSourceId' in registerSourceJson.data &&
      typeof registerSourceJson.data.playbookSourceId === 'string' &&
      'workspaceId' in registerSourceJson.data &&
      'playbookId' in registerSourceJson.data &&
      'type' in registerSourceJson.data &&
      'status' in registerSourceJson.data &&
      'externalRootReference' in registerSourceJson.data &&
      'configurationReference' in registerSourceJson.data &&
      'createdAt' in registerSourceJson.data &&
      'lastSuccessfulSynchronizationRunId' in registerSourceJson.data &&
      'lastSuccessfulSynchronizationAt' in registerSourceJson.data &&
      'lastFailedSynchronizationRunId' in registerSourceJson.data &&
      'lastFailedSynchronizationAt' in registerSourceJson.data
    ) {
      expect(registerSourceJson.data.playbookSourceId).toMatch(UUID_PATTERN);
      firstPlaybookSourceId = registerSourceJson.data.playbookSourceId;
      expect(registerSourceJson.data.workspaceId).toBe(workspaceId);
      expect(registerSourceJson.data.playbookId).toBe(playbookId);
      expect(registerSourceJson.data.type).toBe('notion');
      expect(registerSourceJson.data.status).toBe('enabled');
      expect(registerSourceJson.data.externalRootReference).toBe('notion-root-1');
      expect(registerSourceJson.data.configurationReference).toBe('notion/main');
      expectIsoTimestamp(registerSourceJson.data.createdAt);
      expect(typeof registerSourceJson.data.createdAt).toBe('string');
      if (typeof registerSourceJson.data.createdAt !== 'string')
        throw new Error('Expected createdAt to be a string.');
      firstPlaybookSourceCreatedAt = registerSourceJson.data.createdAt;
      expect(registerSourceJson.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(registerSourceJson.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(registerSourceJson.data.lastFailedSynchronizationRunId).toBeNull();
      expect(registerSourceJson.data.lastFailedSynchronizationAt).toBeNull();
      expect(Object.keys(registerSourceJson.data).sort()).toEqual([
        'configurationReference',
        'createdAt',
        'externalRootReference',
        'lastFailedSynchronizationRunId',
        'lastFailedSynchronizationAt',
        'lastSuccessfulSynchronizationRunId',
        'lastSuccessfulSynchronizationAt',
        'playbookId',
        'playbookSourceId',
        'status',
        'type',
        'workspaceId',
      ]);
    } else throw new Error('Invalid source registration json output structure');

    // 24. Reject a second enabled source for the same Playbook.
    const sourceConflictRes = runCli(
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        playbookId,
        '--type',
        'notion',
        '--external-root-reference',
        'notion-root-conflict',
        '--configuration-reference',
        'notion/conflict',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(sourceConflictRes.status).toBe(4);
    expect(sourceConflictRes.stderr).toBe('');
    assertSafeOutput(sourceConflictRes.stdout);
    const sourceConflictJson: unknown = JSON.parse(sourceConflictRes.stdout);
    if (
      sourceConflictJson !== null &&
      typeof sourceConflictJson === 'object' &&
      'success' in sourceConflictJson &&
      'error' in sourceConflictJson &&
      sourceConflictJson.error !== null &&
      typeof sourceConflictJson.error === 'object' &&
      'code' in sourceConflictJson.error
    ) {
      expect(sourceConflictJson.success).toBe(false);
      expect(sourceConflictJson.error.code).toBe('ENABLED_PLAYBOOK_SOURCE_CONFLICT');
      if (
        'details' in sourceConflictJson.error &&
        sourceConflictJson.error.details !== null &&
        typeof sourceConflictJson.error.details === 'object' &&
        'playbookId' in sourceConflictJson.error.details
      ) {
        expect(sourceConflictJson.error.details.playbookId).toBe(playbookId);
      } else {
        throw new Error('Invalid source conflict details.');
      }
    } else throw new Error('Invalid source conflict json output structure');

    // 25. Register a source for the second active Playbook.
    const registerSource2Res = runCli(
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        playbookId2,
        '--type',
        'notion',
        '--external-root-reference',
        'notion-root-2',
        '--configuration-reference',
        'notion/second',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(registerSource2Res.status).toBe(0);
    expect(registerSource2Res.stderr).toBe('');
    assertSafeOutput(registerSource2Res.stdout);
    const registerSource2Json: unknown = JSON.parse(registerSource2Res.stdout);
    if (
      registerSource2Json !== null &&
      typeof registerSource2Json === 'object' &&
      'success' in registerSource2Json &&
      registerSource2Json.success === true &&
      'data' in registerSource2Json &&
      registerSource2Json.data !== null &&
      typeof registerSource2Json.data === 'object' &&
      'playbookSourceId' in registerSource2Json.data &&
      typeof registerSource2Json.data.playbookSourceId === 'string' &&
      'workspaceId' in registerSource2Json.data &&
      typeof registerSource2Json.data.workspaceId === 'string' &&
      'playbookId' in registerSource2Json.data &&
      typeof registerSource2Json.data.playbookId === 'string' &&
      'type' in registerSource2Json.data &&
      typeof registerSource2Json.data.type === 'string' &&
      'status' in registerSource2Json.data &&
      typeof registerSource2Json.data.status === 'string' &&
      'externalRootReference' in registerSource2Json.data &&
      typeof registerSource2Json.data.externalRootReference === 'string' &&
      'configurationReference' in registerSource2Json.data &&
      typeof registerSource2Json.data.configurationReference === 'string' &&
      'createdAt' in registerSource2Json.data &&
      typeof registerSource2Json.data.createdAt === 'string'
    ) {
      expect(registerSource2Json.data.playbookSourceId).toMatch(UUID_PATTERN);
      secondPlaybookSourceId = registerSource2Json.data.playbookSourceId;

      expect(registerSource2Json.data.workspaceId).toBe(workspaceId);

      expect(registerSource2Json.data.playbookId).toBe(playbookId2);

      expect(registerSource2Json.data.type).toBe('notion');
      expect(registerSource2Json.data.status).toBe('enabled');

      expect(registerSource2Json.data.externalRootReference).toBe('notion-root-2');

      expect(registerSource2Json.data.configurationReference).toBe('notion/second');

      expectIsoTimestamp(registerSource2Json.data.createdAt);

      expect('revision' in registerSource2Json.data).toBe(false);
      expect('token' in registerSource2Json.data).toBe(false);
      expect('credential' in registerSource2Json.data).toBe(false);
      expect('secret' in registerSource2Json.data).toBe(false);
    } else {
      throw new Error('Invalid second source registration JSON success output structure.');
    }

    // 26. An archived Playbook rejects source registration before checking existing sources.
    const archiveSecondRes = runCli(
      ['playbook', 'archive', '--id', playbookId2, '--output', 'json'],
      {
        AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
      },
    );
    expect(archiveSecondRes.status).toBe(0);
    expect(archiveSecondRes.stderr).toBe('');
    assertSafeOutput(archiveSecondRes.stdout);
    const archiveSecondJson: unknown = JSON.parse(archiveSecondRes.stdout);
    if (
      archiveSecondJson !== null &&
      typeof archiveSecondJson === 'object' &&
      'success' in archiveSecondJson &&
      archiveSecondJson.success === true &&
      'data' in archiveSecondJson &&
      archiveSecondJson.data !== null &&
      typeof archiveSecondJson.data === 'object' &&
      'playbookId' in archiveSecondJson.data &&
      'status' in archiveSecondJson.data &&
      'archivedAt' in archiveSecondJson.data
    ) {
      expect(archiveSecondJson.data.playbookId).toBe(playbookId2);
      expect(typeof archiveSecondJson.data.playbookId).toBe('string');
      expect(archiveSecondJson.data.playbookId).toMatch(UUID_PATTERN);
      expect(archiveSecondJson.data.status).toBe('archived');
      expectIsoTimestamp(archiveSecondJson.data.archivedAt);
    } else throw new Error('Invalid second archive json output structure');
    const archivedSourceConflictRes = runCli(
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        playbookId2,
        '--type',
        'notion',
        '--external-root-reference',
        'notion-root-archived',
        '--configuration-reference',
        'notion/archived',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(archivedSourceConflictRes.status).toBe(4);
    expect(archivedSourceConflictRes.stderr).toBe('');
    assertSafeOutput(archivedSourceConflictRes.stdout);
    const archivedSourceConflictJson: unknown = JSON.parse(archivedSourceConflictRes.stdout);
    if (
      archivedSourceConflictJson !== null &&
      typeof archivedSourceConflictJson === 'object' &&
      'success' in archivedSourceConflictJson &&
      'error' in archivedSourceConflictJson &&
      archivedSourceConflictJson.error !== null &&
      typeof archivedSourceConflictJson.error === 'object' &&
      'code' in archivedSourceConflictJson.error
    ) {
      expect(archivedSourceConflictJson.success).toBe(false);
      expect(archivedSourceConflictJson.error.code).toBe('PLAYBOOK_ARCHIVED');
      expect(archivedSourceConflictJson.error.code).not.toBe('ENABLED_PLAYBOOK_SOURCE_CONFLICT');
      if (
        'details' in archivedSourceConflictJson.error &&
        archivedSourceConflictJson.error.details !== null &&
        typeof archivedSourceConflictJson.error.details === 'object' &&
        'playbookId' in archivedSourceConflictJson.error.details
      ) {
        expect(archivedSourceConflictJson.error.details.playbookId).toBe(playbookId2);
      } else {
        throw new Error('Invalid archived source conflict details.');
      }
    } else throw new Error('Invalid archived source conflict json output structure');

    // 27. The rejected registration leaves the archived Playbook unchanged.
    const showAfterArchivedSourceConflictRes = runCli(['playbook', 'show', '--id', playbookId2], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showAfterArchivedSourceConflictRes.status).toBe(0);
    expect(showAfterArchivedSourceConflictRes.stderr).toBe('');
    expect(showAfterArchivedSourceConflictRes.stdout).toContain('Segundo Playbook liberado');
    expect(showAfterArchivedSourceConflictRes.stdout).toContain('Status:            archived');
    expect(showAfterArchivedSourceConflictRes.stdout).toContain('Archived At:');
    expect(showAfterArchivedSourceConflictRes.stdout).toContain(playbookId2);
    assertSafeOutput(showAfterArchivedSourceConflictRes.stdout);

    // 28. Show first playbook source as JSON.
    const showSource1JsonRes = runCli(
      ['playbook', 'source', 'show', '--id', firstPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(showSource1JsonRes.status).toBe(0);
    expect(showSource1JsonRes.stderr).toBe('');
    assertSafeOutput(showSource1JsonRes.stdout);
    const showSource1Json: unknown = JSON.parse(showSource1JsonRes.stdout);
    if (
      showSource1Json !== null &&
      typeof showSource1Json === 'object' &&
      'success' in showSource1Json &&
      showSource1Json.success === true &&
      'data' in showSource1Json &&
      showSource1Json.data !== null &&
      typeof showSource1Json.data === 'object' &&
      'playbookSourceId' in showSource1Json.data &&
      typeof showSource1Json.data.playbookSourceId === 'string' &&
      'workspaceId' in showSource1Json.data &&
      'playbookId' in showSource1Json.data &&
      'type' in showSource1Json.data &&
      'status' in showSource1Json.data &&
      'externalRootReference' in showSource1Json.data &&
      'configurationReference' in showSource1Json.data &&
      'createdAt' in showSource1Json.data &&
      'lastSuccessfulSynchronizationRunId' in showSource1Json.data &&
      'lastSuccessfulSynchronizationAt' in showSource1Json.data &&
      'lastFailedSynchronizationRunId' in showSource1Json.data &&
      'lastFailedSynchronizationAt' in showSource1Json.data
    ) {
      expect(showSource1Json.data.playbookSourceId).toBe(firstPlaybookSourceId);
      expect(showSource1Json.data.workspaceId).toBe(workspaceId);
      expect(showSource1Json.data.playbookId).toBe(playbookId);
      expect(showSource1Json.data.type).toBe('notion');
      expect(showSource1Json.data.status).toBe('enabled');
      expect(showSource1Json.data.externalRootReference).toBe('notion-root-1');
      expect(showSource1Json.data.configurationReference).toBe('notion/main');
      expectIsoTimestamp(showSource1Json.data.createdAt);
      expect(showSource1Json.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(showSource1Json.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(showSource1Json.data.lastFailedSynchronizationRunId).toBeNull();
      expect(showSource1Json.data.lastFailedSynchronizationAt).toBeNull();
    } else throw new Error('Invalid source show json output structure');

    // 29. Show first playbook source as human.
    const showSource1HumanRes = runCli(
      ['playbook', 'source', 'show', '--id', firstPlaybookSourceId],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(showSource1HumanRes.status).toBe(0);
    expect(showSource1HumanRes.stderr).toBe('');
    expect(showSource1HumanRes.stdout).toContain('Playbook Source:');
    expect(showSource1HumanRes.stdout).toContain(firstPlaybookSourceId);
    expect(showSource1HumanRes.stdout).toContain(playbookId);
    expect(showSource1HumanRes.stdout).toContain('notion');
    expect(showSource1HumanRes.stdout).toContain('enabled');
    expect(showSource1HumanRes.stdout).toContain('notion-root-1');
    expect(showSource1HumanRes.stdout).toContain('notion/main');
    assertSafeOutput(showSource1HumanRes.stdout);

    // 30. Invalid identifier returns INVALID_INPUT.
    const invalidIdRes = runCli(
      ['playbook', 'source', 'show', '--id', 'not-a-uuid', '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(invalidIdRes.status).toBe(2);
    expect(invalidIdRes.stderr).toBe('');
    assertSafeOutput(invalidIdRes.stdout);
    const invalidIdJson: unknown = JSON.parse(invalidIdRes.stdout);
    if (
      invalidIdJson !== null &&
      typeof invalidIdJson === 'object' &&
      'success' in invalidIdJson &&
      'error' in invalidIdJson &&
      invalidIdJson.error !== null &&
      typeof invalidIdJson.error === 'object' &&
      'code' in invalidIdJson.error
    ) {
      expect(invalidIdJson.success).toBe(false);
      expect(invalidIdJson.error.code).toBe('INVALID_IDENTIFIER');
    } else throw new Error('Invalid source show invalid-id json output structure');

    // 31. Non-existent canonical UUID returns PLAYBOOK_SOURCE_NOT_FOUND.
    const nonExistentRes = runCli(
      [
        'playbook',
        'source',
        'show',
        '--id',
        '00000000-0000-0000-0000-000000000999',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(nonExistentRes.status).toBe(3);
    expect(nonExistentRes.stderr).toBe('');
    assertSafeOutput(nonExistentRes.stdout);
    const nonExistentJson: unknown = JSON.parse(nonExistentRes.stdout);
    if (
      nonExistentJson !== null &&
      typeof nonExistentJson === 'object' &&
      'success' in nonExistentJson &&
      'error' in nonExistentJson &&
      nonExistentJson.error !== null &&
      typeof nonExistentJson.error === 'object' &&
      'code' in nonExistentJson.error &&
      'details' in nonExistentJson.error &&
      nonExistentJson.error.details !== null &&
      typeof nonExistentJson.error.details === 'object' &&
      'playbookSourceId' in nonExistentJson.error.details
    ) {
      expect(nonExistentJson.success).toBe(false);
      expect(nonExistentJson.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
      expect(nonExistentJson.error.details.playbookSourceId).toBe(
        '00000000-0000-0000-0000-000000000999',
      );
    } else throw new Error('Invalid source show not-found json output structure');

    // 32. Show the second source (archived Playbook) — must still succeed.
    const showArchivedSourceRes = runCli(
      ['playbook', 'source', 'show', '--id', secondPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(showArchivedSourceRes.status).toBe(0);
    expect(showArchivedSourceRes.stderr).toBe('');
    assertSafeOutput(showArchivedSourceRes.stdout);
    const showArchivedSourceJson: unknown = JSON.parse(showArchivedSourceRes.stdout);
    if (
      showArchivedSourceJson !== null &&
      typeof showArchivedSourceJson === 'object' &&
      'success' in showArchivedSourceJson &&
      showArchivedSourceJson.success === true &&
      'data' in showArchivedSourceJson &&
      showArchivedSourceJson.data !== null &&
      typeof showArchivedSourceJson.data === 'object' &&
      'playbookSourceId' in showArchivedSourceJson.data &&
      typeof showArchivedSourceJson.data.playbookSourceId === 'string' &&
      'playbookId' in showArchivedSourceJson.data &&
      typeof showArchivedSourceJson.data.playbookId === 'string' &&
      'status' in showArchivedSourceJson.data &&
      typeof showArchivedSourceJson.data.status === 'string'
    ) {
      expect(showArchivedSourceJson.data.playbookSourceId).toBe(secondPlaybookSourceId);
      expect(showArchivedSourceJson.data.playbookId).toBe(playbookId2);
      expect(showArchivedSourceJson.data.status).toBe('enabled');
    } else throw new Error('Invalid archived source show json output structure');

    // 33. List first playbook sources as JSON.
    const listSource1Res = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listSource1Res.status).toBe(0);
    expect(listSource1Res.stderr).toBe('');
    assertSafeOutput(listSource1Res.stdout);
    const listSource1Json: unknown = JSON.parse(listSource1Res.stdout);
    if (
      listSource1Json !== null &&
      typeof listSource1Json === 'object' &&
      'success' in listSource1Json &&
      listSource1Json.success === true &&
      'data' in listSource1Json &&
      listSource1Json.data !== null &&
      typeof listSource1Json.data === 'object' &&
      'items' in listSource1Json.data &&
      Array.isArray(listSource1Json.data.items) &&
      'offset' in listSource1Json.data &&
      'limit' in listSource1Json.data &&
      'hasMore' in listSource1Json.data &&
      'totalCount' in listSource1Json.data
    ) {
      expect(listSource1Json.data.offset).toBe(0);
      expect(listSource1Json.data.limit).toBe(25);
      expect(listSource1Json.data.hasMore).toBe(false);
      expect(listSource1Json.data.totalCount).toBe(1);
      expect(listSource1Json.data.items).toHaveLength(1);
      const item = listSource1Json.data.items[0];
      if (
        item !== null &&
        typeof item === 'object' &&
        'playbookSourceId' in item &&
        'workspaceId' in item &&
        'playbookId' in item &&
        'type' in item &&
        'status' in item &&
        'externalRootReference' in item &&
        'configurationReference' in item &&
        'createdAt' in item &&
        'lastSuccessfulSynchronizationRunId' in item &&
        'lastSuccessfulSynchronizationAt' in item &&
        'lastFailedSynchronizationRunId' in item &&
        'lastFailedSynchronizationAt' in item
      ) {
        expect(item.playbookSourceId).toBe(firstPlaybookSourceId);
        expect(item.workspaceId).toBe(workspaceId);
        expect(item.playbookId).toBe(playbookId);
        expect(item.type).toBe('notion');
        expect(item.status).toBe('enabled');
        expect(item.externalRootReference).toBe('notion-root-1');
        expect(item.configurationReference).toBe('notion/main');
        expectIsoTimestamp(item.createdAt);
        expect(item.lastSuccessfulSynchronizationRunId).toBeNull();
        expect(item.lastSuccessfulSynchronizationAt).toBeNull();
        expect(item.lastFailedSynchronizationRunId).toBeNull();
        expect(item.lastFailedSynchronizationAt).toBeNull();
      } else throw new Error('Invalid item structure in source list JSON.');
    } else throw new Error('Invalid source list JSON structure.');

    // 34. List first playbook sources as human.
    const listSource1HumanRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listSource1HumanRes.status).toBe(0);
    expect(listSource1HumanRes.stderr).toBe('');
    expect(listSource1HumanRes.stdout).toContain('Playbook Sources:');
    expect(listSource1HumanRes.stdout).toContain(firstPlaybookSourceId);
    expect(listSource1HumanRes.stdout).toContain('enabled');
    expect(listSource1HumanRes.stdout).toContain('notion');
    expect(listSource1HumanRes.stdout).toContain('Page: 1-1 of 1');
    expect(listSource1HumanRes.stdout).not.toContain('notion-root-1');
    expect(listSource1HumanRes.stdout).not.toContain(workspaceId);
    assertSafeOutput(listSource1HumanRes.stdout);

    // 35. Pagination out of range.
    const emptyPageRes = runCli(
      [
        'playbook',
        'source',
        'list',
        '--playbook-id',
        playbookId,
        '--offset',
        '10',
        '--limit',
        '5',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(emptyPageRes.status).toBe(0);
    expect(emptyPageRes.stderr).toBe('');
    assertSafeOutput(emptyPageRes.stdout);
    const emptyPageJson: unknown = JSON.parse(emptyPageRes.stdout);
    if (
      emptyPageJson !== null &&
      typeof emptyPageJson === 'object' &&
      'success' in emptyPageJson &&
      emptyPageJson.success === true &&
      'data' in emptyPageJson &&
      emptyPageJson.data !== null &&
      typeof emptyPageJson.data === 'object' &&
      'items' in emptyPageJson.data &&
      Array.isArray(emptyPageJson.data.items) &&
      'offset' in emptyPageJson.data &&
      'limit' in emptyPageJson.data &&
      'hasMore' in emptyPageJson.data &&
      'totalCount' in emptyPageJson.data
    ) {
      expect(emptyPageJson.data.items).toHaveLength(0);
      expect(emptyPageJson.data.offset).toBe(10);
      expect(emptyPageJson.data.limit).toBe(5);
      expect(emptyPageJson.data.hasMore).toBe(false);
      expect(emptyPageJson.data.totalCount).toBe(1);
    } else throw new Error('Invalid empty page JSON structure.');

    // 36. List sources for archived playbook.
    const listArchivedRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId2, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listArchivedRes.status).toBe(0);
    expect(listArchivedRes.stderr).toBe('');
    assertSafeOutput(listArchivedRes.stdout);
    const listArchivedJson: unknown = JSON.parse(listArchivedRes.stdout);
    if (
      listArchivedJson !== null &&
      typeof listArchivedJson === 'object' &&
      'success' in listArchivedJson &&
      listArchivedJson.success === true &&
      'data' in listArchivedJson &&
      listArchivedJson.data !== null &&
      typeof listArchivedJson.data === 'object' &&
      'items' in listArchivedJson.data &&
      Array.isArray(listArchivedJson.data.items)
    ) {
      expect(listArchivedJson.data.items).toHaveLength(1);
      const archivedItem = listArchivedJson.data.items[0];
      if (
        archivedItem !== null &&
        typeof archivedItem === 'object' &&
        'playbookSourceId' in archivedItem &&
        'playbookId' in archivedItem &&
        'status' in archivedItem
      ) {
        expect(archivedItem.playbookSourceId).toBe(secondPlaybookSourceId);
        expect(archivedItem.playbookId).toBe(playbookId2);
        expect(archivedItem.status).toBe('enabled');
      } else throw new Error('Invalid archived source list item structure.');
    } else throw new Error('Invalid archived source list JSON structure.');

    // 37. Invalid identifier.
    const invalidListRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', 'not-a-uuid', '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(invalidListRes.status).toBe(2);
    expect(invalidListRes.stderr).toBe('');
    assertSafeOutput(invalidListRes.stdout);
    const invalidListJson: unknown = JSON.parse(invalidListRes.stdout);
    if (
      invalidListJson !== null &&
      typeof invalidListJson === 'object' &&
      'success' in invalidListJson &&
      'error' in invalidListJson &&
      invalidListJson.error !== null &&
      typeof invalidListJson.error === 'object' &&
      'code' in invalidListJson.error
    ) {
      expect(invalidListJson.success).toBe(false);
      expect(invalidListJson.error.code).toBe('INVALID_IDENTIFIER');
    } else throw new Error('Invalid list invalid-id JSON structure.');

    // 38. Non-existent playbook.
    const nonExistentListRes = runCli(
      [
        'playbook',
        'source',
        'list',
        '--playbook-id',
        '00000000-0000-0000-0000-000000000999',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(nonExistentListRes.status).toBe(3);
    expect(nonExistentListRes.stderr).toBe('');
    assertSafeOutput(nonExistentListRes.stdout);
    const nonExistentListJson: unknown = JSON.parse(nonExistentListRes.stdout);
    if (
      nonExistentListJson !== null &&
      typeof nonExistentListJson === 'object' &&
      'success' in nonExistentListJson &&
      'error' in nonExistentListJson &&
      nonExistentListJson.error !== null &&
      typeof nonExistentListJson.error === 'object' &&
      'code' in nonExistentListJson.error
    ) {
      expect(nonExistentListJson.success).toBe(false);
      expect(nonExistentListJson.error.code).toBe('PLAYBOOK_NOT_FOUND');
    } else throw new Error('Invalid list not-found JSON structure.');

    // 39. Disable the first playbook source.
    const disableSourceRes = runCli(
      ['playbook', 'source', 'disable', '--id', firstPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableSourceRes.status).toBe(0);
    expect(disableSourceRes.stderr).toBe('');
    assertSafeOutput(disableSourceRes.stdout);
    const disableSourceJson: unknown = JSON.parse(disableSourceRes.stdout);
    if (
      disableSourceJson !== null &&
      typeof disableSourceJson === 'object' &&
      'success' in disableSourceJson &&
      disableSourceJson.success === true &&
      'data' in disableSourceJson &&
      disableSourceJson.data !== null &&
      typeof disableSourceJson.data === 'object' &&
      'playbookSourceId' in disableSourceJson.data &&
      typeof disableSourceJson.data.playbookSourceId === 'string' &&
      'workspaceId' in disableSourceJson.data &&
      'playbookId' in disableSourceJson.data &&
      'type' in disableSourceJson.data &&
      'status' in disableSourceJson.data &&
      'externalRootReference' in disableSourceJson.data &&
      'configurationReference' in disableSourceJson.data &&
      'createdAt' in disableSourceJson.data &&
      'lastSuccessfulSynchronizationRunId' in disableSourceJson.data &&
      'lastSuccessfulSynchronizationAt' in disableSourceJson.data &&
      'lastFailedSynchronizationRunId' in disableSourceJson.data &&
      'lastFailedSynchronizationAt' in disableSourceJson.data
    ) {
      expect(disableSourceJson.data.playbookSourceId).toBe(firstPlaybookSourceId);
      expect(disableSourceJson.data.workspaceId).toBe(workspaceId);
      expect(disableSourceJson.data.playbookId).toBe(playbookId);
      expect(disableSourceJson.data.type).toBe('notion');
      expect(disableSourceJson.data.status).toBe('disabled');
      expect(disableSourceJson.data.externalRootReference).toBe('notion-root-1');
      expect(disableSourceJson.data.configurationReference).toBe('notion/main');
      expect(disableSourceJson.data.createdAt).toBe(firstPlaybookSourceCreatedAt);
      expect(disableSourceJson.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(disableSourceJson.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(disableSourceJson.data.lastFailedSynchronizationRunId).toBeNull();
      expect(disableSourceJson.data.lastFailedSynchronizationAt).toBeNull();
      expect('revision' in disableSourceJson.data).toBe(false);
      expect('token' in disableSourceJson.data).toBe(false);
      expect('credential' in disableSourceJson.data).toBe(false);
      expect('secret' in disableSourceJson.data).toBe(false);
    } else throw new Error('Invalid disable source json output structure');

    // 40. Show the source after disable — must show status disabled.
    const showDisabledSourceRes = runCli(
      ['playbook', 'source', 'show', '--id', firstPlaybookSourceId],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(showDisabledSourceRes.status).toBe(0);
    expect(showDisabledSourceRes.stderr).toBe('');
    expect(showDisabledSourceRes.stdout).toContain(firstPlaybookSourceId);
    expect(showDisabledSourceRes.stdout).toContain('Status:                   disabled');
    assertSafeOutput(showDisabledSourceRes.stdout);

    // 41. List after disable — the disabled source still appears.
    const listAfterDisableRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listAfterDisableRes.status).toBe(0);
    expect(listAfterDisableRes.stderr).toBe('');
    assertSafeOutput(listAfterDisableRes.stdout);
    const listAfterDisableJson: unknown = JSON.parse(listAfterDisableRes.stdout);
    if (
      listAfterDisableJson !== null &&
      typeof listAfterDisableJson === 'object' &&
      'success' in listAfterDisableJson &&
      listAfterDisableJson.success === true &&
      'data' in listAfterDisableJson &&
      listAfterDisableJson.data !== null &&
      typeof listAfterDisableJson.data === 'object' &&
      'items' in listAfterDisableJson.data &&
      Array.isArray(listAfterDisableJson.data.items)
    ) {
      const items = listAfterDisableJson.data.items;
      expect(items).toHaveLength(1);
      if (
        items[0] !== null &&
        typeof items[0] === 'object' &&
        'playbookSourceId' in items[0] &&
        'status' in items[0]
      ) {
        expect(items[0].playbookSourceId).toBe(firstPlaybookSourceId);
        expect(items[0].status).toBe('disabled');
      } else throw new Error('Invalid list-after-disable item structure.');
    } else throw new Error('Invalid list-after-disable JSON structure.');

    // 42. Re-disable returns transition error.
    const disableAgainRes = runCli(
      ['playbook', 'source', 'disable', '--id', firstPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableAgainRes.status).toBe(4);
    expect(disableAgainRes.stderr).toBe('');
    assertSafeOutput(disableAgainRes.stdout);
    const disableAgainJson: unknown = JSON.parse(disableAgainRes.stdout);
    if (
      disableAgainJson !== null &&
      typeof disableAgainJson === 'object' &&
      'success' in disableAgainJson &&
      'error' in disableAgainJson &&
      disableAgainJson.error !== null &&
      typeof disableAgainJson.error === 'object' &&
      'code' in disableAgainJson.error
    ) {
      expect(disableAgainJson.success).toBe(false);
      expect(disableAgainJson.error.code).toBe('PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED');
      if (
        'details' in disableAgainJson.error &&
        disableAgainJson.error.details !== null &&
        typeof disableAgainJson.error.details === 'object' &&
        'operation' in disableAgainJson.error.details &&
        'currentStatus' in disableAgainJson.error.details &&
        'expectedStatus' in disableAgainJson.error.details
      ) {
        expect(disableAgainJson.error.details.operation).toBe('disable');
        expect(disableAgainJson.error.details.currentStatus).toBe('disabled');
        expect(disableAgainJson.error.details.expectedStatus).toBe('enabled');
      } else throw new Error('Invalid disable again error details.');
    } else throw new Error('Invalid disable again json output structure');

    // 43. Show after re-disable failure — source still disabled.
    const showAfterDisableAgainRes = runCli(
      ['playbook', 'source', 'show', '--id', firstPlaybookSourceId],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(showAfterDisableAgainRes.status).toBe(0);
    expect(showAfterDisableAgainRes.stderr).toBe('');
    expect(showAfterDisableAgainRes.stdout).toContain('Status:                   disabled');
    assertSafeOutput(showAfterDisableAgainRes.stdout);

    // 44. Register a new enabled source for the same playbook (verifies index is freed).
    const newSourceAfterDisableRes = runCli(
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        playbookId,
        '--type',
        'notion',
        '--external-root-reference',
        'notion-root-new',
        '--configuration-reference',
        'notion/new',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(newSourceAfterDisableRes.status).toBe(0);
    expect(newSourceAfterDisableRes.stderr).toBe('');
    assertSafeOutput(newSourceAfterDisableRes.stdout);
    const newSourceJson: unknown = JSON.parse(newSourceAfterDisableRes.stdout);
    let newSourceId = '';
    if (
      newSourceJson !== null &&
      typeof newSourceJson === 'object' &&
      'success' in newSourceJson &&
      newSourceJson.success === true &&
      'data' in newSourceJson &&
      newSourceJson.data !== null &&
      typeof newSourceJson.data === 'object' &&
      'playbookSourceId' in newSourceJson.data &&
      typeof newSourceJson.data.playbookSourceId === 'string' &&
      'status' in newSourceJson.data &&
      'playbookId' in newSourceJson.data &&
      typeof newSourceJson.data.playbookId === 'string'
    ) {
      newSourceId = newSourceJson.data.playbookSourceId;
      expect(newSourceJson.data.status).toBe('enabled');
      expect(newSourceJson.data.playbookId).toBe(playbookId);
    } else throw new Error('Invalid new source after disable json output structure');

    // 45. List both sources — one disabled, one enabled.
    const listBothRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listBothRes.status).toBe(0);
    expect(listBothRes.stderr).toBe('');
    assertSafeOutput(listBothRes.stdout);
    const listBothJson: unknown = JSON.parse(listBothRes.stdout);
    if (
      listBothJson !== null &&
      typeof listBothJson === 'object' &&
      'success' in listBothJson &&
      listBothJson.success === true &&
      'data' in listBothJson &&
      listBothJson.data !== null &&
      typeof listBothJson.data === 'object' &&
      'items' in listBothJson.data &&
      Array.isArray(listBothJson.data.items)
    ) {
      expect(listBothJson.data.items).toHaveLength(2);
      const foundDisabled = listBothJson.data.items.some(
        (item: unknown) =>
          item !== null &&
          typeof item === 'object' &&
          'playbookSourceId' in item &&
          item.playbookSourceId === firstPlaybookSourceId &&
          'status' in item &&
          item.status === 'disabled',
      );
      const foundEnabled = listBothJson.data.items.some(
        (item: unknown) =>
          item !== null &&
          typeof item === 'object' &&
          'playbookSourceId' in item &&
          item.playbookSourceId === newSourceId &&
          'status' in item &&
          item.status === 'enabled',
      );
      expect(foundDisabled).toBe(true);
      expect(foundEnabled).toBe(true);
    } else throw new Error('Invalid list-both JSON structure.');

    // 46. Disable on a source whose playbook is archived must still succeed.
    const disableArchivedPlaybookSourceRes = runCli(
      ['playbook', 'source', 'disable', '--id', secondPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableArchivedPlaybookSourceRes.status).toBe(0);
    expect(disableArchivedPlaybookSourceRes.stderr).toBe('');
    assertSafeOutput(disableArchivedPlaybookSourceRes.stdout);
    const disableArchivedJson: unknown = JSON.parse(disableArchivedPlaybookSourceRes.stdout);
    if (
      disableArchivedJson !== null &&
      typeof disableArchivedJson === 'object' &&
      'success' in disableArchivedJson &&
      disableArchivedJson.success === true &&
      'data' in disableArchivedJson &&
      disableArchivedJson.data !== null &&
      typeof disableArchivedJson.data === 'object' &&
      'playbookSourceId' in disableArchivedJson.data &&
      'status' in disableArchivedJson.data
    ) {
      expect(disableArchivedJson.data.playbookSourceId).toBe(secondPlaybookSourceId);
      expect(disableArchivedJson.data.status).toBe('disabled');
    } else throw new Error('Invalid disable archived playbook source json output structure');

    // 47. Non-existent source returns PLAYBOOK_SOURCE_NOT_FOUND.
    const disableNonExistentRes = runCli(
      [
        'playbook',
        'source',
        'disable',
        '--id',
        '00000000-0000-0000-0000-000000000999',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableNonExistentRes.status).toBe(3);
    expect(disableNonExistentRes.stderr).toBe('');
    assertSafeOutput(disableNonExistentRes.stdout);
    const disableNonExistentJson: unknown = JSON.parse(disableNonExistentRes.stdout);
    if (
      disableNonExistentJson !== null &&
      typeof disableNonExistentJson === 'object' &&
      'success' in disableNonExistentJson &&
      'error' in disableNonExistentJson &&
      disableNonExistentJson.error !== null &&
      typeof disableNonExistentJson.error === 'object' &&
      'code' in disableNonExistentJson.error
    ) {
      expect(disableNonExistentJson.success).toBe(false);
      expect(disableNonExistentJson.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
    } else throw new Error('Invalid disable non-existent json output structure');

    // 48. Cross-workspace isolation: disable from the primary workspace does not affect a foreign source.
    const foreignWorkspaceId = '00000000-0000-0000-0000-000000000901';
    const foreignPlaybookId = '00000000-0000-0000-0000-000000000902';
    const foreignSourceId = '00000000-0000-0000-0000-000000000903';

    const foreignPool = new pg.Pool({ connectionString: testDbUrl });
    try {
      await foreignPool.query(
        `INSERT INTO workspaces (workspace_id, name, normalized_name, status, created_at, updated_at)
         VALUES ($1, 'Foreign', 'foreign', 'active', NOW(), NOW())`,
        [foreignWorkspaceId],
      );
      await foreignPool.query(
        `INSERT INTO playbooks (workspace_id, playbook_id, name, normalized_name, status, created_at, updated_at, revision)
         VALUES ($1, $2, 'Foreign Playbook', 'foreign-playbook', 'active', NOW(), NOW(), 1)`,
        [foreignWorkspaceId, foreignPlaybookId],
      );
      await foreignPool.query(
        `INSERT INTO playbook_sources (playbook_source_id, workspace_id, playbook_id, type, status, external_root_reference, configuration_reference, created_at, revision)
         VALUES ($1, $2, $3, 'notion', 'enabled', 'foreign-root', 'foreign-config', NOW(), 1)`,
        [foreignSourceId, foreignWorkspaceId, foreignPlaybookId],
      );
    } finally {
      await foreignPool.end();
    }

    const disableForeignRes = runCli(
      ['playbook', 'source', 'disable', '--id', foreignSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableForeignRes.status).toBe(3);
    expect(disableForeignRes.stderr).toBe('');
    assertSafeOutput(disableForeignRes.stdout);
    const disableForeignJson: unknown = JSON.parse(disableForeignRes.stdout);
    if (
      disableForeignJson !== null &&
      typeof disableForeignJson === 'object' &&
      'success' in disableForeignJson &&
      'error' in disableForeignJson &&
      disableForeignJson.error !== null &&
      typeof disableForeignJson.error === 'object' &&
      'code' in disableForeignJson.error
    ) {
      expect(disableForeignJson.success).toBe(false);
      expect(disableForeignJson.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
      expect(JSON.stringify(disableForeignJson.error)).not.toContain(foreignWorkspaceId);
      expect(JSON.stringify(disableForeignJson.error)).not.toContain(foreignPlaybookId);
      expect(JSON.stringify(disableForeignJson.error)).not.toContain('enabled');
      expect(JSON.stringify(disableForeignJson.error)).not.toContain('revision');
    } else throw new Error('Invalid disable foreign source json output structure');

    // 49. Verify foreign source remains unchanged.
    const verifyPool = new pg.Pool({ connectionString: testDbUrl });
    try {
      const verifyResult = await verifyPool.query<{
        workspace_id: string;
        playbook_id: string;
        status: string;
        revision: number;
      }>(
        'SELECT workspace_id, playbook_id, status, revision FROM playbook_sources WHERE playbook_source_id = $1',
        [foreignSourceId],
      );
      expect(verifyResult.rows).toHaveLength(1);
      if (verifyResult.rows[0] !== undefined) {
        expect(verifyResult.rows[0].workspace_id).toBe(foreignWorkspaceId);
        expect(verifyResult.rows[0].playbook_id).toBe(foreignPlaybookId);
        expect(verifyResult.rows[0].status).toBe('enabled');
        expect(verifyResult.rows[0].revision).toBe(1);
      }
    } finally {
      await verifyPool.end();
    }

    // 50. Disable the new source so we can test enable.
    const disableNewSourceRes = runCli(
      ['playbook', 'source', 'disable', '--id', newSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(disableNewSourceRes.status).toBe(0);
    expect(disableNewSourceRes.stderr).toBe('');
    assertSafeOutput(disableNewSourceRes.stdout);

    // 51. Enable the first historical source.
    const enableFirstSourceRes = runCli(
      ['playbook', 'source', 'enable', '--id', firstPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableFirstSourceRes.status).toBe(0);
    expect(enableFirstSourceRes.stderr).toBe('');
    assertSafeOutput(enableFirstSourceRes.stdout);
    const enableFirstJson: unknown = JSON.parse(enableFirstSourceRes.stdout);
    if (
      enableFirstJson !== null &&
      typeof enableFirstJson === 'object' &&
      'success' in enableFirstJson &&
      enableFirstJson.success === true &&
      'data' in enableFirstJson &&
      enableFirstJson.data !== null &&
      typeof enableFirstJson.data === 'object' &&
      'playbookSourceId' in enableFirstJson.data &&
      typeof enableFirstJson.data.playbookSourceId === 'string' &&
      'workspaceId' in enableFirstJson.data &&
      'playbookId' in enableFirstJson.data &&
      'type' in enableFirstJson.data &&
      'status' in enableFirstJson.data &&
      'externalRootReference' in enableFirstJson.data &&
      'configurationReference' in enableFirstJson.data &&
      'createdAt' in enableFirstJson.data &&
      'lastSuccessfulSynchronizationRunId' in enableFirstJson.data &&
      'lastSuccessfulSynchronizationAt' in enableFirstJson.data &&
      'lastFailedSynchronizationRunId' in enableFirstJson.data &&
      'lastFailedSynchronizationAt' in enableFirstJson.data
    ) {
      expect(enableFirstJson.data.playbookSourceId).toBe(firstPlaybookSourceId);
      expect(enableFirstJson.data.workspaceId).toBe(workspaceId);
      expect(enableFirstJson.data.playbookId).toBe(playbookId);
      expect(enableFirstJson.data.type).toBe('notion');
      expect(enableFirstJson.data.status).toBe('enabled');
      expect(enableFirstJson.data.externalRootReference).toBe('notion-root-1');
      expect(enableFirstJson.data.configurationReference).toBe('notion/main');
      expect(enableFirstJson.data.createdAt).toBe(firstPlaybookSourceCreatedAt);
      expect(enableFirstJson.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(enableFirstJson.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(enableFirstJson.data.lastFailedSynchronizationRunId).toBeNull();
      expect(enableFirstJson.data.lastFailedSynchronizationAt).toBeNull();
      expect('revision' in enableFirstJson.data).toBe(false);
      expect('token' in enableFirstJson.data).toBe(false);
      expect('credential' in enableFirstJson.data).toBe(false);
      expect('secret' in enableFirstJson.data).toBe(false);
    } else throw new Error('Invalid enable first source json output structure');

    // 52. Show after enable.
    const showEnabledRes = runCli(['playbook', 'source', 'show', '--id', firstPlaybookSourceId], {
      AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId,
    });
    expect(showEnabledRes.status).toBe(0);
    expect(showEnabledRes.stderr).toBe('');
    expect(showEnabledRes.stdout).toContain('Status:                   enabled');
    assertSafeOutput(showEnabledRes.stdout);

    // 53. List after enable — one enabled, one disabled.
    const listAfterEnableRes = runCli(
      ['playbook', 'source', 'list', '--playbook-id', playbookId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(listAfterEnableRes.status).toBe(0);
    expect(listAfterEnableRes.stderr).toBe('');
    assertSafeOutput(listAfterEnableRes.stdout);
    const listAfterEnableJson: unknown = JSON.parse(listAfterEnableRes.stdout);
    if (
      listAfterEnableJson !== null &&
      typeof listAfterEnableJson === 'object' &&
      'success' in listAfterEnableJson &&
      listAfterEnableJson.success === true &&
      'data' in listAfterEnableJson &&
      listAfterEnableJson.data !== null &&
      typeof listAfterEnableJson.data === 'object' &&
      'items' in listAfterEnableJson.data &&
      Array.isArray(listAfterEnableJson.data.items)
    ) {
      expect(listAfterEnableJson.data.items).toHaveLength(2);
      const foundEnabled = listAfterEnableJson.data.items.some(
        (item: unknown) =>
          item !== null &&
          typeof item === 'object' &&
          'playbookSourceId' in item &&
          item.playbookSourceId === firstPlaybookSourceId &&
          'status' in item &&
          item.status === 'enabled',
      );
      const foundDisabled = listAfterEnableJson.data.items.some(
        (item: unknown) =>
          item !== null &&
          typeof item === 'object' &&
          'playbookSourceId' in item &&
          item.playbookSourceId === newSourceId &&
          'status' in item &&
          item.status === 'disabled',
      );
      expect(foundEnabled).toBe(true);
      expect(foundDisabled).toBe(true);
    } else throw new Error('Invalid list-after-enable JSON structure.');

    // 54. Re-enable returns transition error.
    const enableAgainRes = runCli(
      ['playbook', 'source', 'enable', '--id', firstPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableAgainRes.status).toBe(4);
    expect(enableAgainRes.stderr).toBe('');
    assertSafeOutput(enableAgainRes.stdout);
    const enableAgainJson: unknown = JSON.parse(enableAgainRes.stdout);
    if (
      enableAgainJson !== null &&
      typeof enableAgainJson === 'object' &&
      'success' in enableAgainJson &&
      'error' in enableAgainJson &&
      enableAgainJson.error !== null &&
      typeof enableAgainJson.error === 'object' &&
      'code' in enableAgainJson.error &&
      'details' in enableAgainJson.error &&
      enableAgainJson.error.details !== null &&
      typeof enableAgainJson.error.details === 'object' &&
      'operation' in enableAgainJson.error.details &&
      'currentStatus' in enableAgainJson.error.details &&
      'expectedStatus' in enableAgainJson.error.details
    ) {
      expect(enableAgainJson.success).toBe(false);
      expect(enableAgainJson.error.code).toBe('PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED');
      expect(enableAgainJson.error.details.operation).toBe('enable');
      expect(enableAgainJson.error.details.currentStatus).toBe('enabled');
      expect(enableAgainJson.error.details.expectedStatus).toBe('disabled');
    } else throw new Error('Invalid enable again json output structure');

    // 55. Conflict: try to enable the disabled source while the first is already enabled.
    const enableConflictRes = runCli(
      ['playbook', 'source', 'enable', '--id', newSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableConflictRes.status).toBe(4);
    expect(enableConflictRes.stderr).toBe('');
    assertSafeOutput(enableConflictRes.stdout);
    const enableConflictJson: unknown = JSON.parse(enableConflictRes.stdout);
    if (
      enableConflictJson !== null &&
      typeof enableConflictJson === 'object' &&
      'success' in enableConflictJson &&
      'error' in enableConflictJson &&
      enableConflictJson.error !== null &&
      typeof enableConflictJson.error === 'object' &&
      'code' in enableConflictJson.error
    ) {
      expect(enableConflictJson.success).toBe(false);
      expect(enableConflictJson.error.code).toBe('ENABLED_PLAYBOOK_SOURCE_CONFLICT');
    } else throw new Error('Invalid enable conflict json output structure');

    // 56. Playbook archived prevents enable.
    const enableArchivedRes = runCli(
      ['playbook', 'source', 'enable', '--id', secondPlaybookSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableArchivedRes.status).toBe(4);
    expect(enableArchivedRes.stderr).toBe('');
    assertSafeOutput(enableArchivedRes.stdout);
    const enableArchivedJson: unknown = JSON.parse(enableArchivedRes.stdout);
    if (
      enableArchivedJson !== null &&
      typeof enableArchivedJson === 'object' &&
      'success' in enableArchivedJson &&
      'error' in enableArchivedJson &&
      enableArchivedJson.error !== null &&
      typeof enableArchivedJson.error === 'object' &&
      'code' in enableArchivedJson.error
    ) {
      expect(enableArchivedJson.success).toBe(false);
      expect(enableArchivedJson.error.code).toBe('PLAYBOOK_ARCHIVED');
    } else throw new Error('Invalid enable archived json output structure');

    // 57. Non-existent source returns PLAYBOOK_SOURCE_NOT_FOUND.
    const enableNonExistentRes = runCli(
      [
        'playbook',
        'source',
        'enable',
        '--id',
        '00000000-0000-0000-0000-000000000999',
        '--output',
        'json',
      ],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableNonExistentRes.status).toBe(3);
    expect(enableNonExistentRes.stderr).toBe('');
    assertSafeOutput(enableNonExistentRes.stdout);
    const enableNonExistentJson: unknown = JSON.parse(enableNonExistentRes.stdout);
    if (
      enableNonExistentJson !== null &&
      typeof enableNonExistentJson === 'object' &&
      'success' in enableNonExistentJson &&
      'error' in enableNonExistentJson &&
      enableNonExistentJson.error !== null &&
      typeof enableNonExistentJson.error === 'object' &&
      'code' in enableNonExistentJson.error
    ) {
      expect(enableNonExistentJson.success).toBe(false);
      expect(enableNonExistentJson.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
    } else throw new Error('Invalid enable non-existent json output structure');

    // 58. Enable from primary workspace on foreign source returns not found.
    const enableForeignRes = runCli(
      ['playbook', 'source', 'enable', '--id', foreignSourceId, '--output', 'json'],
      { AI_PLAYBOOK_ENGINE_WORKSPACE_ID: workspaceId },
    );
    expect(enableForeignRes.status).toBe(3);
    expect(enableForeignRes.stderr).toBe('');
    assertSafeOutput(enableForeignRes.stdout);
    const enableForeignJson: unknown = JSON.parse(enableForeignRes.stdout);
    if (
      enableForeignJson !== null &&
      typeof enableForeignJson === 'object' &&
      'success' in enableForeignJson &&
      'error' in enableForeignJson &&
      enableForeignJson.error !== null &&
      typeof enableForeignJson.error === 'object' &&
      'code' in enableForeignJson.error
    ) {
      expect(enableForeignJson.success).toBe(false);
      expect(enableForeignJson.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
    } else throw new Error('Invalid enable foreign source json output structure');
  });
});
