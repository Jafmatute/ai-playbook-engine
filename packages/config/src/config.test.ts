import { describe, expect, it } from 'vitest';

import {
  loadConfig,
  requireDatabaseUrl,
  requireWorkspaceId,
  AI_PLAYBOOK_ENGINE_ENV,
  AI_PLAYBOOK_ENGINE_DATABASE_URL,
  AI_PLAYBOOK_ENGINE_WORKSPACE_ID,
  AI_PLAYBOOK_ENGINE_CLI_OUTPUT,
  DEFAULT_ENVIRONMENT,
  DEFAULT_OUTPUT,
} from './index.js';
import { MapEnvReader } from './env-reader.js';
import { CONFIGURATION_INVALID, CONFIGURATION_MISSING } from './index.js';

describe('loadConfig', () => {
  it('defaults to development environment when AI_PLAYBOOK_ENGINE_ENV is not set', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.environment).toBe(DEFAULT_ENVIRONMENT);
    }
  });

  it('accepts valid environment "test"', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, 'test']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.environment).toBe('test');
    }
  });

  it('accepts valid environment "production"', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, 'production']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.environment).toBe('production');
    }
  });

  it('returns error for invalid environment', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, 'staging']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
    }
  });

  it('sets databaseUrl to undefined when not provided', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.databaseUrl).toBeUndefined();
    }
  });

  it('sets databaseUrl when provided', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgres://localhost:5432/db']]),
    );
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.databaseUrl).toBe('postgres://localhost:5432/db');
    }
  });

  it('allows workspaceId to be absent', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBeUndefined();
    }
  });

  it('loads workspaceId as string even if invalid', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, 'not-a-uuid']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBe('not-a-uuid');
    }
  });

  it('defaults cliOutput to human when not set', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.cliOutput).toBe(DEFAULT_OUTPUT);
    }
  });

  it('accepts valid output "json"', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_CLI_OUTPUT, 'json']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.cliOutput).toBe('json');
    }
  });

  it('returns error for invalid output', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_CLI_OUTPUT, 'xml']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
    }
  });
});

describe('requireDatabaseUrl', () => {
  it('returns URL when present', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgres://localhost:5432/db']]),
    );
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireDatabaseUrl(configResult.value);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('postgres://localhost:5432/db');
    }
  });

  it('returns error when URL is absent', () => {
    const reader = new MapEnvReader(new Map());
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireDatabaseUrl(configResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_MISSING);
      expect(result.error.details.variableName).toBe('AI_PLAYBOOK_ENGINE_DATABASE_URL');
    }
  });
});

describe('requireWorkspaceId', () => {
  it('returns workspace ID when present', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, 'de305d54-75b4-431b-adb2-eb6b9e546014']]),
    );
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireWorkspaceId(configResult.value);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('de305d54-75b4-431b-adb2-eb6b9e546014');
    }
  });

  it('returns error when workspace ID is absent', () => {
    const reader = new MapEnvReader(new Map());
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireWorkspaceId(configResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_MISSING);
      expect(result.error.details.variableName).toBe('AI_PLAYBOOK_ENGINE_WORKSPACE_ID');
    }
  });
});

describe('config object immutability', () => {
  it('returns frozen config objects', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });
});

describe('MapEnvReader', () => {
  it('injects test variables correctly', () => {
    const map = new Map<string, string>([
      [AI_PLAYBOOK_ENGINE_ENV, 'test'],
      [AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgres://test:5432/test'],
    ]);
    const reader = new MapEnvReader(map);

    expect(reader.get(AI_PLAYBOOK_ENGINE_ENV)).toBe('test');
    expect(reader.get(AI_PLAYBOOK_ENGINE_DATABASE_URL)).toBe('postgres://test:5432/test');
    expect(reader.get(AI_PLAYBOOK_ENGINE_WORKSPACE_ID)).toBeUndefined();
  });
});

describe('error objects', () => {
  it('returns frozen configuration invalid errors', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, 'invalid']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('returns frozen configuration missing errors', () => {
    const reader = new MapEnvReader(new Map());
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireDatabaseUrl(configResult.value);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });
});
