import { describe, expect, it } from 'vitest';

import { parsePlaybookId, parseWorkspaceId, type PlaybookId, type WorkspaceId } from './index.js';
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
