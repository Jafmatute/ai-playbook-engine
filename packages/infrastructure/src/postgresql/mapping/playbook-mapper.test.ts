import { describe, expect, it } from 'vitest';

import { mapRowToPlaybook } from './index.js';
import type { Playbook } from '@ai-playbook-engine/core';

const validUuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';
const timestamp = '2024-01-15T10:30:00.000Z';

describe('mapRowToPlaybook', () => {
  it('maps a valid row to a Playbook', () => {
    const row: Record<string, unknown> = {
      playbook_id: validUuid,
      workspace_id: validUuid,
      name: 'My Playbook',
      status: 'active',
      description: 'A test playbook',
      active_version_id: null,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };

    const result = mapRowToPlaybook(row);

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Object);
    if (result !== null) {
      const playbook = result as Playbook;
      expect(playbook.id).toBe(validUuid);
      expect(playbook.status).toBe('active');
    }
  });

  it('returns null for an invalid row', () => {
    const row: Record<string, unknown> = {
      playbook_id: '',
      workspace_id: validUuid,
      name: 'My Playbook',
      status: 'active',
      description: null,
      active_version_id: null,
      created_at: timestamp,
      updated_at: timestamp,
      archived_at: null,
    };

    const result = mapRowToPlaybook(row);

    expect(result).toBeNull();
  });
});
