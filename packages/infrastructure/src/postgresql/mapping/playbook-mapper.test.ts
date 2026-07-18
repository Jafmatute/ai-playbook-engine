import { describe, expect, it } from 'vitest';

import { mapRowToPersistedPlaybook } from './index.js';
import type { PlaybookRow } from './playbook-mapper.js';

const validUuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';
const timestamp = new Date('2024-01-15T10:30:00.000Z');

function createRowFixture(overrides: Partial<PlaybookRow> = {}): PlaybookRow {
  return {
    playbook_id: validUuid,
    workspace_id: validUuid,
    name: 'My Playbook',
    normalized_name: 'my playbook',
    status: 'active',
    description: 'A test playbook',
    active_version_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null,
    revision: 1,
    ...overrides,
  };
}

describe('mapRowToPersistedPlaybook', () => {
  it('maps a valid row with revision 1 to PersistedAggregate', () => {
    const row = createRowFixture({ revision: 1 });
    const result = mapRowToPersistedPlaybook(row);

    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result.aggregate.id).toBe(validUuid);
      expect(result.aggregate.status).toBe('active');
      expect(result.revision.value).toBe(1);
    }
  });

  it('maps a valid row with revision > 1 to PersistedAggregate', () => {
    const row = createRowFixture({ revision: 42 });
    const result = mapRowToPersistedPlaybook(row);

    expect(result).not.toBeNull();
    if (result !== null) {
      expect(result.aggregate.id).toBe(validUuid);
      expect(result.revision.value).toBe(42);
    }
  });

  it('restored aggregate is correct and does not contain revision in its snapshot', () => {
    const row = createRowFixture({ revision: 5 });
    const result = mapRowToPersistedPlaybook(row);

    expect(result).not.toBeNull();
    if (result !== null) {
      const snapshot = result.aggregate.toSnapshot();
      expect((snapshot as Record<string, unknown>).revision).toBeUndefined();
    }
  });

  it('returns null when revision is 0', () => {
    const row = createRowFixture({ revision: 0 });
    const result = mapRowToPersistedPlaybook(row);
    expect(result).toBeNull();
  });

  it('returns null when revision is negative', () => {
    const row = createRowFixture({ revision: -10 });
    const result = mapRowToPersistedPlaybook(row);
    expect(result).toBeNull();
  });

  it('returns null when revision is fractional', () => {
    const row = createRowFixture({ revision: 2.5 });
    const result = mapRowToPersistedPlaybook(row);
    expect(result).toBeNull();
  });

  it('returns null when revision is NaN', () => {
    const row = createRowFixture({ revision: NaN });
    const result = mapRowToPersistedPlaybook(row);
    expect(result).toBeNull();
  });

  it('returns null when another field is corrupted', () => {
    const row = createRowFixture({ playbook_id: '' });
    const result = mapRowToPersistedPlaybook(row);
    expect(result).toBeNull();
  });
});
