import type { EnvReader, CliOutput, RawConfig } from '@ai-playbook-engine/config';
import { loadConfig } from '@ai-playbook-engine/config';
import { parseArgs } from './args.js';
import { ExitCode } from './exit-codes.js';
import {
  renderWorkspaceInitialized,
  renderWorkspace,
  renderPlaybook,
  renderPlaybookList,
  renderPlaybookSource,
  renderPlaybookSourceList,
} from './human-renderer.js';
import { renderJsonSuccess, renderJsonError } from './json-renderer.js';
import { mapErrorToExitCode, getErrorMessage } from './error-mapper.js';
import { buildServices } from './composition-root.js';
import type { Services, BuildServicesError } from './composition-root.js';
import type { Result } from '@ai-playbook-engine/shared';

export interface CliIo {
  writeStdout(value: string): void;
  writeStderr(value: string): void;
}

export interface CliServices {
  readonly pool: Pick<Services['pool'], 'close'>;
  readonly initializeWorkspace: Pick<Services['initializeWorkspace'], 'handle'>;
  readonly getCurrentWorkspace: Pick<Services['getCurrentWorkspace'], 'handle'>;
  readonly createPlaybook: Pick<Services['createPlaybook'], 'handle'>;
  readonly renamePlaybook: Pick<Services['renamePlaybook'], 'handle'>;
  readonly archivePlaybook: Pick<Services['archivePlaybook'], 'handle'>;
  readonly restorePlaybook: Pick<Services['restorePlaybook'], 'handle'>;
  readonly registerPlaybookSource: Pick<Services['registerPlaybookSource'], 'handle'>;
  readonly getPlaybookSource: Pick<Services['getPlaybookSource'], 'handle'>;
  readonly listPlaybookSources: Pick<Services['listPlaybookSources'], 'handle'>;
  readonly getPlaybook: Pick<Services['getPlaybook'], 'handle'>;
  readonly listPlaybooks: Pick<Services['listPlaybooks'], 'handle'>;
  readonly migrate: Services['migrate'];
}

export interface RunCliDependencies {
  readonly buildServices: (config: RawConfig) => Result<CliServices, BuildServicesError>;
}

const defaultDependencies: RunCliDependencies = Object.freeze({
  buildServices,
});

const ALLOWED_FLAGS: ReadonlyMap<string, ReadonlySet<string>> = new Map<
  string,
  ReadonlySet<string>
>([
  ['database migrate', new Set<string>(['output', 'help'])],
  ['workspace initialize', new Set<string>(['name', 'description', 'output', 'help'])],
  ['workspace show', new Set<string>(['output', 'help'])],
  ['playbook create', new Set<string>(['name', 'description', 'output', 'help'])],
  [
    'playbook list',
    new Set<string>([
      'status',
      'name-prefix',
      'has-active-version',
      'offset',
      'limit',
      'output',
      'help',
    ]),
  ],
  ['playbook show', new Set<string>(['id', 'output', 'help'])],
  ['playbook rename', new Set<string>(['id', 'name', 'output', 'help'])],
  ['playbook archive', new Set<string>(['id', 'output', 'help'])],
  ['playbook restore', new Set<string>(['id', 'output', 'help'])],
  [
    'playbook source register',
    new Set<string>([
      'playbook-id',
      'type',
      'external-root-reference',
      'configuration-reference',
      'output',
      'help',
    ]),
  ],
  ['playbook source show', new Set<string>(['id', 'output', 'help'])],
  ['playbook source list', new Set<string>(['playbook-id', 'offset', 'limit', 'output', 'help'])],
]);

const GLOBAL_FLAGS = new Set<string>(['output', 'workspace-id', 'help']);

export function parseStrictInteger(raw: string): number | null {
  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    return null;
  }
  const val = Number(raw);
  if (!Number.isSafeInteger(val)) {
    return null;
  }
  return val;
}

export async function runCli(
  argv: readonly string[],
  envReader: EnvReader,
  io: CliIo,
  dependencies: RunCliDependencies = defaultDependencies,
): Promise<ExitCode> {
  let cliOutputOverride: CliOutput | undefined;

  try {
    const argsResult = parseArgs(argv);

    if (!argsResult.success) {
      const isJson =
        argv.includes('--output=json') ||
        (argv.indexOf('--output') !== -1 && argv[argv.indexOf('--output') + 1] === 'json');

      if (isJson) {
        io.writeStdout(renderJsonError(argsResult.error.code, argsResult.error.message, {}) + '\n');
      } else {
        io.writeStderr(`Error: ${argsResult.error.message}\n`);
      }
      return ExitCode.INVALID_INPUT;
    }

    const { command, flags } = argsResult.value;

    if (flags.get('help') === true || command.length === 0) {
      printHelp(io);
      return ExitCode.SUCCESS;
    }

    const outputFlag = flags.get('output');
    if (outputFlag !== undefined) {
      if (typeof outputFlag !== 'string' || (outputFlag !== 'human' && outputFlag !== 'json')) {
        io.writeStderr('Error: Invalid --output value. Must be "human" or "json".\n');
        return ExitCode.INVALID_INPUT;
      }
      cliOutputOverride = outputFlag;
    }

    const cliWorkspaceIdOverride = flags.get('workspace-id');
    const workspaceIdOverride =
      typeof cliWorkspaceIdOverride === 'string' ? cliWorkspaceIdOverride : undefined;

    const overrides: { workspaceId?: string; cliOutput?: CliOutput } = {};
    if (workspaceIdOverride !== undefined) {
      overrides.workspaceId = workspaceIdOverride;
    }
    if (cliOutputOverride !== undefined) {
      overrides.cliOutput = cliOutputOverride;
    }

    const configResult = loadConfig(envReader, overrides);
    if (!configResult.success) {
      const msg = getErrorMessage(configResult.error);
      if (cliOutputOverride === 'json') {
        io.writeStdout(renderJsonError(msg.code, msg.message, msg.details) + '\n');
      } else {
        io.writeStderr(`Config error: ${msg.message}\n`);
      }
      return ExitCode.CONFIG_ERROR;
    }

    const config = configResult.value;
    const output = cliOutputOverride ?? config.cliOutput;

    const subcommand = command.join(' ');

    const allowedFlags = ALLOWED_FLAGS.get(subcommand);
    if (allowedFlags === undefined) {
      return await handleError(`Unknown command: "${subcommand}".`, 'INVALID_INPUT', output, io);
    }

    for (const [name, value] of flags) {
      if (!GLOBAL_FLAGS.has(name) && !allowedFlags.has(name)) {
        return await handleError(`Unknown flag: --${name}.`, 'INVALID_INPUT', output, io);
      }

      if (value === true && name !== 'help') {
        return await handleError(`Flag --${name} requires a value.`, 'INVALID_INPUT', output, io);
      }
    }

    switch (subcommand) {
      case 'database migrate': {
        return await runDatabaseMigrate(config, output, io, dependencies);
      }
      case 'workspace initialize': {
        return await runWorkspaceInitialize(config, output, flags, io, dependencies);
      }
      case 'workspace show': {
        return await runWorkspaceShow(config, output, io, dependencies);
      }
      case 'playbook create': {
        return await runPlaybookCreate(config, output, flags, io, dependencies);
      }
      case 'playbook list': {
        return await runPlaybookList(config, output, flags, io, dependencies);
      }
      case 'playbook show': {
        return await runPlaybookShow(config, output, flags, io, dependencies);
      }
      case 'playbook rename': {
        return await runPlaybookRename(config, output, flags, io, dependencies);
      }
      case 'playbook archive': {
        return await runPlaybookArchive(config, output, flags, io, dependencies);
      }
      case 'playbook restore': {
        return await runPlaybookRestore(config, output, flags, io, dependencies);
      }
      case 'playbook source register': {
        return await runPlaybookSourceRegister(config, output, flags, io, dependencies);
      }
      case 'playbook source show': {
        return await runPlaybookSourceShow(config, output, flags, io, dependencies);
      }
      case 'playbook source list': {
        return await runPlaybookSourceList(config, output, flags, io, dependencies);
      }
      default: {
        return await handleError(`Unknown command: "${subcommand}".`, 'INVALID_INPUT', output, io);
      }
    }
  } catch {
    const fallbackOutput = cliOutputOverride ?? 'human';
    return await handleError(
      'An unexpected error occurred.',
      'UNEXPECTED_ERROR',
      fallbackOutput,
      io,
    );
  }
}

async function runDatabaseMigrate(
  config: RawConfig,
  output: CliOutput,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.migrate();
    if (!result.success) {
      return await handleMigrationError(result.error, output, io);
    }

    if (result.value.appliedVersions.length === 0) {
      if (output === 'json') {
        io.writeStdout(renderJsonSuccess({ appliedVersions: [] }) + '\n');
      } else {
        io.writeStdout('Migrations are up to date.\n');
      }
    } else {
      if (output === 'json') {
        io.writeStdout(renderJsonSuccess({ appliedVersions: result.value.appliedVersions }) + '\n');
      } else {
        io.writeStdout(`Applied migrations: ${result.value.appliedVersions.join(', ')}\n`);
      }
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runWorkspaceInitialize(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const name = flags.get('name');
  if (typeof name !== 'string' || name.length === 0) {
    return await handleError('--name is required', 'INVALID_INPUT', output, io);
  }

  const description = flags.get('description');
  const desc = typeof description === 'string' ? description : undefined;

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.initializeWorkspace.handle({
      name,
      ...(desc !== undefined ? { description: desc } : {}),
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderWorkspaceInitialized(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runWorkspaceShow(
  config: RawConfig,
  output: CliOutput,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.getCurrentWorkspace.handle();

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderWorkspace(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookCreate(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const name = flags.get('name');
  if (typeof name !== 'string' || name.length === 0) {
    return await handleError('--name is required', 'INVALID_INPUT', output, io);
  }

  const description = flags.get('description');
  const desc = typeof description === 'string' ? description : undefined;

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.createPlaybook.handle({
      name,
      ...(desc !== undefined ? { description: desc } : {}),
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybook(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookList(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const statusFlag = flags.get('status');
  const status =
    typeof statusFlag === 'string'
      ? statusFlag === 'active' || statusFlag === 'archived'
        ? statusFlag
        : undefined
      : undefined;
  if (statusFlag !== undefined && status === undefined) {
    return await handleError(
      '--status must be "active" or "archived"',
      'INVALID_INPUT',
      output,
      io,
    );
  }

  const namePrefix = flags.get('name-prefix');
  const prefix = typeof namePrefix === 'string' ? namePrefix : undefined;

  const hasActiveVersionFlag = flags.get('has-active-version');
  let hasActiveVersion: boolean | undefined;
  if (hasActiveVersionFlag !== undefined) {
    if (hasActiveVersionFlag === 'true') {
      hasActiveVersion = true;
    } else if (hasActiveVersionFlag === 'false') {
      hasActiveVersion = false;
    } else {
      return await handleError(
        '--has-active-version must be "true" or "false"',
        'INVALID_INPUT',
        output,
        io,
      );
    }
  }

  const offsetRaw = flags.get('offset');
  let offset = 0;
  if (offsetRaw !== undefined) {
    if (typeof offsetRaw !== 'string') {
      return await handleError(
        '--offset must be a non-negative integer',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    const parsed = parseStrictInteger(offsetRaw);
    if (parsed === null || parsed < 0) {
      return await handleError(
        '--offset must be a non-negative integer',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    offset = parsed;
  }

  const limitRaw = flags.get('limit');
  let limit = 25;
  if (limitRaw !== undefined) {
    if (typeof limitRaw !== 'string') {
      return await handleError(
        '--limit must be an integer between 1 and 100',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    const parsed = parseStrictInteger(limitRaw);
    if (parsed === null || parsed < 1 || parsed > 100) {
      return await handleError(
        '--limit must be an integer between 1 and 100',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    limit = parsed;
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.listPlaybooks.handle({
      ...(status !== undefined ? { status } : {}),
      ...(prefix !== undefined ? { namePrefix: prefix } : {}),
      ...(hasActiveVersion !== undefined ? { hasActiveVersion } : {}),
      offset,
      limit,
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(
        renderJsonSuccess({
          items: result.value.items,
          offset: result.value.offset,
          limit: result.value.limit,
          hasMore: result.value.hasMore,
          totalCount: result.value.totalCount,
        }) + '\n',
      );
    } else {
      io.writeStdout(renderPlaybookList(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookShow(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return await handleError('--id is required', 'INVALID_INPUT', output, io);
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.getPlaybook.handle({
      playbookId: id,
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybook(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookRename(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return await handleError('--id is required', 'INVALID_INPUT', output, io);
  }

  const name = flags.get('name');
  if (typeof name !== 'string' || name.length === 0) {
    return await handleError('--name is required', 'INVALID_INPUT', output, io);
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.renamePlaybook.handle({
      playbookId: id,
      newName: name,
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybook(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookArchive(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return await handleError('--id is required', 'INVALID_INPUT', output, io);
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.archivePlaybook.handle({ playbookId: id });
    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybook(result.value) + '\n');
    }
    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookRestore(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return await handleError('--id is required', 'INVALID_INPUT', output, io);
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.restorePlaybook.handle({ playbookId: id });
    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybook(result.value) + '\n');
    }
    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookSourceRegister(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const playbookId = flags.get('playbook-id');
  if (typeof playbookId !== 'string' || playbookId.length === 0)
    return await handleError('--playbook-id is required', 'INVALID_INPUT', output, io);
  const type = flags.get('type');
  if (typeof type !== 'string' || type.length === 0)
    return await handleError('--type is required', 'INVALID_INPUT', output, io);
  const externalRootReference = flags.get('external-root-reference');
  if (typeof externalRootReference !== 'string' || externalRootReference.length === 0)
    return await handleError('--external-root-reference is required', 'INVALID_INPUT', output, io);
  const configurationReference = flags.get('configuration-reference');
  if (typeof configurationReference !== 'string' || configurationReference.length === 0)
    return await handleError('--configuration-reference is required', 'INVALID_INPUT', output, io);
  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) return await handleStructuredError(servicesResult.error, output, io);
  const services = servicesResult.value;
  try {
    const result = await services.registerPlaybookSource.handle({
      playbookId,
      type,
      externalRootReference,
      configurationReference,
    });
    if (!result.success) return await handleUseCaseError(result.error, output, io);
    if (output === 'json') io.writeStdout(renderJsonSuccess(result.value) + '\n');
    else io.writeStdout(renderPlaybookSource(result.value) + '\n');
    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookSourceList(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const playbookId = flags.get('playbook-id');
  if (typeof playbookId !== 'string' || playbookId.length === 0) {
    return await handleError('--playbook-id is required', 'INVALID_INPUT', output, io);
  }

  const offsetRaw = flags.get('offset');
  let offset = 0;
  if (offsetRaw !== undefined) {
    if (typeof offsetRaw !== 'string') {
      return await handleError(
        '--offset must be a non-negative integer',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    const parsed = parseStrictInteger(offsetRaw);
    if (parsed === null || parsed < 0) {
      return await handleError(
        '--offset must be a non-negative integer',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    offset = parsed;
  }

  const limitRaw = flags.get('limit');
  let limit = 25;
  if (limitRaw !== undefined) {
    if (typeof limitRaw !== 'string') {
      return await handleError(
        '--limit must be an integer between 1 and 100',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    const parsed = parseStrictInteger(limitRaw);
    if (parsed === null || parsed < 1 || parsed > 100) {
      return await handleError(
        '--limit must be an integer between 1 and 100',
        'INVALID_INPUT',
        output,
        io,
      );
    }
    limit = parsed;
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.listPlaybookSources.handle({
      playbookId,
      offset,
      limit,
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(
        renderJsonSuccess({
          items: result.value.items,
          offset: result.value.offset,
          limit: result.value.limit,
          hasMore: result.value.hasMore,
          totalCount: result.value.totalCount,
        }) + '\n',
      );
    } else {
      io.writeStdout(renderPlaybookSourceList(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookSourceShow(
  config: RawConfig,
  output: CliOutput,
  flags: ReadonlyMap<string, string | boolean>,
  io: CliIo,
  dependencies: RunCliDependencies,
): Promise<ExitCode> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    return await handleError('--id is required', 'INVALID_INPUT', output, io);
  }

  const servicesResult = dependencies.buildServices(config);
  if (!servicesResult.success) {
    return await handleStructuredError(servicesResult.error, output, io);
  }

  const services = servicesResult.value;
  try {
    const result = await services.getPlaybookSource.handle({
      playbookSourceId: id,
    });

    if (!result.success) {
      return await handleUseCaseError(result.error, output, io);
    }

    if (output === 'json') {
      io.writeStdout(renderJsonSuccess(result.value) + '\n');
    } else {
      io.writeStdout(renderPlaybookSource(result.value) + '\n');
    }

    return ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function handleError(
  message: string,
  errorCode: string,
  output: CliOutput,
  io: CliIo,
): Promise<ExitCode> {
  if (output === 'json') {
    io.writeStdout(renderJsonError(errorCode, message, {}) + '\n');
  } else {
    io.writeStderr(`Error: ${message}\n`);
  }
  if (errorCode === 'INVALID_INPUT') {
    return ExitCode.INVALID_INPUT;
  }
  return mapErrorToExitCode(errorCode);
}

async function handleStructuredError(
  error: BuildServicesError,
  output: CliOutput,
  io: CliIo,
): Promise<ExitCode> {
  if (output === 'json') {
    io.writeStdout(
      renderJsonError(error.error.code, error.error.message, error.error.details) + '\n',
    );
  } else {
    io.writeStderr(`Error: ${error.error.message}\n`);
  }
  return mapErrorToExitCode(error.error.code);
}

async function handleUseCaseError(
  error: { code: string; message: string; details?: unknown },
  output: CliOutput,
  io: CliIo,
): Promise<ExitCode> {
  const msg = getErrorMessage(error);
  if (output === 'json') {
    io.writeStdout(renderJsonError(msg.code, msg.message, msg.details) + '\n');
  } else {
    io.writeStderr(`Error: ${msg.message}\n`);
  }
  return mapErrorToExitCode(error.code);
}

async function handleMigrationError(
  error: { code: string; message: string },
  output: CliOutput,
  io: CliIo,
): Promise<ExitCode> {
  if (output === 'json') {
    io.writeStdout(renderJsonError(error.code, 'Migration failed.', {}) + '\n');
  } else {
    io.writeStderr('Error: Migration failed.\n');
  }
  return ExitCode.INFRASTRUCTURE_ERROR;
}

function printHelp(io: CliIo): void {
  io.writeStdout(`ai-playbook-engine CLI

Usage:
  database migrate                         Apply pending database migrations
  workspace initialize   --name <value>    Initialize the personal workspace
  workspace show                           Show current workspace details
  playbook create        --name <value>    Create a new playbook
  playbook list          [options]         List playbooks
  playbook show          --id <uuid>       Show playbook details
  playbook rename        --id <uuid> --name <value>  Rename a playbook
  playbook archive       --id <uuid>       Archive a playbook
  playbook restore       --id <uuid>       Restore an archived playbook
  playbook source register  --playbook-id <uuid> --type <type>  Register a playbook source
  playbook source show      --id <uuid>       Show playbook source details
  playbook source list      --playbook-id <uuid> [options]  List playbook sources

Global flags:
  --workspace-id <uuid>  Override the current workspace ID
  --output human|json    Output format (default: human)
  --help                 Show this help

Playbook list options:
  --status active|archived              Filter by status
  --name-prefix <value>                 Filter by name prefix
  --has-active-version true|false       Filter by active version presence
  --offset <integer>                    Pagination offset (default: 0)
  --limit <integer>                     Pagination limit (default: 25)

Playbook source list options:
  --offset <integer>  Pagination offset (default: 0)
  --limit <integer>   Pagination limit (default: 25)
`);
}
