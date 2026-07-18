import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Environment } from './environment.js';
import { DEFAULT_ENVIRONMENT, VALID_ENVIRONMENTS } from './environment.js';
import type { EnvReader } from './env-reader.js';
import {
  configurationInvalid,
  configurationMissing,
  type ConfigurationInvalidError,
  type ConfigurationMissingError,
} from './config-errors.js';

export const AI_PLAYBOOK_ENGINE_ENV = 'AI_PLAYBOOK_ENGINE_ENV';
export const AI_PLAYBOOK_ENGINE_DATABASE_URL = 'AI_PLAYBOOK_ENGINE_DATABASE_URL';
export const AI_PLAYBOOK_ENGINE_WORKSPACE_ID = 'AI_PLAYBOOK_ENGINE_WORKSPACE_ID';
export const AI_PLAYBOOK_ENGINE_CLI_OUTPUT = 'AI_PLAYBOOK_ENGINE_CLI_OUTPUT';

export type CliOutput = 'human' | 'json';

export const VALID_OUTPUTS: CliOutput[] = ['human', 'json'];
export const DEFAULT_OUTPUT: CliOutput = 'human';

export interface RawConfig {
  readonly environment: Environment;
  readonly databaseUrl: string | undefined;
  readonly workspaceId: string | undefined;
  readonly cliOutput: CliOutput;
}

export function loadConfig(
  reader: EnvReader,
): Result<RawConfig, ConfigurationInvalidError | ConfigurationMissingError> {
  const envResult = readEnvironment(reader);
  if (!envResult.success) {
    return envResult;
  }

  const databaseUrl = reader.get(AI_PLAYBOOK_ENGINE_DATABASE_URL);

  const workspaceId = reader.get(AI_PLAYBOOK_ENGINE_WORKSPACE_ID);

  const outputResult = readOutput(reader);
  if (!outputResult.success) {
    return outputResult;
  }

  return ok(
    Object.freeze({
      environment: envResult.value,
      databaseUrl: databaseUrl !== undefined && databaseUrl.length > 0 ? databaseUrl : undefined,
      workspaceId: workspaceId !== undefined && workspaceId.length > 0 ? workspaceId : undefined,
      cliOutput: outputResult.value,
    }),
  );
}

export function requireDatabaseUrl(raw: RawConfig): Result<string, ConfigurationMissingError> {
  if (raw.databaseUrl === undefined) {
    return err(configurationMissing('AI_PLAYBOOK_ENGINE_DATABASE_URL'));
  }

  return ok(raw.databaseUrl);
}

export function requireWorkspaceId(raw: RawConfig): Result<string, ConfigurationMissingError> {
  if (raw.workspaceId === undefined) {
    return err(configurationMissing('AI_PLAYBOOK_ENGINE_WORKSPACE_ID'));
  }

  return ok(raw.workspaceId);
}

function readEnvironment(reader: EnvReader): Result<Environment, ConfigurationInvalidError> {
  const raw = reader.get(AI_PLAYBOOK_ENGINE_ENV);
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_ENVIRONMENT);
  }

  if (!(VALID_ENVIRONMENTS as readonly string[]).includes(raw)) {
    return err(
      configurationInvalid(
        `AI_PLAYBOOK_ENGINE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}. Received: "${raw}".`,
      ),
    );
  }

  return ok(raw as Environment);
}

function readOutput(reader: EnvReader): Result<CliOutput, ConfigurationInvalidError> {
  const raw = reader.get(AI_PLAYBOOK_ENGINE_CLI_OUTPUT);
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_OUTPUT);
  }

  if (!(VALID_OUTPUTS as readonly string[]).includes(raw)) {
    return err(
      configurationInvalid(
        `AI_PLAYBOOK_ENGINE_CLI_OUTPUT must be one of: ${VALID_OUTPUTS.join(', ')}. Received: "${raw}".`,
      ),
    );
  }

  return ok(raw as CliOutput);
}
