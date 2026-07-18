import { describe, expect, it } from 'vitest';

import { mapRowToWorkspace } from './index.js';
import type { Workspace } from '@ai-playbook-engine/core';
import type { WorkspaceRow } from './workspace-mapper.js';

const validUuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';
const timestamp = new Date('2024-01-15T10:30:00.000Z');

describe('mapRowToWorkspace', () => {
  it('maps a valid row to a Workspace', () => {
    const row: WorkspaceRow = {
      workspace_id: validUuid,
      name: 'My Workspace',
      normalized_name: 'my workspace',
      status: 'active',
      description: 'A test workspace',
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };

    const result = mapRowToWorkspace(row);

    expect(result).not.toBeNull();
    if (result !== null) {
      const workspace = result as Workspace;
      expect(workspace.id).toBe(validUuid);
      expect(workspace.status).toBe('active');
    }
  });

  it('returns null for an invalid row', () => {
    const row: WorkspaceRow = {
      workspace_id: '',
      name: 'My Workspace',
      normalized_name: 'my workspace',
      status: 'active',
      description: null,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };

    const result = mapRowToWorkspace(row);
    expect(result).toBeNull();
  });
});
