import { ProcessEnvReader, loadConfig, type CliOutput } from '@ai-playbook-engine/config';
import type { RawConfig } from '@ai-playbook-engine/config';
import { parseArgs } from './args.js';
import { ExitCode } from './exit-codes.js';
import {
  renderWorkspaceInitialized,
  renderWorkspace,
  renderPlaybook,
  renderPlaybookList,
} from './human-renderer.js';
import { renderJsonSuccess, renderJsonError } from './json-renderer.js';
import { mapErrorToExitCode, getErrorMessage } from './error-mapper.js';
import { buildServices } from './composition-root.js';

const ALLOWED_FLAGS: Record<string, readonly string[]> = {
  'database migrate': ['output', 'help'],
  'workspace initialize': ['name', 'description', 'output', 'help'],
  'workspace show': ['output', 'help'],
  'playbook create': ['name', 'description', 'output', 'help'],
  'playbook list': [
    'status',
    'name-prefix',
    'has-active-version',
    'offset',
    'limit',
    'output',
    'help',
  ],
  'playbook show': ['id', 'output', 'help'],
};

const GLOBAL_FLAGS = ['output', 'workspace-id', 'help'] as const;

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const argsResult = parseArgs(rawArgs);

  if (!argsResult.success) {
    console.error(argsResult.error);
    process.exitCode = ExitCode.INVALID_INPUT;
    return;
  }

  const { command, flags } = argsResult.value;

  if (flags.get('help') === true || command.length === 0) {
    printHelp();
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  let cliOutputOverride: CliOutput | undefined;
  const outputFlag = flags.get('output');
  if (outputFlag !== undefined) {
    if (typeof outputFlag !== 'string') {
      await handleError(
        'Invalid --output value. Must be "human" or "json".',
        'INVALID_INPUT',
        'human',
      );
      return;
    }
    if (outputFlag !== 'human' && outputFlag !== 'json') {
      await handleError(
        'Invalid --output value. Must be "human" or "json".',
        'INVALID_INPUT',
        'human',
      );
      return;
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

  const configResult = loadConfig(new ProcessEnvReader(), overrides);
  if (!configResult.success) {
    const msg = getErrorMessage(configResult.error);
    if (cliOutputOverride === 'json') {
      console.log(renderJsonError(msg.code, msg.message, msg.details));
    } else {
      console.error(`Config error: ${msg.message}`);
    }
    process.exitCode = ExitCode.CONFIG_ERROR;
    return;
  }

  const config = configResult.value;
  const output = cliOutputOverride ?? config.cliOutput;

  if (command.length === 0) {
    printHelp();
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  const subcommand = command.join(' ');

  const allowedFlags = ALLOWED_FLAGS[subcommand];
  if (allowedFlags === undefined) {
    await handleError(`Unknown command: "${subcommand}".`, 'INVALID_INPUT', output);
    return;
  }

  for (const [name, value] of flags) {
    if (
      !(GLOBAL_FLAGS as readonly string[]).includes(name) &&
      !(allowedFlags as readonly string[]).includes(name)
    ) {
      await handleError(`Unknown flag: --${name}.`, 'INVALID_INPUT', output);
      return;
    }

    if (value === true && name !== 'help') {
      await handleError(`Flag --${name} requires a value.`, 'INVALID_INPUT', output);
      return;
    }
  }

  try {
    switch (subcommand) {
      case 'database migrate': {
        await runDatabaseMigrate(config, output, workspaceIdOverride);
        return;
      }

      case 'workspace initialize': {
        await runWorkspaceInitialize(config, output, workspaceIdOverride, flags);
        return;
      }

      case 'workspace show': {
        await runWorkspaceShow(config, output, workspaceIdOverride);
        return;
      }

      case 'playbook create': {
        await runPlaybookCreate(config, output, workspaceIdOverride, flags);
        return;
      }

      case 'playbook list': {
        await runPlaybookList(config, output, workspaceIdOverride, flags);
        return;
      }

      case 'playbook show': {
        await runPlaybookShow(config, output, workspaceIdOverride, flags);
        return;
      }

      default: {
        await handleError(`Unknown command: "${subcommand}".`, 'INVALID_INPUT', output);
        return;
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await handleError(message, 'UNEXPECTED_ERROR', output);
  }
}

async function runDatabaseMigrate(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
): Promise<void> {
  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
  }

  const services = servicesResult.value;
  try {
    const result = await services.migrate();
    if (!result.success) {
      await handleMigrationError(result.error, output);
      return;
    }

    if (result.value.appliedVersions.length === 0) {
      if (output === 'json') {
        console.log(renderJsonSuccess({ appliedVersions: [] }));
      } else {
        console.log('Migrations are up to date.');
      }
    } else {
      if (output === 'json') {
        console.log(renderJsonSuccess({ appliedVersions: result.value.appliedVersions }));
      } else {
        console.log(`Applied migrations: ${result.value.appliedVersions.join(', ')}`);
      }
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runWorkspaceInitialize(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
  flags: ReadonlyMap<string, string | boolean>,
): Promise<void> {
  const name = flags.get('name');
  if (typeof name !== 'string' || name.length === 0) {
    await handleError('--name is required', 'INVALID_INPUT', output);
    return;
  }

  const description = flags.get('description');
  const desc = typeof description === 'string' ? description : undefined;

  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
  }

  const services = servicesResult.value;
  try {
    const result = await services.initializeWorkspace.handle({
      name,
      ...(desc !== undefined ? { description: desc } : {}),
    });

    if (!result.success) {
      await handleUseCaseError(result.error, output);
      return;
    }

    if (output === 'json') {
      console.log(renderJsonSuccess(result.value));
    } else {
      console.log(renderWorkspaceInitialized(result.value));
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runWorkspaceShow(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
): Promise<void> {
  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
  }

  const services = servicesResult.value;
  try {
    const result = await services.getCurrentWorkspace.handle();

    if (!result.success) {
      await handleUseCaseError(result.error, output);
      return;
    }

    if (output === 'json') {
      console.log(renderJsonSuccess(result.value));
    } else {
      console.log(renderWorkspace(result.value));
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookCreate(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
  flags: ReadonlyMap<string, string | boolean>,
): Promise<void> {
  const name = flags.get('name');
  if (typeof name !== 'string' || name.length === 0) {
    await handleError('--name is required', 'INVALID_INPUT', output);
    return;
  }

  const description = flags.get('description');
  const desc = typeof description === 'string' ? description : undefined;

  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
  }

  const services = servicesResult.value;
  try {
    const result = await services.createPlaybook.handle({
      name,
      ...(desc !== undefined ? { description: desc } : {}),
    });

    if (!result.success) {
      await handleUseCaseError(result.error, output);
      return;
    }

    if (output === 'json') {
      console.log(renderJsonSuccess(result.value));
    } else {
      console.log(renderPlaybook(result.value));
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookList(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
  flags: ReadonlyMap<string, string | boolean>,
): Promise<void> {
  const statusFlag = flags.get('status');
  const status =
    typeof statusFlag === 'string'
      ? statusFlag === 'active' || statusFlag === 'archived'
        ? statusFlag
        : undefined
      : undefined;
  if (statusFlag !== undefined && status === undefined) {
    await handleError('--status must be "active" or "archived"', 'INVALID_INPUT', output);
    return;
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
      await handleError('--has-active-version must be "true" or "false"', 'INVALID_INPUT', output);
      return;
    }
  }

  const offsetRaw = flags.get('offset');
  const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : 0;
  if (!Number.isInteger(offset) || offset < 0) {
    await handleError('--offset must be a non-negative integer', 'INVALID_INPUT', output);
    return;
  }

  const limitRaw = flags.get('limit');
  const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    await handleError('--limit must be an integer between 1 and 100', 'INVALID_INPUT', output);
    return;
  }

  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
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
      await handleUseCaseError(result.error, output);
      return;
    }

    if (output === 'json') {
      console.log(
        renderJsonSuccess({
          items: result.value.items,
          offset: result.value.offset,
          limit: result.value.limit,
          hasMore: result.value.hasMore,
          totalCount: result.value.totalCount,
        }),
      );
    } else {
      console.log(renderPlaybookList(result.value));
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function runPlaybookShow(
  config: RawConfig,
  output: CliOutput,
  workspaceIdOverride: string | undefined,
  flags: ReadonlyMap<string, string | boolean>,
): Promise<void> {
  const id = flags.get('id');
  if (typeof id !== 'string' || id.length === 0) {
    await handleError('--id is required', 'INVALID_INPUT', output);
    return;
  }

  const servicesResult = buildServices(config, workspaceIdOverride);
  if (!servicesResult.success) {
    await handleStructuredError(servicesResult.error, output);
    return;
  }

  const services = servicesResult.value;
  try {
    const result = await services.getPlaybook.handle({
      playbookId: id,
    });

    if (!result.success) {
      await handleUseCaseError(result.error, output);
      return;
    }

    if (output === 'json') {
      console.log(renderJsonSuccess(result.value));
    } else {
      console.log(renderPlaybook(result.value));
    }

    process.exitCode = ExitCode.SUCCESS;
  } finally {
    await services.pool.close();
  }
}

async function handleError(message: string, errorCode: string, output: CliOutput): Promise<void> {
  if (output === 'json') {
    console.log(renderJsonError(errorCode, message, {}));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exitCode = mapErrorToExitCode(errorCode);
}

async function handleStructuredError(
  error: { kind: string; error: { code: string; message: string; details: unknown } },
  output: CliOutput,
): Promise<void> {
  if (output === 'json') {
    console.log(renderJsonError(error.error.code, error.error.message, error.error.details));
  } else {
    console.error(`Error: ${error.error.message}`);
  }
  process.exitCode = mapErrorToExitCode(error.error.code);
}

async function handleUseCaseError(
  error: { code: string; message: string; details?: unknown },
  output: CliOutput,
): Promise<void> {
  const msg = getErrorMessage(error);
  if (output === 'json') {
    console.log(renderJsonError(msg.code, msg.message, msg.details));
  } else {
    console.error(`Error: ${msg.message}`);
  }
  process.exitCode = mapErrorToExitCode(error.code);
}

async function handleMigrationError(
  error: { code: string; message: string },
  output: CliOutput,
): Promise<void> {
  if (output === 'json') {
    console.log(renderJsonError(error.code, 'Migration failed.', {}));
  } else {
    console.error('Error: Migration failed.');
  }
  process.exitCode = ExitCode.INFRASTRUCTURE_ERROR;
}

function printHelp(): void {
  console.log(`ai-playbook-engine CLI

Usage:
  database migrate                         Apply pending database migrations
  workspace initialize   --name <value>    Initialize the personal workspace
  workspace show                           Show current workspace details
  playbook create        --name <value>    Create a new playbook
  playbook list          [options]         List playbooks
  playbook show          --id <uuid>       Show playbook details

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
`);
}

await main();
