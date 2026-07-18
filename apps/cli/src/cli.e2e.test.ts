import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DATABASE_URL = process.env.AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'dist', 'main.js');

function runCli(
  args: string[],
  env?: Record<string, string>,
): { stdout: string; stderr: string; status: number } {
  try {
    const output = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
      env: {
        ...process.env,
        AI_PLAYBOOK_ENGINE_DATABASE_URL: TEST_DATABASE_URL!,
        AI_PLAYBOOK_ENGINE_CLI_OUTPUT: 'human',
        ...env,
      },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout: output, stderr: '', status: 0 };
  } catch (e: unknown) {
    const error = e as { stdout: string; stderr: string; status: number };
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      status: error.status ?? 1,
    };
  }
}

describe.runIf(TEST_DATABASE_URL)('CLI E2E', () => {
  it('database migrate', () => {
    const { status } = runCli(['database', 'migrate']);
    expect(status).toBe(0);
  });

  it('full workflow: initialize, show, create, list, show', () => {
    const migrateResult = runCli(['database', 'migrate']);
    expect(migrateResult.status).toBe(0);

    const initResult = runCli(['workspace', 'initialize', '--name', 'E2E Test Workspace']);
    expect(initResult.status).toBe(0);
    expect(initResult.stdout).toContain('E2E Test Workspace');

    const showResult = runCli(['workspace', 'show']);
    expect(showResult.status).toBe(0);
    expect(showResult.stdout).toContain('E2E Test Workspace');

    const createResult = runCli(['playbook', 'create', '--name', 'E2E Test Playbook']);
    expect(createResult.status).toBe(0);
    expect(createResult.stdout).toContain('E2E Test Playbook');

    const listResult = runCli(['playbook', 'list']);
    expect(listResult.status).toBe(0);
    expect(listResult.stdout).toContain('E2E Test Playbook');

    const showPbResult = runCli([
      'playbook',
      'show',
      '--id',
      extractPlaybookId(createResult.stdout),
    ]);
    expect(showPbResult.status).toBe(0);
    expect(showPbResult.stdout).toContain('E2E Test Playbook');
  });

  it('supports --output json', () => {
    runCli(['database', 'migrate']);

    const initResult = runCli([
      'workspace',
      'initialize',
      '--name',
      'JSON Test Workspace',
      '--output',
      'json',
    ]);
    expect(initResult.status).toBe(0);
    const parsed = JSON.parse(initResult.stdout);
    expect(parsed).toHaveProperty('success');
    expect(parsed).toHaveProperty('data');

    const listResult = runCli(['playbook', 'list', '--output', 'json']);
    expect(listResult.status).toBe(0);
    const listParsed = JSON.parse(listResult.stdout);
    expect(listParsed).toHaveProperty('success');
  });
});

function extractPlaybookId(stdout: string): string {
  const match = stdout.match(/ID:\s+(\S+)/);
  if (match !== null && match[1] !== undefined) {
    return match[1];
  }
  throw new Error('Could not extract playbook ID from output.');
}
