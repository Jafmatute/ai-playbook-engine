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
  playbookSourceNotFound,
  workspaceNotFound,
  paginationInvalid,
  persistenceRevisionConflict,
  PersistenceRevision,
} from '@ai-playbook-engine/application';
import type {
  PlaybookAlreadyArchivedError,
  PlaybookNotArchivedError,
  PlaybookOperationNotAllowedError,
  PlaybookSourceId,
  PlaybookStateInvalidError,
} from '@ai-playbook-engine/core';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
} from '@ai-playbook-engine/core';
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
  readonly getPlaybookSource?: CliServices['getPlaybookSource'];
  readonly listPlaybookSources?: CliServices['listPlaybookSources'];
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

function createPlaybookSourcePageFixture(
  overrides: Partial<Page<PlaybookSourceOutput>> = {},
): Page<PlaybookSourceOutput> {
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

function createPlaybookSourceId(value: string): PlaybookSourceId {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Expected a valid playbook source ID fixture.');
  return result.value;
}

function createInvalidPlaybookIdError() {
  const result = parsePlaybookId('not-a-uuid');
  if (result.success) throw new Error('Expected an invalid playbook ID error.');
  return result.error;
}

function createInvalidPlaybookSourceIdError() {
  const result = parsePlaybookSourceId('not-a-uuid');
  if (result.success) {
    throw new Error('Expected an invalid playbook source ID error.');
  }
  return result.error;
}

function createInvalidExternalRootReferenceError() {
  const result = PlaybookSourceExternalRootReference.create('');
  if (result.success) throw new Error('Expected an invalid external root reference error.');
  return result.error;
}

function createInvalidConfigurationReferenceError() {
  const result = PlaybookSourceConfigurationReference.create('');
  if (result.success) throw new Error('Expected an invalid configuration reference error.');
  return result.error;
}

function createInstant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Expected a valid instant fixture.');
  return result.value;
}

function createCorePlaybook(): Playbook {
  const workspaceId = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
  const name = PlaybookName.create('Playbook Name');
  if (!workspaceId.success || !name.success) {
    throw new Error('Expected valid core playbook fixtures.');
  }
  const result = Playbook.create({
    playbookId: createPlaybookId('00000000-0000-0000-0000-000000000002'),
    workspaceId: workspaceId.value,
    name: name.value,
    createdAt: createInstant('2026-07-12T10:00:00.000Z'),
  });
  if (!result.success) throw new Error('Expected a valid core playbook fixture.');
  return result.value;
}

function createRenameNotAllowedError(): PlaybookOperationNotAllowedError {
  const playbook = createCorePlaybook();
  playbook.archive({ archivedAt: createInstant('2026-07-12T11:00:00.000Z') });
  const name = PlaybookName.create('Renamed Playbook');
  if (!name.success) throw new Error('Expected a valid playbook name fixture.');
  const result = playbook.rename({
    name: name.value,
    updatedAt: createInstant('2026-07-12T12:00:00.000Z'),
  });
  if (result.success) throw new Error('Expected rename to be rejected for an archived playbook.');
  if (result.error.code !== 'PLAYBOOK_OPERATION_NOT_ALLOWED') {
    throw new Error('Expected a playbook operation-not-allowed error.');
  }
  return result.error;
}

function createPlaybookAlreadyArchivedError(): PlaybookAlreadyArchivedError {
  const playbook = createCorePlaybook();
  playbook.archive({ archivedAt: createInstant('2026-07-12T11:00:00.000Z') });
  const result = playbook.archive({ archivedAt: createInstant('2026-07-12T12:00:00.000Z') });
  if (result.success) throw new Error('Expected a second archive to be rejected.');
  if (result.error.code !== 'PLAYBOOK_ALREADY_ARCHIVED') {
    throw new Error('Expected a playbook already-archived error.');
  }
  return result.error;
}

function createPlaybookNotArchivedError(): PlaybookNotArchivedError {
  const result = createCorePlaybook().restoreFromArchive({
    restoredAt: createInstant('2026-07-12T11:00:00.000Z'),
  });
  if (result.success) throw new Error('Expected restore to be rejected for an active playbook.');
  if (result.error.code !== 'PLAYBOOK_NOT_ARCHIVED') {
    throw new Error('Expected a playbook not-archived error.');
  }
  return result.error;
}

function createPlaybookStateInvalidError(): PlaybookStateInvalidError {
  const result = createCorePlaybook().archive({
    archivedAt: createInstant('2026-07-12T09:00:00.000Z'),
  });
  if (result.success) throw new Error('Expected archive with a stale timestamp to be rejected.');
  if (result.error.code !== 'PLAYBOOK_STATE_INVALID') {
    throw new Error('Expected a playbook state-invalid error.');
  }
  return result.error;
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
    getPlaybookSource: overrides.getPlaybookSource ?? {
      handle: async () => ok(createPlaybookSourceOutputFixture()),
    },
    listPlaybookSources: overrides.listPlaybookSources ?? {
      handle: async () => ok(createPlaybookSourcePageFixture()),
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

  it('rejects a valueless status flag', async () => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());
    const code = await runCli(['playbook', 'list', '--status'], envReader, io, deps);
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

  it.each([
    ['a missing id', ['playbook', 'archive']],
    ['an id flag without a value', ['playbook', 'archive', '--id']],
    [
      'an unknown flag',
      ['playbook', 'archive', '--id', '00000000-0000-0000-0000-000000000002', '--extra'],
    ],
  ])('rejects %s without constructing services', async (_scenario, args) => {
    const io = new MockIo();
    const deps = createMockDependencies(createMockServices());

    const code = await runCli(args, envReader, io, deps);

    expect(code).toBe(ExitCode.INVALID_INPUT);
    expect(deps.getBuildCalled()).toBe(0);
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

  it('includes help', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook restore       --id <uuid>       Restore an archived playbook',
    );
  });

  it.each([
    ['a missing id', ['playbook', 'restore']],
    ['an id flag without a value', ['playbook', 'restore', '--id']],
    ['an unknown flag', [...args, '--extra']],
  ])('rejects %s before services are built', async (_scenario, invalid) => {
    const dependencies = createMockDependencies(createMockServices());
    expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
      ExitCode.INVALID_INPUT,
    );
    expect(dependencies.getBuildCalled()).toBe(0);
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

  it('includes help', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook source register  --playbook-id <uuid> --type <type>  Register a playbook source',
    );
  });

  it.each([
    ['missing required flags', ['playbook', 'source', 'register']],
    ['a playbook id flag without a value', ['playbook', 'source', 'register', '--playbook-id']],
    [
      'a missing external root reference',
      ['playbook', 'source', 'register', '--playbook-id', 'id', '--type', 'notion'],
    ],
    [
      'a missing configuration reference',
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
    ],
    ['an unknown flag', [...args, '--unexpected']],
    [
      'a missing type',
      ['playbook', 'source', 'register', '--playbook-id', '00000000-0000-0000-0000-000000000002'],
    ],
    ['the forbidden --id flag', [...args, '--id', '00000000-0000-0000-0000-000000000002']],
    ['the forbidden --status flag', [...args, '--status', 'disabled']],
    ['the forbidden --token flag', [...args, '--token', 'secret-value']],
  ])('rejects %s before building services', async (_scenario, invalid) => {
    const dependencies = createMockDependencies(createMockServices());
    expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
      ExitCode.INVALID_INPUT,
    );
    expect(dependencies.getBuildCalled()).toBe(0);
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
    const parsed: unknown = JSON.parse(json.stdout);
    expect(parsed).not.toBeNull();
    expect(typeof parsed).toBe('object');
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      parsed.success === true &&
      'data' in parsed &&
      parsed.data !== null &&
      typeof parsed.data === 'object' &&
      'playbookSourceId' in parsed.data &&
      typeof parsed.data.playbookSourceId === 'string' &&
      'workspaceId' in parsed.data &&
      typeof parsed.data.workspaceId === 'string' &&
      'playbookId' in parsed.data &&
      typeof parsed.data.playbookId === 'string' &&
      'type' in parsed.data &&
      typeof parsed.data.type === 'string' &&
      'status' in parsed.data &&
      typeof parsed.data.status === 'string' &&
      'externalRootReference' in parsed.data &&
      typeof parsed.data.externalRootReference === 'string' &&
      'configurationReference' in parsed.data &&
      typeof parsed.data.configurationReference === 'string' &&
      'createdAt' in parsed.data &&
      typeof parsed.data.createdAt === 'string' &&
      'lastSuccessfulSynchronizationRunId' in parsed.data &&
      'lastSuccessfulSynchronizationAt' in parsed.data &&
      'lastFailedSynchronizationRunId' in parsed.data &&
      'lastFailedSynchronizationAt' in parsed.data
    ) {
      expect(parsed.data.playbookSourceId).toBe('00000000-0000-0000-0000-000000000003');
      expect(parsed.data.workspaceId).toBe('00000000-0000-0000-0000-000000000001');
      expect(parsed.data.playbookId).toBe('00000000-0000-0000-0000-000000000002');
      expect(parsed.data.type).toBe('notion');
      expect(parsed.data.status).toBe('enabled');
      expect(parsed.data.externalRootReference).toBe('notion-root');
      expect(parsed.data.configurationReference).toBe('notion/main');
      expect(parsed.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(parsed.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(parsed.data.lastFailedSynchronizationRunId).toBeNull();
      expect(parsed.data.lastFailedSynchronizationAt).toBeNull();
      expect('revision' in parsed.data).toBe(false);
      expect('token' in parsed.data).toBe(false);
      expect('credential' in parsed.data).toBe(false);
      expect('secret' in parsed.data).toBe(false);
    } else {
      throw new Error('Invalid source registration JSON success output structure.');
    }
    expect(json.stderr).toBe('');
  });

  it.each([
    [createInvalidPlaybookIdError(), ExitCode.INVALID_INPUT],
    [playbookSourceTypeUnsupported('unsupported'), ExitCode.INVALID_INPUT],
    [createInvalidExternalRootReferenceError(), ExitCode.INVALID_INPUT],
    [createInvalidConfigurationReferenceError(), ExitCode.INVALID_INPUT],
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

describe('runCli playbook source show command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );
  const args = ['playbook', 'source', 'show', '--id', '00000000-0000-0000-0000-000000000003'];

  it('includes help', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook source show      --id <uuid>       Show playbook source details',
    );
  });

  it.each([
    ['a missing id', ['playbook', 'source', 'show']],
    ['an id flag without a value', ['playbook', 'source', 'show', '--id']],
    ['an unknown flag', [...args, '--unexpected']],
    [
      'the forbidden --playbook-id flag',
      [...args, '--playbook-id', '00000000-0000-0000-0000-000000000002'],
    ],
    ['the forbidden --type flag', [...args, '--type', 'notion']],
    ['the forbidden --status flag', [...args, '--status', 'enabled']],
    ['the forbidden --token flag', [...args, '--token', 'secret']],
  ])('rejects %s before building services', async (_scenario, invalid) => {
    const dependencies = createMockDependencies(createMockServices());
    expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
      ExitCode.INVALID_INPUT,
    );
    expect(dependencies.getBuildCalled()).toBe(0);
  });

  it('passes the exact command, renders safe human and JSON output, and closes once', async () => {
    const pool = new MockPool();
    const getPlaybookSource: CliServices['getPlaybookSource'] = {
      handle: async (command) => {
        expect(command).toEqual({
          playbookSourceId: '00000000-0000-0000-0000-000000000003',
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
        createMockDependencies(createMockServices({ pool, getPlaybookSource })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(human.stdout).toContain('Playbook Source:');
    expect(human.stdout).toContain('00000000-0000-0000-0000-000000000003');
    expect(human.stdout).toContain('00000000-0000-0000-0000-000000000002');
    expect(human.stdout).toContain('Type:                     notion');
    expect(human.stdout).toContain('Status:                   enabled');
    expect(human.stdout).toContain('External Root Reference:  notion-root');
    expect(human.stdout).toContain('Configuration Reference:  notion/main');
    expect(human.stdout).toContain('Created At:               2026-07-12T10:00:00.000Z');
    expect(human.stdout).not.toMatch(/credential|secret|token/i);
    expect(human.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);

    const jsonPool = new MockPool();
    const json = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        json,
        createMockDependencies(createMockServices({ pool: jsonPool })),
      ),
    ).toBe(ExitCode.SUCCESS);
    const parsed: unknown = JSON.parse(json.stdout);
    expect(parsed).not.toBeNull();
    expect(typeof parsed).toBe('object');
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      parsed.success === true &&
      'data' in parsed &&
      parsed.data !== null &&
      typeof parsed.data === 'object' &&
      'playbookSourceId' in parsed.data &&
      typeof parsed.data.playbookSourceId === 'string' &&
      'workspaceId' in parsed.data &&
      typeof parsed.data.workspaceId === 'string' &&
      'playbookId' in parsed.data &&
      typeof parsed.data.playbookId === 'string' &&
      'type' in parsed.data &&
      typeof parsed.data.type === 'string' &&
      'status' in parsed.data &&
      typeof parsed.data.status === 'string' &&
      'externalRootReference' in parsed.data &&
      typeof parsed.data.externalRootReference === 'string' &&
      'configurationReference' in parsed.data &&
      typeof parsed.data.configurationReference === 'string' &&
      'createdAt' in parsed.data &&
      typeof parsed.data.createdAt === 'string' &&
      'lastSuccessfulSynchronizationRunId' in parsed.data &&
      'lastSuccessfulSynchronizationAt' in parsed.data &&
      'lastFailedSynchronizationRunId' in parsed.data &&
      'lastFailedSynchronizationAt' in parsed.data
    ) {
      expect(parsed.data.playbookSourceId).toBe('00000000-0000-0000-0000-000000000003');
      expect(parsed.data.workspaceId).toBe('00000000-0000-0000-0000-000000000001');
      expect(parsed.data.playbookId).toBe('00000000-0000-0000-0000-000000000002');
      expect(parsed.data.type).toBe('notion');
      expect(parsed.data.status).toBe('enabled');
      expect(parsed.data.externalRootReference).toBe('notion-root');
      expect(parsed.data.configurationReference).toBe('notion/main');
      expect(parsed.data.createdAt).toBe('2026-07-12T10:00:00.000Z');
      expect(parsed.data.lastSuccessfulSynchronizationRunId).toBeNull();
      expect(parsed.data.lastSuccessfulSynchronizationAt).toBeNull();
      expect(parsed.data.lastFailedSynchronizationRunId).toBeNull();
      expect(parsed.data.lastFailedSynchronizationAt).toBeNull();
      expect('revision' in parsed.data).toBe(false);
      expect('token' in parsed.data).toBe(false);
      expect('credential' in parsed.data).toBe(false);
      expect('secret' in parsed.data).toBe(false);
    } else {
      throw new Error('Invalid playbook source show JSON success output structure.');
    }
    expect(json.stderr).toBe('');
    expect(jsonPool.closeCalled).toBe(1);
  });

  it.each([
    [createInvalidPlaybookSourceIdError(), ExitCode.INVALID_INPUT],
    [workspaceNotFound(), ExitCode.NOT_FOUND],
    [
      playbookSourceNotFound(createPlaybookSourceId('00000000-0000-0000-0000-000000000003')),
      ExitCode.NOT_FOUND,
    ],
    [persistenceOperationFailed('playbookSource.findById'), ExitCode.INFRASTRUCTURE_ERROR],
  ])('maps real $0.code errors to exits and closes once', async (error, expected) => {
    const pool = new MockPool();
    const getPlaybookSource: CliServices['getPlaybookSource'] = {
      handle: async () => err(error),
    };
    const io = new MockIo();

    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, getPlaybookSource })),
      ),
    ).toBe(expected);
    expect(io.stderr).toContain(error.message);
    expect(io.stdout).toBe('');
    expect(pool.closeCalled).toBe(1);
  });

  it('renders expected JSON error for PLAYBOOK_SOURCE_NOT_FOUND', async () => {
    const failure = playbookSourceNotFound(
      createPlaybookSourceId('00000000-0000-0000-0000-000000000003'),
    );
    const pool = new MockPool();
    const getPlaybookSource: CliServices['getPlaybookSource'] = {
      handle: async () => err(failure),
    };
    const io = new MockIo();

    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, getPlaybookSource })),
      ),
    ).toBe(ExitCode.NOT_FOUND);
    expect(io.stderr).toBe('');
    const parsed: unknown = JSON.parse(io.stdout);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      'error' in parsed &&
      parsed.error !== null &&
      typeof parsed.error === 'object' &&
      'code' in parsed.error &&
      'message' in parsed.error &&
      'details' in parsed.error &&
      parsed.error.details !== null &&
      typeof parsed.error.details === 'object'
    ) {
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe('PLAYBOOK_SOURCE_NOT_FOUND');
      expect(parsed.error.message).toBe(
        'The playbook source was not found in the current workspace.',
      );
      expect('playbookSourceId' in parsed.error.details).toBe(true);
      if ('playbookSourceId' in parsed.error.details) {
        expect(parsed.error.details.playbookSourceId).toBe('00000000-0000-0000-0000-000000000003');
      }
      expect(io.stdout).not.toMatch(/token|credential|secret/i);
      expect(io.stdout).not.toContain('postgres://localhost:5432/db');
      expect(io.stderr).not.toContain('postgres://localhost:5432/db');
      expect(io.stderr).not.toMatch(/token|credential|secret/i);
    } else {
      throw new Error('Invalid PLAYBOOK_SOURCE_NOT_FOUND JSON error structure.');
    }
    expect(pool.closeCalled).toBe(1);
  });

  it('closes once and preserves privacy when the handler throws in JSON mode', async () => {
    const pool = new MockPool();
    const getPlaybookSource: CliServices['getPlaybookSource'] = {
      handle: async () => {
        throw new Error('Secret source show failure');
      },
    };
    const io = new MockIo();

    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, getPlaybookSource })),
      ),
    ).toBe(ExitCode.UNEXPECTED_ERROR);
    expect(io.stdout).toContain('An unexpected error occurred.');
    expect(io.stdout).not.toContain('Secret source show failure');
    expect(io.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);
  });
});

describe('runCli playbook source list command', () => {
  const envReader = new MapEnvReader(
    new Map([['AI_PLAYBOOK_ENGINE_DATABASE_URL', 'postgres://localhost:5432/db']]),
  );
  const args = [
    'playbook',
    'source',
    'list',
    '--playbook-id',
    '00000000-0000-0000-0000-000000000002',
  ];

  it('includes help', async () => {
    const help = new MockIo();
    expect(
      await runCli(['--help'], envReader, help, createMockDependencies(createMockServices())),
    ).toBe(ExitCode.SUCCESS);
    expect(help.stdout).toContain(
      'playbook source list      --playbook-id <uuid> [options]  List playbook sources',
    );
  });

  it.each([
    ['a missing playbook-id', ['playbook', 'source', 'list']],
    ['playbook-id flag without value', ['playbook', 'source', 'list', '--playbook-id']],
    ['an unknown flag', [...args, '--unexpected']],
    ['the forbidden --id flag', [...args, '--id', '00000000-0000-0000-0000-000000000002']],
    ['the forbidden --type flag', [...args, '--type', 'notion']],
    ['the forbidden --status flag', [...args, '--status', 'enabled']],
    ['the forbidden --token flag', [...args, '--token', 'secret']],
    [
      'the forbidden --external-root-reference flag',
      [...args, '--external-root-reference', 'root'],
    ],
    [
      'the forbidden --configuration-reference flag',
      [...args, '--configuration-reference', 'config'],
    ],
    ['negative offset', [...args, '--offset', '-5']],
    ['decimal offset', [...args, '--offset', '1.5']],
    ['non-numeric offset', [...args, '--offset', 'abc']],
    ['offset without value', [...args, '--offset']],
    ['limit zero', [...args, '--limit', '0']],
    ['limit > 100', [...args, '--limit', '101']],
    ['decimal limit', [...args, '--limit', '1.5']],
    ['non-numeric limit', [...args, '--limit', 'abc']],
    ['limit without value', [...args, '--limit']],
  ])('rejects %s before building services', async (_scenario, invalid) => {
    const dependencies = createMockDependencies(createMockServices());
    expect(await runCli(invalid, envReader, new MockIo(), dependencies)).toBe(
      ExitCode.INVALID_INPUT,
    );
    expect(dependencies.getBuildCalled()).toBe(0);
  });

  it('passes default pagination when no pagination flags are given', async () => {
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async (command) => {
        expect(command).toEqual({
          playbookId: '00000000-0000-0000-0000-000000000002',
          offset: 0,
          limit: 25,
        });
        return ok(createPlaybookSourcePageFixture());
      },
    };
    expect(
      await runCli(
        args,
        envReader,
        new MockIo(),
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(pool.closeCalled).toBe(1);
  });

  it('passes custom pagination flags', async () => {
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async (command) => {
        expect(command).toEqual({
          playbookId: '00000000-0000-0000-0000-000000000002',
          offset: 10,
          limit: 5,
        });
        return ok(createPlaybookSourcePageFixture());
      },
    };
    expect(
      await runCli(
        [...args, '--offset', '10', '--limit', '5'],
        envReader,
        new MockIo(),
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(pool.closeCalled).toBe(1);
  });

  it('renders human output with items', async () => {
    const pool = new MockPool();
    const items = [
      createPlaybookSourceOutputFixture({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        status: 'enabled',
        createdAt: '2026-07-17T10:00:00.000Z',
      }),
      createPlaybookSourceOutputFixture({
        playbookSourceId: '00000000-0000-0000-0000-000000000002',
        status: 'disabled',
        createdAt: '2026-07-17T11:00:00.000Z',
      }),
    ];
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => ok(createPlaybookSourcePageFixture({ items, totalCount: 2 })),
    };
    const io = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('Playbook Sources:');
    expect(io.stdout).toContain('00000000-0000-0000-0000-000000000001');
    expect(io.stdout).toContain('00000000-0000-0000-0000-000000000002');
    expect(io.stdout).toContain('enabled');
    expect(io.stdout).toContain('disabled');
    expect(io.stdout).toContain('notion');
    expect(io.stdout).toContain('2026-07-17T10:00:00.000Z');
    expect(io.stdout).toContain('2026-07-17T11:00:00.000Z');
    expect(io.stdout).toContain('Page: 1-2 of 2');
    expect(io.stdout).not.toMatch(/credential|secret|token/i);
    expect(pool.closeCalled).toBe(1);
  });

  it('renders human output for empty page', async () => {
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => ok(createPlaybookSourcePageFixture()),
    };
    const io = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(io.stdout).toContain('No playbook sources found.');
    expect(pool.closeCalled).toBe(1);
  });

  it('renders JSON output with narrowing', async () => {
    const pool = new MockPool();
    const items = [
      createPlaybookSourceOutputFixture({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-07-17T10:00:00.000Z',
      }),
    ];
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => ok(createPlaybookSourcePageFixture({ items, totalCount: 1 })),
    };
    const io = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    const parsed: unknown = JSON.parse(io.stdout);
    expect(parsed).not.toBeNull();
    expect(typeof parsed).toBe('object');
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      parsed.success === true &&
      'data' in parsed &&
      parsed.data !== null &&
      typeof parsed.data === 'object' &&
      'items' in parsed.data &&
      Array.isArray(parsed.data.items) &&
      'offset' in parsed.data &&
      'limit' in parsed.data &&
      'hasMore' in parsed.data &&
      'totalCount' in parsed.data
    ) {
      expect(parsed.data.offset).toBe(0);
      expect(parsed.data.limit).toBe(25);
      expect(parsed.data.hasMore).toBe(false);
      expect(parsed.data.totalCount).toBe(1);
      expect(parsed.data.items).toHaveLength(1);
      const item = parsed.data.items[0];
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
        expect(item.playbookSourceId).toBe('00000000-0000-0000-0000-000000000001');
        expect(item.workspaceId).toBe('00000000-0000-0000-0000-000000000001');
        expect(item.playbookId).toBe('00000000-0000-0000-0000-000000000002');
        expect(item.type).toBe('notion');
        expect(item.status).toBe('enabled');
        expect(item.externalRootReference).toBe('notion-root');
        expect(item.configurationReference).toBe('notion/main');
        expect(item.createdAt).toBe('2026-07-17T10:00:00.000Z');
        expect(item.lastSuccessfulSynchronizationRunId).toBeNull();
        expect(item.lastSuccessfulSynchronizationAt).toBeNull();
        expect(item.lastFailedSynchronizationRunId).toBeNull();
        expect(item.lastFailedSynchronizationAt).toBeNull();
        expect('revision' in item).toBe(false);
        expect('token' in item).toBe(false);
        expect('credential' in item).toBe(false);
        expect('secret' in item).toBe(false);
      } else throw new Error('Invalid item structure in source list JSON.');
    } else throw new Error('Invalid source list JSON structure.');
    expect(pool.closeCalled).toBe(1);
  });

  it('omits totalCount from JSON when the page does not have one', async () => {
    const pool = new MockPool();
    const items = [
      createPlaybookSourceOutputFixture({
        playbookSourceId: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-07-17T10:00:00.000Z',
      }),
    ];
    const pageWithoutTotalCount: Page<PlaybookSourceOutput> = {
      items,
      offset: 0,
      limit: 25,
      hasMore: false,
    };
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => ok(pageWithoutTotalCount),
    };
    const io = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.SUCCESS);
    expect(io.stderr).toBe('');
    const parsed: unknown = JSON.parse(io.stdout);
    expect(parsed).not.toBeNull();
    expect(typeof parsed).toBe('object');
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      parsed.success === true &&
      'data' in parsed &&
      parsed.data !== null &&
      typeof parsed.data === 'object' &&
      'items' in parsed.data &&
      Array.isArray(parsed.data.items) &&
      'offset' in parsed.data &&
      'limit' in parsed.data &&
      'hasMore' in parsed.data
    ) {
      expect('totalCount' in parsed.data).toBe(false);
      expect(parsed.data.items).toHaveLength(1);
      const item = parsed.data.items[0];
      if (
        item !== null &&
        typeof item === 'object' &&
        'playbookSourceId' in item &&
        'type' in item &&
        'status' in item
      ) {
        expect(item.playbookSourceId).toBe('00000000-0000-0000-0000-000000000001');
        expect('revision' in item).toBe(false);
        expect('token' in item).toBe(false);
        expect('credential' in item).toBe(false);
        expect('secret' in item).toBe(false);
      } else throw new Error('Invalid item structure in source list JSON (no totalCount).');
    } else throw new Error('Invalid source list JSON structure (no totalCount).');
    expect(pool.closeCalled).toBe(1);
  });

  it.each([
    [createInvalidPlaybookIdError(), ExitCode.INVALID_INPUT],
    [paginationInvalid('limit must be an integer between 1 and 100.'), ExitCode.INVALID_INPUT],
    [workspaceNotFound(), ExitCode.NOT_FOUND],
    [playbookNotFound(), ExitCode.NOT_FOUND],
    [persistenceOperationFailed('playbookSource.listByPlaybookId'), ExitCode.INFRASTRUCTURE_ERROR],
  ])('maps real $0.code errors to exits and closes once', async (error, expected) => {
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => err(error),
    };
    const io = new MockIo();
    expect(
      await runCli(
        args,
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(expected);
    expect(io.stderr).toContain(error.message);
    expect(io.stdout).toBe('');
    expect(pool.closeCalled).toBe(1);
  });

  it('renders expected JSON error and does not leak secrets', async () => {
    const failure = playbookNotFound();
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => err(failure),
    };
    const io = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.NOT_FOUND);
    expect(io.stderr).toBe('');
    const parsed: unknown = JSON.parse(io.stdout);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'success' in parsed &&
      'error' in parsed &&
      parsed.error !== null &&
      typeof parsed.error === 'object' &&
      'code' in parsed.error
    ) {
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe('PLAYBOOK_NOT_FOUND');
    } else throw new Error('Invalid source list error JSON structure.');
    expect(io.stdout).not.toContain('postgres://localhost:5432/db');
    expect(io.stdout).not.toMatch(/token|credential|secret/i);
    expect(pool.closeCalled).toBe(1);
  });

  it('closes once and preserves privacy when the handler throws in JSON mode', async () => {
    const pool = new MockPool();
    const listPlaybookSources: CliServices['listPlaybookSources'] = {
      handle: async () => {
        throw new Error('Secret source list failure');
      },
    };
    const io = new MockIo();
    expect(
      await runCli(
        [...args, '--output', 'json'],
        envReader,
        io,
        createMockDependencies(createMockServices({ pool, listPlaybookSources })),
      ),
    ).toBe(ExitCode.UNEXPECTED_ERROR);
    expect(io.stdout).toContain('An unexpected error occurred.');
    expect(io.stdout).not.toContain('Secret source list failure');
    expect(io.stderr).toBe('');
    expect(pool.closeCalled).toBe(1);
  });
});
