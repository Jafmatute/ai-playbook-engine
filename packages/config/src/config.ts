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

export const DEFAULT_OUTPUT: CliOutput = 'human';

const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RawConfig {
  readonly environment: Environment;
  readonly databaseUrl: string | undefined;
  readonly workspaceId: string | undefined;
  readonly cliOutput: CliOutput;
}

export interface ConfigOverrides {
  readonly workspaceId?: string;
  readonly cliOutput?: CliOutput;
}

export interface DatabaseConfig {
  readonly connectionString: string;
}

export function loadConfig(
  reader: EnvReader,
  overrides?: ConfigOverrides,
): Result<RawConfig, ConfigurationInvalidError | ConfigurationMissingError> {
  const envResult = readEnvironment(reader);
  if (!envResult.success) {
    return envResult;
  }

  const dbUrlResult = readDatabaseUrl(reader);
  if (!dbUrlResult.success) {
    return dbUrlResult;
  }

  const workspaceIdResult = readWorkspaceId(reader);
  if (!workspaceIdResult.success) {
    return workspaceIdResult;
  }

  const outputResult = readOutput(reader);
  if (!outputResult.success) {
    return outputResult;
  }

  let effectiveWorkspaceId: string | undefined;
  if (overrides?.workspaceId !== undefined) {
    effectiveWorkspaceId = overrides.workspaceId.trim().toLowerCase();
    if (!isCanonicalUuid(effectiveWorkspaceId)) {
      return err(configurationInvalid(`AI_PLAYBOOK_ENGINE_WORKSPACE_ID must be a canonical UUID.`));
    }
  } else {
    effectiveWorkspaceId = workspaceIdResult.value;
  }

  const effectiveOutput = overrides?.cliOutput ?? outputResult.value;

  return ok(
    Object.freeze({
      environment: envResult.value,
      databaseUrl: dbUrlResult.value,
      workspaceId: effectiveWorkspaceId,
      cliOutput: effectiveOutput,
    }),
  );
}

export function requireDatabaseUrl(
  raw: RawConfig,
): Result<DatabaseConfig, ConfigurationMissingError> {
  if (raw.databaseUrl === undefined) {
    return err(configurationMissing('AI_PLAYBOOK_ENGINE_DATABASE_URL'));
  }

  const dbConfig: DatabaseConfig = Object.freeze({
    connectionString: raw.databaseUrl,
  });

  return ok(dbConfig);
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

  if (!isEnvironment(raw)) {
    return err(
      configurationInvalid(
        `AI_PLAYBOOK_ENGINE_ENV must be one of: ${VALID_ENVIRONMENTS.join(', ')}.`,
      ),
    );
  }

  return ok(raw);
}

function readDatabaseUrl(reader: EnvReader): Result<string | undefined, ConfigurationInvalidError> {
  const raw = reader.get(AI_PLAYBOOK_ENGINE_DATABASE_URL);
  if (raw === undefined || raw.length === 0) {
    return ok(undefined);
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return err(configurationInvalid(`AI_PLAYBOOK_ENGINE_DATABASE_URL must not be empty.`));
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      return err(
        configurationInvalid(
          `AI_PLAYBOOK_ENGINE_DATABASE_URL must use postgres: or postgresql: protocol.`,
        ),
      );
    }
  } catch {
    return err(configurationInvalid(`AI_PLAYBOOK_ENGINE_DATABASE_URL is not a valid URL.`));
  }

  return ok(trimmed);
}

function readWorkspaceId(reader: EnvReader): Result<string | undefined, ConfigurationInvalidError> {
  const raw = reader.get(AI_PLAYBOOK_ENGINE_WORKSPACE_ID);
  if (raw === undefined || raw.length === 0) {
    return ok(undefined);
  }

  const trimmed = raw.trim().toLowerCase();
  if (!isCanonicalUuid(trimmed)) {
    return err(configurationInvalid(`AI_PLAYBOOK_ENGINE_WORKSPACE_ID must be a canonical UUID.`));
  }

  return ok(trimmed);
}

function readOutput(reader: EnvReader): Result<CliOutput, ConfigurationInvalidError> {
  const raw = reader.get(AI_PLAYBOOK_ENGINE_CLI_OUTPUT);
  if (raw === undefined || raw.length === 0) {
    return ok(DEFAULT_OUTPUT);
  }

  if (!isCliOutput(raw)) {
    return err(configurationInvalid(`AI_PLAYBOOK_ENGINE_CLI_OUTPUT must be one of: human, json.`));
  }

  return ok(raw);
}

function isEnvironment(value: string): value is Environment {
  return value === 'development' || value === 'test' || value === 'production';
}

function isCliOutput(value: string): value is CliOutput {
  return value === 'human' || value === 'json';
}

function isCanonicalUuid(value: string): boolean {
  return CANONICAL_UUID_PATTERN.test(value);
}
