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
  });
});
