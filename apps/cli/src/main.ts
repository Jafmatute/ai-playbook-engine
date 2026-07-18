import { ProcessEnvReader, loadConfig, type CliOutput } from '@ai-playbook-engine/config';

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

  let output: CliOutput = 'human';
  const outputFlag = flags.get('output');
  if (outputFlag !== undefined && typeof outputFlag === 'string') {
    if (outputFlag !== 'human' && outputFlag !== 'json') {
      console.error('Invalid --output value. Must be "human" or "json".');
      process.exitCode = ExitCode.INVALID_INPUT;
      return;
    }
    output = outputFlag as CliOutput;
  }

  const cliWorkspaceIdOverride = flags.get('workspace-id');
  const workspaceIdOverride =
    typeof cliWorkspaceIdOverride === 'string' ? cliWorkspaceIdOverride : undefined;

  const configResult = loadConfig(new ProcessEnvReader());
  if (!configResult.success) {
    const msg = getErrorMessage(configResult.error);
    if (output === 'json') {
      console.log(renderJsonError(msg.code, msg.message, msg.details));
    } else {
      console.error(`Config error: ${msg.message}`);
    }
    process.exitCode = ExitCode.CONFIG_ERROR;
    return;
  }

  const config = configResult.value;

  if (command.length === 0) {
    printHelp();
    process.exitCode = ExitCode.SUCCESS;
    return;
  }

  const subcommand = command.join(' ');

  try {
    switch (subcommand) {
      case 'database migrate': {
        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
          return;
        }

        const services = servicesResult.value;
        try {
          const result = await services.migrate();
          if (!result.success) {
            await handlePersistenceError(result.error, output);
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
        return;
      }

      case 'workspace initialize': {
        const name = flags.get('name');
        if (typeof name !== 'string' || name.length === 0) {
          await handleError('--name is required', 'INVALID_INPUT', output);
          return;
        }

        const description = flags.get('description');
        const desc = typeof description === 'string' ? description : undefined;

        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
          return;
        }

        const services = servicesResult.value;
        try {
          const initCmd: { name: string; description?: string } = { name };
          if (desc !== undefined) {
            initCmd.description = desc;
          }
          const result = await services.initializeWorkspace.handle(initCmd);

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
        return;
      }

      case 'workspace show': {
        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
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
        return;
      }

      case 'playbook create': {
        const name = flags.get('name');
        if (typeof name !== 'string' || name.length === 0) {
          await handleError('--name is required', 'INVALID_INPUT', output);
          return;
        }

        const description = flags.get('description');
        const desc = typeof description === 'string' ? description : undefined;

        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
          return;
        }

        const services = servicesResult.value;
        try {
          const createCmd: { name: string; description?: string } = { name };
          if (desc !== undefined) {
            createCmd.description = desc;
          }
          const result = await services.createPlaybook.handle(createCmd);

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
        return;
      }

      case 'playbook list': {
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
            await handleError(
              '--has-active-version must be "true" or "false"',
              'INVALID_INPUT',
              output,
            );
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
          await handleError(
            '--limit must be an integer between 1 and 100',
            'INVALID_INPUT',
            output,
          );
          return;
        }

        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
          return;
        }

        const services = servicesResult.value;
        try {
          const listQuery: {
            status?: 'active' | 'archived';
            namePrefix?: string;
            hasActiveVersion?: boolean;
            offset: number;
            limit: number;
          } = { offset, limit };
          if (status !== undefined) {
            listQuery.status = status;
          }
          if (prefix !== undefined) {
            listQuery.namePrefix = prefix;
          }
          if (hasActiveVersion !== undefined) {
            listQuery.hasActiveVersion = hasActiveVersion;
          }
          const result = await services.listPlaybooks.handle(listQuery);

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
        return;
      }

      case 'playbook show': {
        const id = flags.get('id');
        if (typeof id !== 'string' || id.length === 0) {
          await handleError('--id is required', 'INVALID_INPUT', output);
          return;
        }

        const servicesResult = buildServices(config, output, workspaceIdOverride);
        if (!servicesResult.success) {
          await handleError(servicesResult.error, 'CONFIGURATION_MISSING', output);
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

async function handleError(message: string, errorCode: string, output: CliOutput): Promise<void> {
  if (output === 'json') {
    console.log(renderJsonError(errorCode, message, {}));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exitCode = mapErrorToExitCode(errorCode);
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

async function handlePersistenceError(
  error: { code: string; message: string },
  output: CliOutput,
): Promise<void> {
  if (output === 'json') {
    console.log(renderJsonError(error.code, 'Persistence operation failed.', {}));
  } else {
    console.error('Error: Persistence operation failed.');
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
