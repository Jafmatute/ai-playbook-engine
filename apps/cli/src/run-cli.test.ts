import { describe, expect, it } from 'vitest';
import { parseStrictInteger, runCli } from './run-cli.js';
import { MapEnvReader } from '@ai-playbook-engine/config';
import type { RawConfig } from '@ai-playbook-engine/config';
import { ExitCode } from './exit-codes.js';
import { ok, err } from '@ai-playbook-engine/shared';
import type { CliServices, RunCliDependencies } from './run-cli.js';
import type {
  WorkspaceOutput,
  PlaybookOutput,
  PlaybookSourceOutput,
  Page,
} from '@ai-playbook-engine/application';
import {
  enabledPlaybookSourceConflict,
  playbookArchived,
  workspaceAlreadyInitialized,
  persistenceOperationFailed,
  playbookNotFound,
  playbookNameConflict,
  playbookSourceTypeUnsupported,
  persistenceRevisionConflict,
  PersistenceRevision,
} from '@ai-playbook-engine/application';
import type {
  PlaybookAlreadyArchivedError,
  PlaybookNotArchivedError,
  PlaybookOperationNotAllowedError,
  PlaybookStateInvalidError,
} from '@ai-playbook-engine/core';
import { parsePlaybookId } from '@ai-playbook-engine/core';
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
  readonly renamePlaybook?: CliServices['renamePlaybook'];
  readonly archivePlaybook?: CliServices['archivePlaybook'];
  readonly restorePlaybook?: CliServices['restorePlaybook'];
  readonly registerPlaybookSource?: CliServices['registerPlaybookSource'];
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

function createPlaybookSourceOutputFixture(
  overrides: Partial<PlaybookSourceOutput> = {},
): PlaybookSourceOutput {
  return {
    playbookSourceId: '00000000-0000-0000-0000-000000000003',
    workspaceId: '00000000-0000-0000-0000-000000000001',
    playbookId: '00000000-0000-0000-0000-000000000002',
    type: 'notion',
    status: 'enabled',
    externalRootReference: 'notion-root',
    configurationReference: 'notion/main',
    createdAt: '2026-07-12T10:00:00.000Z',
    lastSuccessfulSynchronizationRunId: null,
    lastSuccessfulSynchronizationAt: null,
    lastFailedSynchronizationRunId: null,
    lastFailedSynchronizationAt: null,
    ...overrides,
  };
}

function createPersistenceRevision(value: number): PersistenceRevision {
  const result = PersistenceRevision.from(value);

  if (!result.success) {
    throw new Error('Expected a valid persistence revision fixture.');
  }

  return result.value;
}

function createPlaybookId(value: string) {
  const result = parsePlaybookId(value);

  if (!result.success) {
    throw new Error('Expected a valid playbook ID fixture.');
  }

  return result.value;
}

function createRenameNotAllowedError(): PlaybookOperationNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_OPERATION_NOT_ALLOWED',
    message: 'Playbook operation is not allowed.',
    details: Object.freeze({
      currentStatus: 'archived',
      operation: 'rename',
    }),
  });
}

function createPlaybookAlreadyArchivedError(): PlaybookAlreadyArchivedError {
  return Object.freeze({
    code: 'PLAYBOOK_ALREADY_ARCHIVED',
    message: 'The playbook is already archived.',
    details: Object.freeze({ currentStatus: 'archived' }),
  });
}

function createPlaybookNotArchivedError(): PlaybookNotArchivedError {
  return Object.freeze({
    code: 'PLAYBOOK_NOT_ARCHIVED',
    message: 'The playbook is not archived.',
    details: Object.freeze({
      currentStatus: 'active',
    }),
  });
}

function createPlaybookStateInvalidError(): PlaybookStateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_STATE_INVALID',
    message: 'The playbook state is inconsistent.',
    details: Object.freeze({ reason: 'TIMESTAMP_BEFORE_UPDATED_AT' }),
  });
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
    renamePlaybook: overrides.renamePlaybook ?? {
      handle: async () => ok(createPlaybookOutputFixture()),
    },
    archivePlaybook: overrides.archivePlaybook ?? {
      handle: async () => ok(createPlaybookOutputFixture({ status: 'archived' })),
    },
    restorePlaybook: overrides.restorePlaybook ?? {
      handle: async () => ok(createPlaybookOutputFixture()),
    },
    registerPlaybookSource: overrides.registerPlaybookSource ?? {
      handle: async () => ok(createPlaybookSourceOutputFixture()),
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

describe('runCli playbook rename command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );

  // 1. Comando reconocido
  // 2. Ayuda incluye playbook rename
  it('includes playbook rename command in printHelp and matches command', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['--help'], envReader, io, deps);
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain(
      'playbook rename        --id <uuid> --name <value>  Rename a playbook',
    );
  });

  // 3. --id ausente
  it('returns invalid input error when --id is missing', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['playbook', 'rename', '--name', 'New Name'], envReader, io, deps);
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(io.stderr).toContain('--id is required');
    // 7. No se construyen servicios cuando falta entrada
    expect(deps.getBuildCalled()).toBe(0);
  });

  // 4. --name ausente
  it('returns invalid input error when --name is missing', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(io.stderr).toContain('--name is required');
    expect(deps.getBuildCalled()).toBe(0);
  });

  // 5. Flag sin valor
  it('rejects flag without value', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      ['playbook', 'rename', '--id', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(io.stderr).toContain('Flag "id" requires a value');
    expect(deps.getBuildCalled()).toBe(0);
  });

  // 6. Flag desconocido
  it('rejects unknown flag', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(
      [
        'playbook',
        'rename',
        '--id',
        '00000000-0000-0000-0000-000000000002',
        '--name',
        'New Name',
        '--extra',
      ],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(io.stderr).toContain('Unknown flag: --extra');
    expect(deps.getBuildCalled()).toBe(0);
  });

  // 8. Se envía el command exacto: playbookId, newName
  it('invokes handler with exact command properties', async () => {
    const pool = new MockPool();
    const renamePlaybook = {
      handle: async (cmd: { playbookId: string; newName: string }) => {
        expect(cmd.playbookId).toBe('00000000-0000-0000-0000-000000000002');
        expect(cmd.newName).toBe('New Name');
        return ok(createPlaybookOutputFixture({ name: cmd.newName }));
      },
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.SUCCESS);
    // 19. El pool se cierra en éxito
    expect(pool.closeCalled).toBe(1);
  });

  // 9. Éxito human
  it('writes human success output to stdout', async () => {
    const pool = new MockPool();
    const services = createMockServices({ pool });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      [
        'playbook',
        'rename',
        '--id',
        '00000000-0000-0000-0000-000000000002',
        '--name',
        'New Name',
        '--output',
        'human',
      ],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('Playbook:');
    expect(io.stdout).toContain('Playbook Name');
    expect(io.stderr).toBe('');
  });

  // 10. Éxito JSON
  it('writes json success output to stdout', async () => {
    const pool = new MockPool();
    const services = createMockServices({ pool });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      [
        'playbook',
        'rename',
        '--id',
        '00000000-0000-0000-0000-000000000002',
        '--name',
        'New Name',
        '--output',
        'json',
      ],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('"success": true');
    // 17. JSON escribe exclusivamente en stdout
    expect(io.stderr).toBe('');
  });

  // 11. PLAYBOOK_NOT_FOUND
  it('maps PLAYBOOK_NOT_FOUND to exit code NOT_FOUND (3)', async () => {
    const pool = new MockPool();
    const error = playbookNotFound();
    const renamePlaybook = {
      handle: async () => err(error),
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.NOT_FOUND);
    // 18. Human error escribe en stderr
    expect(io.stderr).toContain(error.message);
    expect(io.stdout).toBe('');
    // 20. El pool se cierra cuando el Handler retorna error
    expect(pool.closeCalled).toBe(1);
  });

  // 12. PLAYBOOK_NAME_CONFLICT
  // 16. El exit code de conflictos es 4
  it('maps PLAYBOOK_NAME_CONFLICT to exit code CONFLICT (4)', async () => {
    const pool = new MockPool();
    const error = playbookNameConflict();
    const renamePlaybook = {
      handle: async () => err(error),
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.CONFLICT);
    expect(io.stderr).toContain(error.message);
    expect(pool.closeCalled).toBe(1);
  });

  // 13. PERSISTENCE_REVISION_CONFLICT
  it('maps PERSISTENCE_REVISION_CONFLICT to exit code CONFLICT (4)', async () => {
    const pool = new MockPool();
    const error = persistenceRevisionConflict(createPersistenceRevision(1));
    const renamePlaybook = {
      handle: async () => err(error),
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.CONFLICT);
    expect(io.stderr).toContain(error.message);
    expect(pool.closeCalled).toBe(1);
  });

  // 14. PLAYBOOK_OPERATION_NOT_ALLOWED
  it('maps PLAYBOOK_OPERATION_NOT_ALLOWED to exit code CONFLICT (4)', async () => {
    const pool = new MockPool();
    const error = createRenameNotAllowedError();
    const renamePlaybook = {
      handle: async () => err(error),
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.CONFLICT);
    expect(io.stderr).toContain(error.message);
    expect(pool.closeCalled).toBe(1);
  });

  // 15. PERSISTENCE_OPERATION_FAILED
  it('maps PERSISTENCE_OPERATION_FAILED to exit code INFRASTRUCTURE_ERROR (6)', async () => {
    const pool = new MockPool();
    const renamePlaybook = {
      handle: async () => err(persistenceOperationFailed('playbook.update')),
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(ExitCode.INFRASTRUCTURE_ERROR);
    expect(io.stderr).toContain('Persistence operation failed');
    expect(pool.closeCalled).toBe(1);
  });

  // 21. No se filtran detalles sensibles
  it('does not leak internal error message details when unexpected exception occurs', async () => {
    const pool = new MockPool();
    const renamePlaybook = {
      handle: async () => {
        throw new Error('Secret DB crash details');
      },
    };
    const services = createMockServices({ pool, renamePlaybook });
    const deps = createMockDependencies(services);
    const io = new MockIo();

    const code = await runCli(
      ['playbook', 'rename', '--id', '00000000-0000-0000-0000-000000000002', '--name', 'New Name'],
      envReader,
      io,
      deps,
    );
    expect(code).toBe(1);
    expect(io.stderr).toContain('An unexpected error occurred.');
    expect(io.stderr).not.toContain('Secret DB crash details');
    expect(pool.closeCalled).toBe(1);
  });
});

describe('runCli playbook archive command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );
  const archiveArgs = ['playbook', 'archive', '--id', '00000000-0000-0000-0000-000000000002'];

  it('includes playbook archive in help', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());

    const code = await runCli(['--help'], envReader, io, deps);

    expect(code).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('playbook archive       --id <uuid>       Archive a playbook');
    expect(deps.getBuildCalled()).toBe(0);
  });

  it('rejects a missing id, flag value, and unknown flag without constructing services', async () => {
    for (const args of [
      ['playbook', 'archive'],
      ['playbook', 'archive', '--id'],
      ['playbook', 'archive', '--id', '00000000-0000-0000-0000-000000000002', '--extra'],
    ]) {
      const io = new MockIo();
      const deps = createMockDependencies(createMockServices());

      const code = await runCli(args, envReader, io, deps);

      expect(code).toBe(ExitCode.INVALID_INPUT);
      expect(deps.getBuildCalled()).toBe(0);
    }
  });

  it('invokes the handler with the exact archive command and closes the pool once', async () => {
    const pool = new MockPool();
    const archivePlaybook: CliServices['archivePlaybook'] = {
      handle: async (command) => {
        expect(command).toEqual({ playbookId: '00000000-0000-0000-0000-000000000002' });
        return ok(createPlaybookOutputFixture({ status: 'archived' }));
      },
    };
    const deps = createMockDependencies(createMockServices({ pool, archivePlaybook }));

    const code = await runCli(archiveArgs, envReader, new MockIo(), deps);

    expect(code).toBe(ExitCode.SUCCESS);
    expect(pool.closeCalled).toBe(1);
  });

  it('writes human and JSON success output to stdout', async () => {
    const humanIo = new MockIo();
    const humanCode = await runCli(
      [...archiveArgs, '--output', 'human'],
      envReader,
      humanIo,
      createMockDependencies(createMockServices()),
    );
    expect(humanCode).toBe(ExitCode.SUCCESS);
    expect(humanIo.stdout).toContain('Playbook:');
    expect(humanIo.stderr).toBe('');

    const jsonIo = new MockIo();
    const jsonCode = await runCli(
      [...archiveArgs, '--output', 'json'],
      envReader,
      jsonIo,
      createMockDependencies(createMockServices()),
    );
    expect(jsonCode).toBe(ExitCode.SUCCESS);
    expect(jsonIo.stdout).toContain('"success": true');
    expect(jsonIo.stderr).toBe('');
  });

  it.each([
    [playbookNotFound(), ExitCode.NOT_FOUND],
    [createPlaybookAlreadyArchivedError(), ExitCode.CONFLICT],
    [persistenceRevisionConflict(createPersistenceRevision(1)), ExitCode.CONFLICT],
    [playbookNameConflict(), ExitCode.CONFLICT],
    [createPlaybookStateInvalidError(), ExitCode.INFRASTRUCTURE_ERROR],
    [persistenceOperationFailed('playbook.update'), ExitCode.INFRASTRUCTURE_ERROR],
  ])('maps $0.code to the expected exit code', async (error, expectedCode) => {
    const pool = new MockPool();
    const archivePlaybook: CliServices['archivePlaybook'] = {
      handle: async () => err(error),
    };
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices({ pool, archivePlaybook }));

    const code = await runCli(archiveArgs, envReader, io, deps);

    expect(code).toBe(expectedCode);
    expect(io.stderr).toContain(error.message);
    expect(io.stdout).toBe('');
    expect(pool.closeCalled).toBe(1);
  });

  it('closes the pool once and hides internal details on an unexpected exception', async () => {
    const pool = new MockPool();
    const archivePlaybook: CliServices['archivePlaybook'] = {
      handle: async () => {
        throw new Error('Secret archive failure');
      },
    };
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices({ pool, archivePlaybook }));

    const code = await runCli(archiveArgs, envReader, io, deps);

    expect(code).toBe(ExitCode.UNEXPECTED_ERROR);
    expect(io.stderr).toContain('An unexpected error occurred.');
    expect(io.stderr).not.toContain('Secret archive failure');
    expect(pool.closeCalled).toBe(1);
  });
});

describe('runCli playbook restore command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );
  const args = ['playbook', 'restore', '--id', '00000000-0000-0000-0000-000000000002'];

  it('includes help and rejects invalid input before services', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook restore       --id <uuid>       Restore an archived playbook',
    );
    for (const invalid of [
      ['playbook', 'restore'],
      ['playbook', 'restore', '--id'],
      [...args, '--extra'],
    ]) {
      const dependencies = createMockDependencies(createMockServices());
      expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
        ExitCode.INVALID_INPUT,
      );
      expect(dependencies.getBuildCalled()).toBe(0);
    }
  });

  it('passes exact command, renders human and json, and closes pool once', async () => {
    const pool = new MockPool();
    const restorePlaybook: CliServices['restorePlaybook'] = {
      handle: async (command) => {
        expect(command).toEqual({ playbookId: '00000000-0000-0000-0000-000000000002' });
        return ok(createPlaybookOutputFixture());
      },
    };
    const human = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        human,
        createMockDependencies(createMockServices({ pool, restorePlaybook })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(human.stdout).toContain('Playbook:');
    expect(human.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);
    const json = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        json,
        createMockDependencies(createMockServices()),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(json.stdout).toContain('"success": true');
    expect(json.stderr).toBe('');
  });

  it.each([
    [playbookNotFound(), ExitCode.NOT_FOUND],
    [playbookNameConflict(), ExitCode.CONFLICT],
    [createPlaybookNotArchivedError(), ExitCode.CONFLICT],
    [persistenceRevisionConflict(createPersistenceRevision(1)), ExitCode.CONFLICT],
    [createPlaybookStateInvalidError(), ExitCode.INFRASTRUCTURE_ERROR],
    [persistenceOperationFailed('playbook.update'), ExitCode.INFRASTRUCTURE_ERROR],
  ])('maps $0.code and closes pool once', async (error, expected) => {
    const pool = new MockPool();
    const restorePlaybook: CliServices['restorePlaybook'] = { handle: async () => err(error) };
    const io = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, restorePlaybook })),
      ),
    ).toBe(expected);
    expect(io.stderr).toContain(error.message);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes pool and hides unexpected exception details', async () => {
    const pool = new MockPool();
    const restorePlaybook: CliServices['restorePlaybook'] = {
      handle: async () => {
        throw new Error('Secret restore failure');
      },
    };
    const io = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, restorePlaybook })),
      ),
    ).toBe(ExitCode.UNEXPECTED_ERROR);
    expect(io.stderr).toContain('An unexpected error occurred.');
    expect(io.stderr).not.toContain('Secret restore failure');
    expect(pool.closeCalled).toBe(1);
  });
});

describe('runCli playbook source register command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );
  const args = [
    'playbook',
    'source',
    'register',
    '--playbook-id',
    '00000000-0000-0000-0000-000000000002',
    '--type',
    'notion',
    '--external-root-reference',
    'notion-root',
    '--configuration-reference',
    'notion/main',
  ];

  it('includes help and rejects invalid input before building services', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook source register  --playbook-id <uuid> --type <type>  Register a playbook source',
    );

    for (const invalid of [
      ['playbook', 'source', 'register'],
      ['playbook', 'source', 'register', '--playbook-id'],
      ['playbook', 'source', 'register', '--playbook-id', 'id', '--type', 'notion'],
      [
        'playbook',
        'source',
        'register',
        '--playbook-id',
        'id',
        '--type',
        'notion',
        '--external-root-reference',
        'root',
      ],
      [...args, '--unexpected'],
    ]) {
      const dependencies = createMockDependencies(createMockServices());
      expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
        ExitCode.INVALID_INPUT,
      );
      expect(dependencies.getBuildCalled()).toBe(0);
    }
  });

  it('passes the exact command, renders safe human and JSON output, and closes once', async () => {
    const pool = new MockPool();
    const registerPlaybookSource: CliServices['registerPlaybookSource'] = {
      handle: async (command) => {
        expect(command).toEqual({
          playbookId: '00000000-0000-0000-0000-000000000002',
          type: 'notion',
          externalRootReference: 'notion-root',
          configurationReference: 'notion/main',
        });
        return ok(createPlaybookSourceOutputFixture());
      },
    };
    const human = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        human,
        createMockDependencies(createMockServices({ pool, registerPlaybookSource })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(human.stdout).toContain('Playbook Source:');
    expect(human.stdout).toContain('Configuration Reference:  notion/main');
    expect(human.stdout).not.toMatch(/credential|secret|token/i);
    expect(human.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);

    const json = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        json,
        createMockDependencies(createMockServices()),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(JSON.parse(json.stdout)).toMatchObject({
      success: true,
      data: { playbookSourceId: '00000000-0000-0000-0000-000000000003' },
    });
    expect(json.stderr).toBe('');
  });

  it.each([
    [playbookSourceTypeUnsupported('unsupported'), ExitCode.INVALID_INPUT],
    [playbookNotFound(), ExitCode.NOT_FOUND],
    [playbookArchived(createPlaybookId('00000000-0000-0000-0000-000000000002')), ExitCode.CONFLICT],
    [
      enabledPlaybookSourceConflict(createPlaybookId('00000000-0000-0000-0000-000000000002')),
      ExitCode.CONFLICT,
    ],
    [persistenceOperationFailed('playbookSource.insert'), ExitCode.INFRASTRUCTURE_ERROR],
  ])('maps real $0.code errors to exits and closes once', async (error, expected) => {
    const pool = new MockPool();
    const registerPlaybookSource: CliServices['registerPlaybookSource'] = {
      handle: async () => err(error),
    };
    const io = new MockIo();

    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, registerPlaybookSource })),
      ),
    ).toBe(expected);
    expect(io.stderr).toContain(error.message);
    expect(io.stdout).toBe('');
    expect(pool.closeCalled).toBe(1);
  });

  it('closes once and preserves privacy when the handler throws in JSON mode', async () => {
    const pool = new MockPool();
    const registerPlaybookSource: CliServices['registerPlaybookSource'] = {
      handle: async () => {
        throw new Error('Secret source registration failure');
      },
    };
    const io = new MockIo();

    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, registerPlaybookSource })),
      ),
    ).toBe(ExitCode.UNEXPECTED_ERROR);
    expect(io.stdout).toContain('An unexpected error occurred.');
    expect(io.stdout).not.toContain('Secret source registration failure');
    expect(io.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);
  });
});
