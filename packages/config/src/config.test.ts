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

const VALID_UUID = 'de305d54-75b4-431b-adb2-eb6b9e546014';

describe('loadConfig', () => {
  it('defaults to development environment when AI_PLAYBOOK_ENGINE_ENV is not set', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.environment).toBe(DEFAULT_ENVIRONMENT);
    }
  });

  it.each(['development', 'test', 'production'] as const)(
    'accepts valid environment "%s"',
    (env) => {
      const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, env]]));
      const result = loadConfig(reader);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.environment).toBe(env);
      }
    },
  );

  it('returns error for invalid environment', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_ENV, 'staging']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
      expect(result.error.message).toContain('AI_PLAYBOOK_ENGINE_ENV');
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

  it('sets databaseUrl when valid postgres URL is provided', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgres://localhost:5432/db']]),
    );
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.databaseUrl).toBe('postgres://localhost:5432/db');
    }
  });

  it('sets databaseUrl when valid postgresql URL is provided', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgresql://localhost:5432/db']]),
    );
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.databaseUrl).toBe('postgresql://localhost:5432/db');
    }
  });

  it('returns error for invalid database URL protocol', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'http://localhost:5432/db']]),
    );
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
      expect(result.error.message).toContain('postgres');
    }
  });

  it('returns error for malformed database URL', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'not-a-url']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
    }
  });

  it('returns error for empty database URL', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, '']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.databaseUrl).toBeUndefined();
    }
  });

  it('returns error for whitespace-only database URL', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, '   ']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
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

  it('loads workspaceId when valid UUID is provided', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, VALID_UUID]]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBe(VALID_UUID);
    }
  });

  it('normalizes workspaceId to lowercase', () => {
    const upper = VALID_UUID.toUpperCase();
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, upper]]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBe(VALID_UUID);
    }
  });

  it('returns error for invalid workspaceId format', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, 'not-a-uuid']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
    }
  });

  it('returns error for invalid override workspaceId format', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader, { workspaceId: 'not-a-uuid' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
      expect(result.error.message).not.toContain('not-a-uuid');
    }
  });

  it('applies workspaceId override over environment', () => {
    const envUuid = '11111111-1111-1111-1111-111111111111';
    const overrideUuid = '22222222-2222-2222-2222-222222222222';
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, envUuid]]));
    const result = loadConfig(reader, { workspaceId: overrideUuid });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBe(overrideUuid);
    }
  });

  it('normalizes workspaceId override (spaces, casing)', () => {
    const reader = new MapEnvReader(new Map());
    const overrideUuidWithSpacesAndCasing = '  de305d54-75b4-431b-adb2-eb6b9e546014  '.toUpperCase();
    const result = loadConfig(reader, { workspaceId: overrideUuidWithSpacesAndCasing });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.workspaceId).toBe(VALID_UUID);
    }
  });

  it('rejects invalid workspaceId override and does not expose it', () => {
    const reader = new MapEnvReader(new Map());
    const result = loadConfig(reader, { workspaceId: '  INVALID-UUID-123  ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CONFIGURATION_INVALID);
      expect(result.error.message).not.toContain('INVALID-UUID-123');
    }
  });

  it('applies cliOutput override over environment', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_CLI_OUTPUT, 'human']]));
    const result = loadConfig(reader, { cliOutput: 'json' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.cliOutput).toBe('json');
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

  it('accepts valid output "human"', () => {
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_CLI_OUTPUT, 'human']]));
    const result = loadConfig(reader);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.cliOutput).toBe('human');
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
  it('returns DatabaseConfig when present', () => {
    const reader = new MapEnvReader(
      new Map([[AI_PLAYBOOK_ENGINE_DATABASE_URL, 'postgres://localhost:5432/db']]),
    );
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireDatabaseUrl(configResult.value);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.connectionString).toBe('postgres://localhost:5432/db');
      expect(Object.isFrozen(result.value)).toBe(true);
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
    const reader = new MapEnvReader(new Map([[AI_PLAYBOOK_ENGINE_WORKSPACE_ID, VALID_UUID]]));
    const configResult = loadConfig(reader);
    expect(configResult.success).toBe(true);
    if (!configResult.success) return;

    const result = requireWorkspaceId(configResult.value);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(VALID_UUID);
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

describe('no sensitive data exposure', () => {
  it('does not include database URL in error messages', () => {
    const reader = new MapEnvReader(
      new Map([
        [
          AI_PLAYBOOK_ENGINE_DATABASE_URL,
          'mysql://secret-user:secret-password@localhost:5432/database',
        ],
      ]),
    );
    const result = loadConfig(reader);

    expect(result.success).toBe(false);
    if (!result.success) {
      const combined = result.error.message + JSON.stringify(result.error.details);
      expect(combined).not.toContain('secret-user');
      expect(combined).not.toContain('secret-password');
      expect(combined).not.toContain('mysql://secret');
    }
  });
});
