import { describe, expect, it } from 'vitest';
import { parseStrictInteger, runCli } from './run-cli.js';
import { MapEnvReader } from '@ai-playbook-engine/config';
import type { RawConfig } from '@ai-playbook-engine/config';
import { ExitCode } from './exit-codes.js';
import { ok, err } from '@ai-playbook-engine/shared';
import type { CliServices, RunCliDependencies } from './run-cli.js';
import type { WorkspaceOutput, PlaybookOutput, Page } from '@ai-playbook-engine/application';
import {
  workspaceAlreadyInitialized,
  persistenceOperationFailed,
} from '@ai-playbook-engine/application';
import { migrationFailed } from '@ai-playbook-engine/infrastructure';
import type { BuildServicesError } from './composition-root.js';

class MockPool {
  closeCalled = 0;
  async close() {
    this.closeCalled++;
  }
}

interface MockServicesOverrides {
  readonly pool?: MockPool;
  readonly migrate?: CliServices['migrate'];
  readonly initializeWorkspace?: CliServices['initializeWorkspace'];
  readonly getCurrentWorkspace?: CliServices['getCurrentWorkspace'];
  readonly createPlaybook?: CliServices['createPlaybook'];
  readonly getPlaybook?: CliServices['getPlaybook'];
  readonly listPlaybooks?: CliServices['listPlaybooks'];
}

function createWorkspaceOutputFixture(overrides: Partial<WorkspaceOutput> = {}): WorkspaceOutput {
  return {
    workspaceId: '00000000-0000-0000-0000-000000000001',
    name: 'Workspace Name',
    normalizedName: 'workspace-name',
    status: 'active',
    description: '(none)',
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function createPlaybookOutputFixture(overrides: Partial<PlaybookOutput> = {}): PlaybookOutput {
  return {
    playbookId: '00000000-0000-0000-0000-000000000002',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    name: 'Playbook Name',
    normalizedName: 'playbook-name',
    status: 'active',
    description: '(none)',
    activeVersionId: null,
    createdAt: '2026-07-12T10:00:00.000Z',
    updatedAt: '2026-07-12T10:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function createPlaybookPageFixture(
  overrides: Partial<Page<PlaybookOutput>> = {},
): Page<PlaybookOutput> {
  return {
    items: [],
    offset: 0,
    limit: 25,
    hasMore: false,
    totalCount: 0,
    ...overrides,
  };
}

function createMockServices(overrides: MockServicesOverrides = {}): CliServices {
  const pool = overrides.pool ?? new MockPool();
  return {
    pool,
    migrate: overrides.migrate ?? (async () => ok({ appliedVersions: [1] })),
    initializeWorkspace: overrides.initializeWorkspace ?? {
      handle: async () => ok(createWorkspaceOutputFixture()),
    },
    getCurrentWorkspace: overrides.getCurrentWorkspace ?? {
      handle: async () => ok(createWorkspaceOutputFixture()),
    },
    createPlaybook: overrides.createPlaybook ?? {
      handle: async () => ok(createPlaybookOutputFixture()),
    },
    getPlaybook: overrides.getPlaybook ?? {
      handle: async () => ok(createPlaybookOutputFixture()),
    },
    listPlaybooks: overrides.listPlaybooks ?? {
      handle: async () => ok(createPlaybookPageFixture()),
    },
  };
}

function createMockDependencies(
  services: CliServices,
): RunCliDependencies & { getBuildCalled(): number } {
  let buildCalled = 0;
  const buildServices = (_config: RawConfig) => {
    buildCalled++;
    return ok(services);
  };
  return {
    buildServices,
    getBuildCalled() {
      return buildCalled;
    },
  };
}

function createFailingMockDependencies(
  error: BuildServicesError['error'],
): RunCliDependencies & { getBuildCalled(): number } {
  let buildCalled = 0;
  const buildServices = (_config: RawConfig) => {
    buildCalled++;
    const failure: BuildServicesError = {
      kind: 'config',
      error,
    };
    return err(failure);
  };
  return {
    buildServices,
    getBuildCalled() {
      return buildCalled;
    },
  };
}

class MockIo {
  stdout = '';
  stderr = '';
  writeStdout(v: string) {
    this.stdout += v;
  }
  writeStderr(v: string) {
    this.stderr += v;
  }
}

class ThrowingIo {
  stdout = '';
  stderr = '';
  throwOnStdout = true;

  writeStdout(v: string) {
    if (this.throwOnStdout) {
      this.throwOnStdout = false;
      throw new Error('Controlled rendering error');
    }
    this.stdout += v;
  }

  writeStderr(v: string) {
    this.stderr += v;
  }
}

describe('parseStrictInteger', () => {
  it('accepts correct decimal integers', () => {
    expect(parseStrictInteger('0')).toBe(0);
    expect(parseStrictInteger('1')).toBe(1);
    expect(parseStrictInteger('42')).toBe(42);
    expect(parseStrictInteger('1234567890')).toBe(1234567890);
  });

  it('rejects invalid inputs', () => {
    expect(parseStrictInteger('10abc')).toBeNull();
    expect(parseStrictInteger('1.5')).toBeNull();
    expect(parseStrictInteger('1e2')).toBeNull();
    expect(parseStrictInteger('NaN')).toBeNull();
    expect(parseStrictInteger('Infinity')).toBeNull();
    expect(parseStrictInteger('+1')).toBeNull();
    expect(parseStrictInteger('-0')).toBeNull();
    expect(parseStrictInteger('')).toBeNull();
    expect(parseStrictInteger('1 0')).toBeNull();
    expect(parseStrictInteger(' 10')).toBeNull();
    expect(parseStrictInteger('10 ')).toBeNull();
  });
});

describe('runCli commands and parsing stubs', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );

  it('rejects unknown command', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['unknown-subcommand'], envReader, io, deps);
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects unknown flag', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['playbook', 'list', '--unknown-flag', 'value'], envReader, io, deps);
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects duplicate flag', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'list', '--limit', '10', '--limit', '20'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects flag without value when value is required', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['playbook', 'list', '--limit'], envReader, io, deps);
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid output option', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['playbook', 'list', '--output', 'xml'], envReader, io, deps);
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid workspace override', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'list', '--workspace-id', 'invalid-uuid'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.CONFIG_ERROR);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid status', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'list', '--status', 'invalid-status'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid boolean flag has-active-version', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'list', '--has-active-version', 'maybe'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid offset values', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code1 = await runCli(['playbook', 'list', '--offset', '-5'], envReader, io, deps);
    expect(code1).toBe(ExitCode.INVALID_INPUT);

    const code2 = await runCli(['playbook', 'list', '--offset', '10abc'], envReader, io, deps);
    expect(code2).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects invalid limit values', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code1 = await runCli(['playbook', 'list', '--limit', '0'], envReader, io, deps);
    expect(code1).toBe(ExitCode.INVALID_INPUT);

    const code2 = await runCli(['playbook', 'list', '--limit', '101'], envReader, io, deps);
    expect(code2).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('runs help when requested', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['--help'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('Usage:');
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('runs help on empty command', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli([], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('Usage:');
    expect(deps.getBuildCalled()).toBe(0);
  });
});

describe('runCli output formatting precedence', () => {
  it('respects environment variable JSON', async () => {
    const envReader = new MapEnvReader(
      new Map([
        ['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db'],
        ['AI_PLAYBOOK_ENGINE_CLI_OUTPUT', 'json'],
      ]),
    );
    const io = new MockIo();
    const services = createMockServices();
    const deps = createMockDependencies(services);
    const code = await runCli(['workspace', 'show'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('"success"');
  });

  it('respects override CLI human over environment JSON', async () => {
    const envReader = new MapEnvReader(
      new Map([
        ['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db'],
        ['AI_PLAYBOOK_ENGINE_CLI_OUTPUT', 'json'],
      ]),
    );
    const io = new MockIo();
    const services = createMockServices();
    const deps = createMockDependencies(services);
    const code = await runCli(['workspace', 'show', '--output', 'human'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).not.toContain('"success"');
    expect(io.stdout).toContain('Workspace:');
  });

  it('respects override CLI JSON over environment human', async () => {
    const envReader = new MapEnvReader(
      new Map([
        ['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db'],
        ['AI_PLAYBOOK_ENGINE_CLI_OUTPUT', 'human'],
      ]),
    );
    const io = new MockIo();
    const services = createMockServices();
    const deps = createMockDependencies(services);
    const code = await runCli(['workspace', 'show', '--output', 'json'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('"success"');
  });

  it('shows configuration error before composition', async () => {
    const envReader = new MapEnvReader(
      new Map([
        ['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db'],
        ['AI_PLAYBOOK_ENGINE_CLI_OUTPUT', 'invalid-output-format'],
      ]),
    );
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['workspace', 'show'], envReader, io, deps);
    expect(code).toBe(ExitCode.CONFIG_ERROR);
    expect(deps.getBuildCalled()).toBe(0);
  });
});

describe('runCli pool closure verification', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );

  it('closes pool on success path', async () => {
    const pool = new MockPool();
    const services = createMockServices({ pool });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(['database', 'migrate'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes pool on use case expected error', async () => {
    const pool = new MockPool();
    const initializeWorkspace: CliServices['initializeWorkspace'] = {
      handle: async () => err(workspaceAlreadyInitialized()),
    };
    const services = createMockServices({ pool, initializeWorkspace });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(['workspace', 'initialize', '--name', 'WS'], envReader, io, deps);
    expect(code).toBe(ExitCode.CONFLICT);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes pool on persistence operation error', async () => {
    const pool = new MockPool();
    const createPlaybook: CliServices['createPlaybook'] = {
      handle: async () => err(persistenceOperationFailed('playbook.insert')),
    };
    const services = createMockServices({ pool, createPlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(['playbook', 'create', '--name', 'PB'], envReader, io, deps);
    expect(code).toBe(ExitCode.INFRASTRUCTURE_ERROR);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes pool on migration error', async () => {
    const pool = new MockPool();
    const services = createMockServices({
      pool,
      migrate: async () => err(migrationFailed()),
    });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(['database', 'migrate'], envReader, io, deps);
    expect(code).toBe(ExitCode.INFRASTRUCTURE_ERROR);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes pool on unexpected exception within handler', async () => {
    const pool = new MockPool();
    const getPlaybook: CliServices['getPlaybook'] = {
      handle: async () => {
        throw new Error('DB exploded internally');
      },
    };
    const services = createMockServices({ pool, getPlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(['playbook', 'show', '--id', 'pb-123'], envReader, io, deps);
    expect(code).toBe(1);
    expect(pool.closeCalled).toBe(1);
    expect(io.stderr).toContain('An unexpected error occurred.');
    expect(io.stderr).not.toContain('DB exploded internally');
  });

  it('closes pool on exception during rendering/writing output', async () => {
    const pool = new MockPool();
    const services = createMockServices({ pool });
    const deps = createMockDependencies(services);
    const io = new ThrowingIo();

    const code = await runCli(['workspace', 'show', '--output', 'json'], envReader, io, deps);
    expect(code).toBe(1);
    expect(pool.closeCalled).toBe(1);
    expect(io.stdout).toContain('An unexpected error occurred.');
    expect(io.stdout).not.toContain('Controlled rendering error');
  });
});

describe('runCli unexpected exception and pool non-creation', () => {
  it('does not invoke the builder when configuration DB URL is invalid', async () => {
    const envReader = new MapEnvReader(
      new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'not-a-valid-url']]),
    );
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());

    const code = await runCli(['database', 'migrate'], envReader, io, deps);
    expect(code).toBe(ExitCode.CONFIG_ERROR);
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('invokes the builder but returns CONFIG_ERROR and does not create a pool when database URL is missing', async () => {
    const envReader = new MapEnvReader(new Map());
    const io = new MockIo();
    const deps = createFailingMockDependencies(
      Object.freeze({
        code: 'CONFIGURATION_MISSING',
        message: 'DB URL is missing',
        details: Object.freeze({}),
      }),
    );

    const code = await runCli(['database', 'migrate'], envReader, io, deps);
    expect(code).toBe(ExitCode.CONFIG_ERROR);
    expect(deps.getBuildCalled()).toBe(1);
  });
});
