import { describe, expect, it } from 'vitest';

import {
  parseNormalizationAttemptId,
  parsePlaybookId,
  parseSynchronizationSnapshotId,
  parseValidationAttemptId,
  parseWorkspaceId,
  type PlaybookId,
  type PlaybookVersionId,
  type WorkspaceId,
} from './index.js';
import * as core from './index.js';

const uuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';

describe('typed identifiers', () => {
  it('parses canonical UUIDs and normalizes uppercase values', () => {
    const workspace = parseWorkspaceId(uuid.toUpperCase());
    const playbook = parsePlaybookId(uuid);

    expect(workspace).toEqual({ success: true, value: uuid });
    expect(playbook).toEqual({ success: true, value: uuid });
  });

  it.each(['', ` ${uuid}`, `${uuid} `, 'not-a-uuid', 'de305d5475b4431badb2eb6b9e546014'])(
    'rejects invalid identifier input: %s',
    (rawValue) => {
      const result = parseWorkspaceId(rawValue);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'INVALID_IDENTIFIER',
          details: { expectedType: 'workspace_id' },
        });
      }
    },
  );

  it('keeps workspace and playbook identifiers distinct at compile time', () => {
    const workspaceResult = parseWorkspaceId(uuid);
    const playbookResult = parsePlaybookId(uuid);
    if (!workspaceResult.success || !playbookResult.success) {
      throw new Error('Fixture identifiers must be valid.');
    }

    const acceptsWorkspace = (_value: WorkspaceId): void => undefined;
    const acceptsPlaybook = (_value: PlaybookId): void => undefined;

    acceptsWorkspace(workspaceResult.value);
    acceptsPlaybook(playbookResult.value);
    // @ts-expect-error Identifier brands must not be interchangeable.
    acceptsWorkspace(playbookResult.value);
  });

  it('does not export an unsafe identifier constructor', () => {
    expect('createWorkspaceId' in core).toBe(false);
    expect('createPlaybookId' in core).toBe(false);
  });
});

describe('SynchronizationSnapshotId', () => {
  it('parses a valid UUID and normalizes lowercase', () => {
    const result = parseSynchronizationSnapshotId(uuid.toUpperCase());

    expect(result).toEqual({ success: true, value: uuid });
  });

  it.each(['', ` ${uuid}`, `${uuid} `, 'not-a-uuid', 'de305d5475b4431badb2eb6b9e546014'])(
    'rejects invalid input: %s',
    (rawValue) => {
      const result = parseSynchronizationSnapshotId(rawValue);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'INVALID_IDENTIFIER',
          details: { expectedType: 'synchronization_snapshot_id' },
        });
      }
    },
  );

  it('is incompatible with WorkspaceId at compile time', () => {
    const result = parseSynchronizationSnapshotId(uuid);
    if (!result.success) throw new Error('Fixture must be valid.');

    const acceptsWorkspace = (_value: WorkspaceId): void => undefined;
    // @ts-expect-error SynchronizationSnapshotId must not be assignable to WorkspaceId.
    acceptsWorkspace(result.value);
  });

  it('does not export an unsafe constructor', () => {
    expect('createSynchronizationSnapshotId' in core).toBe(false);
  });
});

describe('NormalizationAttemptId', () => {
  it('parses a valid UUID and normalizes lowercase', () => {
    const result = parseNormalizationAttemptId(uuid.toUpperCase());

    expect(result).toEqual({ success: true, value: uuid });
  });

  it.each(['', ` ${uuid}`, `${uuid} `, 'not-a-uuid'])('rejects invalid input: %s', (rawValue) => {
    const result = parseNormalizationAttemptId(rawValue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'INVALID_IDENTIFIER',
        details: { expectedType: 'normalization_attempt_id' },
      });
    }
  });

  it('is incompatible with PlaybookId at compile time', () => {
    const result = parseNormalizationAttemptId(uuid);
    if (!result.success) throw new Error('Fixture must be valid.');

    const acceptsPlaybook = (_value: PlaybookId): void => undefined;
    // @ts-expect-error NormalizationAttemptId must not be assignable to PlaybookId.
    acceptsPlaybook(result.value);
  });

  it('does not export an unsafe constructor', () => {
    expect('createNormalizationAttemptId' in core).toBe(false);
  });
});

describe('ValidationAttemptId', () => {
  it('parses a valid UUID and normalizes lowercase', () => {
    const result = parseValidationAttemptId(uuid.toUpperCase());

    expect(result).toEqual({ success: true, value: uuid });
  });

  it.each(['', ` ${uuid}`, `${uuid} `, 'not-a-uuid'])('rejects invalid input: %s', (rawValue) => {
    const result = parseValidationAttemptId(rawValue);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'INVALID_IDENTIFIER',
        details: { expectedType: 'validation_attempt_id' },
      });
    }
  });

  it('is incompatible with PlaybookVersionId at compile time', () => {
    const result = parseValidationAttemptId(uuid);
    if (!result.success) throw new Error('Fixture must be valid.');

    const acceptsVersion = (_value: PlaybookVersionId): void => undefined;
    // @ts-expect-error ValidationAttemptId must not be assignable to PlaybookVersionId.
    acceptsVersion(result.value);
  });

  it('does not export an unsafe constructor', () => {
    expect('createValidationAttemptId' in core).toBe(false);
  });
});
