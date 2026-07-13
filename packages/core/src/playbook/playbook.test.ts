import { describe, expect, it } from 'vitest';

import * as core from '../index.js';
import {
  Instant,
  parsePlaybookId,
  parsePlaybookVersionId,
  parseWorkspaceId,
  Playbook,
  PlaybookName,
  type PlaybookId,
  type PlaybookVersionId,
  type WorkspaceId,
} from '../index.js';

const workspaceId = parsedWorkspaceId('de305d54-75b4-431b-adb2-eb6b9e546014');
const playbookId = parsedPlaybookId('de305d54-75b4-431b-adb2-eb6b9e546015');
const versionId = parsedPlaybookVersionId('de305d54-75b4-431b-adb2-eb6b9e546016');
const versionId2 = parsedPlaybookVersionId('de305d54-75b4-431b-adb2-eb6b9e546017');

function parsedWorkspaceId(value: string): WorkspaceId {
  const result = parseWorkspaceId(value);
  if (!result.success) {
    throw new Error('Expected a valid workspace identifier fixture.');
  }

  return result.value;
}

function parsedPlaybookId(value: string): PlaybookId {
  const result = parsePlaybookId(value);
  if (!result.success) {
    throw new Error('Expected a valid playbook identifier fixture.');
  }

  return result.value;
}

function parsedPlaybookVersionId(value: string): PlaybookVersionId {
  const result = parsePlaybookVersionId(value);
  if (!result.success) {
    throw new Error('Expected a valid playbook version identifier fixture.');
  }

  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) {
    throw new Error('Expected a valid instant fixture.');
  }

  return result.value;
}

function name(value = 'AI Engineering Playbook'): PlaybookName {
  const result = PlaybookName.create(value);
  if (!result.success) {
    throw new Error('Expected a valid playbook name fixture.');
  }

  return result.value;
}

function playbook(description?: string): Playbook {
  const input = {
    playbookId,
    workspaceId,
    name: name(),
    createdAt: instant('2026-07-12T10:00:00Z'),
    ...(description === undefined ? {} : { description }),
  };
  const result = Playbook.create(input);
  if (!result.success) {
    throw new Error('Expected a valid playbook fixture.');
  }

  return result.value;
}

describe('Playbook', () => {
  it('creates an active playbook with canonical initial state', () => {
    const result = playbook();

    expect(result.status).toBe('active');
    expect(result.activeVersionId).toBeNull();
    expect(result.updatedAt.equals(result.createdAt)).toBe(true);
    expect(result.archivedAt).toBeNull();
    expect(result.description).toBeNull();
  });

  it('normalizes descriptions and rejects descriptions over 1000 characters', () => {
    expect(playbook('  A focused playbook.  ').description).toBe('A focused playbook.');
    expect(playbook('   ').description).toBeNull();
    expect(
      Playbook.create({
        playbookId,
        workspaceId,
        name: name(),
        description: 'a'.repeat(1001),
        createdAt: instant('2026-07-12T10:00:00Z'),
      }),
    ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_DESCRIPTION_INVALID' } });
  });

  it('does not generate time or identifiers internally', () => {
    const result = Playbook.create({
      playbookId,
      workspaceId,
      name: name(),
      createdAt: instant('2026-07-12T10:00:00Z'),
    });

    expect(result.success).toBe(true);
  });

  describe('restore', () => {
    it('restores valid active state without active version', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      const result = Playbook.restore({
        playbookId,
        workspaceId,
        name: name(),
        status: 'active',
        description: null,
        activeVersionId: null,
        createdAt,
        updatedAt: createdAt,
        archivedAt: null,
      });

      expect(result.success).toBe(true);
    });

    it('restores valid active state with an active version', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      const result = Playbook.restore({
        playbookId,
        workspaceId,
        name: name(),
        status: 'active',
        description: null,
        activeVersionId: versionId,
        createdAt,
        updatedAt: createdAt,
        archivedAt: null,
      });

      expect(result.success).toBe(true);
    });

    it('restores valid archived state preserving activeVersionId', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      const archivedAt = instant('2026-07-12T11:00:00Z');
      const result = Playbook.restore({
        playbookId,
        workspaceId,
        name: name(),
        status: 'archived',
        description: null,
        activeVersionId: versionId,
        createdAt,
        updatedAt: archivedAt,
        archivedAt,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.activeVersionId).toBe(versionId);
      }
    });

    it('rejects active playbook with archivedAt', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'active',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: createdAt,
          archivedAt: createdAt,
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });

    it('rejects archived playbook without archivedAt', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'archived',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });

    it('rejects archivedAt before createdAt', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'archived',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: createdAt,
          archivedAt: instant('2026-07-12T09:00:00Z'),
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });

    it('rejects updatedAt before createdAt', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'active',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: instant('2026-07-12T09:00:00Z'),
          archivedAt: null,
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });

    it('rejects updatedAt before archivedAt', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      const archivedAt = instant('2026-07-12T11:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'archived',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: createdAt,
          archivedAt,
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });

    it('rejects unknown status', () => {
      const createdAt = instant('2026-07-12T10:00:00Z');
      expect(
        Playbook.restore({
          playbookId,
          workspaceId,
          name: name(),
          status: 'unknown',
          description: null,
          activeVersionId: null,
          createdAt,
          updatedAt: createdAt,
          archivedAt: null,
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
    });
  });

  describe('rename', () => {
    it('renames an active playbook preserving IDs and active version', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });
      const renamedAt = instant('2026-07-12T11:00:00Z');

      expect(result.rename({ name: name('Platform'), updatedAt: renamedAt }).success).toBe(true);
      expect(result.name.value).toBe('Platform');
      expect(result.updatedAt).toBe(renamedAt);
      expect(result.activeVersionId).toBe(versionId);
      expect(result.createdAt.toString()).toBe('2026-07-12T10:00:00.000Z');
    });

    it('rejects rename when archived with operation detail', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });
      const before = result.toSnapshot();

      const renameResult = result.rename({
        name: name('Blocked'),
        updatedAt: instant('2026-07-12T12:00:00Z'),
      });
      expect(renameResult).toMatchObject({
        success: false,
        error: {
          code: 'PLAYBOOK_OPERATION_NOT_ALLOWED',
          details: { operation: 'rename' },
        },
      });
      expect(result.toSnapshot()).toEqual(before);
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      const before = result.toSnapshot();

      expect(
        result.rename({ name: name('Platform'), updatedAt: instant('2026-07-12T09:59:59Z') }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('updateDescription', () => {
    it('updates description and clears it to null', () => {
      const result = playbook();
      result.updateDescription({
        description: '  Updated description.  ',
        updatedAt: instant('2026-07-12T11:00:00Z'),
      });

      expect(result.description).toBe('Updated description.');
      result.updateDescription({ updatedAt: instant('2026-07-12T12:00:00Z') });
      expect(result.description).toBeNull();
    });

    it('rejects description over 1000 characters', () => {
      const result = playbook();
      expect(
        result.updateDescription({
          description: 'a'.repeat(1001),
          updatedAt: instant('2026-07-12T11:00:00Z'),
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_DESCRIPTION_INVALID' } });
    });

    it('rejects operation when archived with operation detail', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });

      expect(
        result.updateDescription({
          description: 'New',
          updatedAt: instant('2026-07-12T12:00:00Z'),
        }),
      ).toMatchObject({
        success: false,
        error: {
          code: 'PLAYBOOK_OPERATION_NOT_ALLOWED',
          details: { operation: 'update_description' },
        },
      });
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      const before = result.toSnapshot();

      expect(
        result.updateDescription({
          description: 'New',
          updatedAt: instant('2026-07-12T09:59:59Z'),
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('activateVersion', () => {
    it('activates the first version and returns null previous', () => {
      const result = playbook();
      const activatedAt = instant('2026-07-12T11:00:00Z');

      const activation = result.activateVersion({ playbookVersionId: versionId, activatedAt });
      expect(activation.success).toBe(true);
      if (!activation.success) return;
      expect(activation.value).toEqual({
        previousActiveVersionId: null,
        activeVersionId: versionId,
        changed: true,
      });
      expect(result.activeVersionId).toBe(versionId);
      expect(result.updatedAt).toBe(activatedAt);
    });

    it('replaces an active version returning the previous one', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });

      const activation = result.activateVersion({
        playbookVersionId: versionId2,
        activatedAt: instant('2026-07-12T11:00:00Z'),
      });
      expect(activation.success).toBe(true);
      if (!activation.success) return;
      expect(activation.value).toEqual({
        previousActiveVersionId: versionId,
        activeVersionId: versionId2,
        changed: true,
      });
    });

    it('returns changed false when activating the same version', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });
      const before = result.toSnapshot();

      const activation = result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T11:00:00Z'),
      });
      expect(activation.success).toBe(true);
      if (!activation.success) return;
      expect(activation.value.changed).toBe(false);
      expect(result.toSnapshot()).toEqual(before);
    });

    it('rejects operation when archived', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });

      expect(
        result.activateVersion({
          playbookVersionId: versionId,
          activatedAt: instant('2026-07-12T12:00:00Z'),
        }),
      ).toMatchObject({
        success: false,
        error: {
          code: 'PLAYBOOK_OPERATION_NOT_ALLOWED',
          details: { operation: 'activate_version' },
        },
      });
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      const before = result.toSnapshot();

      expect(
        result.activateVersion({
          playbookVersionId: versionId,
          activatedAt: instant('2026-07-12T09:59:59Z'),
        }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('clearActiveVersion', () => {
    it('clears an active version returning the previous one', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });

      const cleared = result.clearActiveVersion({ clearedAt: instant('2026-07-12T11:00:00Z') });
      expect(cleared.success).toBe(true);
      if (!cleared.success) return;
      expect(cleared.value).toEqual({
        previousActiveVersionId: versionId,
        activeVersionId: null,
        changed: true,
      });
      expect(result.activeVersionId).toBeNull();
    });

    it('returns changed false when already null', () => {
      const result = playbook();
      const before = result.toSnapshot();

      const cleared = result.clearActiveVersion({ clearedAt: instant('2026-07-12T11:00:00Z') });
      expect(cleared.success).toBe(true);
      if (!cleared.success) return;
      expect(cleared.value.changed).toBe(false);
      expect(result.toSnapshot()).toEqual(before);
    });

    it('rejects operation when archived', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });

      expect(
        result.clearActiveVersion({ clearedAt: instant('2026-07-12T12:00:00Z') }),
      ).toMatchObject({
        success: false,
        error: {
          code: 'PLAYBOOK_OPERATION_NOT_ALLOWED',
          details: { operation: 'clear_active_version' },
        },
      });
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });
      const before = result.toSnapshot();

      expect(
        result.clearActiveVersion({ clearedAt: instant('2026-07-12T10:00:00Z') }),
      ).toMatchObject({ success: false, error: { code: 'PLAYBOOK_STATE_INVALID' } });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('archive', () => {
    it('archives an active playbook preserving activeVersionId', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });
      const archivedAt = instant('2026-07-12T11:00:00Z');

      expect(result.archive({ archivedAt }).success).toBe(true);
      expect(result.status).toBe('archived');
      expect(result.archivedAt).toBe(archivedAt);
      expect(result.updatedAt).toBe(archivedAt);
      expect(result.activeVersionId).toBe(versionId);
    });

    it('rejects second archive', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });

      expect(result.archive({ archivedAt: instant('2026-07-12T12:00:00Z') })).toMatchObject({
        success: false,
        error: { code: 'PLAYBOOK_ALREADY_ARCHIVED' },
      });
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      const before = result.toSnapshot();

      expect(result.archive({ archivedAt: instant('2026-07-12T09:00:00Z') })).toMatchObject({
        success: false,
        error: { code: 'PLAYBOOK_STATE_INVALID' },
      });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('restoreFromArchive', () => {
    it('restores an archived playbook cleaning archivedAt and preserving activeVersionId', () => {
      const result = playbook();
      result.activateVersion({
        playbookVersionId: versionId,
        activatedAt: instant('2026-07-12T10:30:00Z'),
      });
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });

      expect(
        result.restoreFromArchive({ restoredAt: instant('2026-07-12T12:00:00Z') }).success,
      ).toBe(true);
      expect(result.status).toBe('active');
      expect(result.archivedAt).toBeNull();
      expect(result.activeVersionId).toBe(versionId);
    });

    it('rejects restore when already active', () => {
      const result = playbook();

      expect(
        result.restoreFromArchive({ restoredAt: instant('2026-07-12T11:00:00Z') }),
      ).toMatchObject({
        success: false,
        error: { code: 'PLAYBOOK_NOT_ARCHIVED' },
      });
    });

    it('rejects stale timestamp and preserves snapshot', () => {
      const result = playbook();
      result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });
      const before = result.toSnapshot();

      expect(
        result.restoreFromArchive({ restoredAt: instant('2026-07-12T10:30:00Z') }),
      ).toMatchObject({
        success: false,
        error: { code: 'PLAYBOOK_STATE_INVALID' },
      });
      expect(result.toSnapshot()).toEqual(before);
    });
  });

  describe('snapshot', () => {
    it('contains canonical representations with normalizedName', () => {
      const result = playbook('Description');
      const snapshot = result.toSnapshot();

      expect(snapshot.playbookId).toBe(playbookId);
      expect(snapshot.workspaceId).toBe(workspaceId);
      expect(snapshot.name).toBe('AI Engineering Playbook');
      expect(snapshot.normalizedName).toBe('ai engineering playbook');
      expect(snapshot.activeVersionId).toBeNull();
      expect(snapshot.archivedAt).toBeNull();
      expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
    });

    it('is a new independent structure', () => {
      const result = playbook();
      const snapshot = result.toSnapshot();
      const copy = { ...snapshot, name: 'Changed' };

      expect(copy.name).toBe('Changed');
      expect(result.name.value).toBe('AI Engineering Playbook');
    });

    it('does not include technical fields', () => {
      const result = playbook();
      const keys = Object.keys(result.toSnapshot()).sort();

      expect(keys).toEqual([
        'activeVersionId',
        'archivedAt',
        'createdAt',
        'description',
        'name',
        'normalizedName',
        'playbookId',
        'status',
        'updatedAt',
        'workspaceId',
      ]);
    });
  });

  describe('type safety', () => {
    it('does not export an unsafe identifier constructor', () => {
      expect('createPlaybookVersionId' in core).toBe(false);
    });

    it('ensures PlaybookVersionId is distinct from WorkspaceId and PlaybookId', () => {
      const wsResult = parseWorkspaceId('de305d54-75b4-431b-adb2-eb6b9e546014');
      const pbResult = parsePlaybookId('de305d54-75b4-431b-adb2-eb6b9e546015');
      const pvResult = parsePlaybookVersionId('de305d54-75b4-431b-adb2-eb6b9e546016');
      if (!wsResult.success || !pbResult.success || !pvResult.success) {
        throw new Error('Fixture identifiers must be valid.');
      }

      const acceptsWorkspace = (_value: WorkspaceId): void => undefined;
      const acceptsPlaybook = (_value: PlaybookId): void => undefined;
      const acceptsVersion = (_value: PlaybookVersionId): void => undefined;

      acceptsWorkspace(wsResult.value);
      acceptsPlaybook(pbResult.value);
      acceptsVersion(pvResult.value);
      // @ts-expect-error WorkspaceId must not be interchangeable with PlaybookId
      acceptsPlaybook(wsResult.value);
      // @ts-expect-error PlaybookId must not be interchangeable with PlaybookVersionId
      acceptsVersion(pbResult.value);
      // @ts-expect-error PlaybookVersionId must not be interchangeable with WorkspaceId
      acceptsWorkspace(pvResult.value);
    });
  });
});
