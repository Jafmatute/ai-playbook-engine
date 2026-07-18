import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const testDbUrl = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'dist', 'main.js');

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
    expect(playbookId2).not.toBe('');

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
      expect(archiveJson.data.name).toBe('Playbook renombrado');
      expect(archiveJson.data.status).toBe('archived');
      expect(typeof archiveJson.data.archivedAt).toBe('string');
      expect(archiveJson.data.archivedAt).not.toBe('');
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
      expect(typeof restoreJson.data.updatedAt).toBe('string');
      expect(restoreJson.data.updatedAt).not.toBe('');
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
      expect(registerSourceJson.data.playbookSourceId).not.toBe('');
      expect(registerSourceJson.data.workspaceId).toBe(workspaceId);
      expect(registerSourceJson.data.playbookId).toBe(playbookId);
      expect(registerSourceJson.data.type).toBe('notion');
      expect(registerSourceJson.data.status).toBe('enabled');
      expect(registerSourceJson.data.externalRootReference).toBe('notion-root-1');
      expect(registerSourceJson.data.configurationReference).toBe('notion/main');
      expect(typeof registerSourceJson.data.createdAt).toBe('string');
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
    assertSafeOutput(showAfterArchivedSourceConflictRes.stdout);
  });
});
