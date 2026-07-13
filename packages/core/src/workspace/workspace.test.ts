import { describe, expect, it } from 'vitest';

import { Instant, parseWorkspaceId, Workspace, WorkspaceName } from '../index.js';

const workspaceId = parsedWorkspaceId('de305d54-75b4-431b-adb2-eb6b9e546014');

function parsedWorkspaceId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) {
    throw new Error('Expected a valid workspace identifier fixture.');
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

function name(value = 'Engineering Hub'): WorkspaceName {
  const result = WorkspaceName.create(value);
  if (!result.success) {
    throw new Error('Expected a valid workspace name fixture.');
  }

  return result.value;
}

function workspace(description?: string): Workspace {
  const input = {
    workspaceId,
    name: name(),
    createdAt: instant('2026-07-12T10:00:00Z'),
    ...(description === undefined ? {} : { description }),
  };
  const result = Workspace.create(input);
  if (!result.success) {
    throw new Error('Expected a valid workspace fixture.');
  }

  return result.value;
}

describe('Workspace', () => {
  it('creates an active workspace with canonical initial state', () => {
    const result = workspace();

    expect(result.status).toBe('active');
    expect(result.updatedAt.equals(result.createdAt)).toBe(true);
    expect(result.archivedAt).toBeNull();
    expect(result.description).toBeNull();
  });

  it('normalizes descriptions and rejects descriptions over 500 characters', () => {
    expect(workspace('  A focused workspace.  ').description).toBe('A focused workspace.');
    expect(workspace('   ').description).toBeNull();
    expect(
      Workspace.create({
        workspaceId,
        name: name(),
        description: 'a'.repeat(501),
        createdAt: instant('2026-07-12T10:00:00Z'),
      }),
    ).toMatchObject({ success: false, error: { code: 'WORKSPACE_DESCRIPTION_INVALID' } });
  });

  it('renames an active workspace without changing creation time', () => {
    const result = workspace();
    const renamedAt = instant('2026-07-12T11:00:00Z');

    expect(result.rename({ name: name('Platform'), updatedAt: renamedAt }).success).toBe(true);
    expect(result.name.value).toBe('Platform');
    expect(result.updatedAt).toBe(renamedAt);
    expect(result.createdAt.toString()).toBe('2026-07-12T10:00:00.000Z');
  });

  it('rejects a stale rename without mutating state', () => {
    const result = workspace();
    const before = result.toSnapshot();

    expect(
      result.rename({ name: name('Platform'), updatedAt: instant('2026-07-12T09:59:59Z') }),
    ).toMatchObject({ success: false, error: { code: 'WORKSPACE_STATE_INVALID' } });
    expect(result.toSnapshot()).toEqual(before);
  });

  it('archives an active workspace and rejects a second archive', () => {
    const result = workspace();
    const archivedAt = instant('2026-07-12T11:00:00Z');

    expect(result.archive({ archivedAt }).success).toBe(true);
    expect(result.status).toBe('archived');
    expect(result.archivedAt).toBe(archivedAt);
    expect(result.updatedAt).toBe(archivedAt);
    expect(result.archive({ archivedAt })).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_ALREADY_ARCHIVED' },
    });
  });

  it('rejects invalid archive and rename transitions without mutation', () => {
    const result = workspace();
    const before = result.toSnapshot();

    expect(result.archive({ archivedAt: instant('2026-07-12T09:00:00Z') })).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_STATE_INVALID' },
    });
    expect(result.toSnapshot()).toEqual(before);
    result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });
    const archived = result.toSnapshot();
    expect(
      result.rename({ name: name('Blocked'), updatedAt: instant('2026-07-12T12:00:00Z') }),
    ).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_OPERATION_NOT_ALLOWED' },
    });
    expect(result.toSnapshot()).toEqual(archived);
  });

  it('restores an archived workspace and rejects invalid restore timestamps', () => {
    const result = workspace();
    result.archive({ archivedAt: instant('2026-07-12T11:00:00Z') });
    const before = result.toSnapshot();

    expect(
      result.restoreFromArchive({ restoredAt: instant('2026-07-12T10:30:00Z') }),
    ).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_STATE_INVALID' },
    });
    expect(result.toSnapshot()).toEqual(before);
    expect(result.restoreFromArchive({ restoredAt: instant('2026-07-12T12:00:00Z') }).success).toBe(
      true,
    );
    expect(result.status).toBe('active');
    expect(result.archivedAt).toBeNull();
    expect(result.updatedAt.toString()).toBe('2026-07-12T12:00:00.000Z');
    expect(
      result.restoreFromArchive({ restoredAt: instant('2026-07-12T13:00:00Z') }),
    ).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_NOT_ARCHIVED' },
    });
  });

  it('restores valid active and archived persisted state without changing timestamps', () => {
    const createdAt = instant('2026-07-12T10:00:00Z');
    const archivedAt = instant('2026-07-12T11:00:00Z');

    const active = Workspace.restore({
      workspaceId,
      name: name(),
      status: 'active',
      description: null,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    });
    const archived = Workspace.restore({
      workspaceId,
      name: name(),
      status: 'archived',
      description: null,
      createdAt,
      updatedAt: archivedAt,
      archivedAt,
    });

    expect(active.success).toBe(true);
    expect(archived.success).toBe(true);
  });

  it('rejects inconsistent restored states and unknown status values', () => {
    const createdAt = instant('2026-07-12T10:00:00Z');
    const archivedAt = instant('2026-07-12T11:00:00Z');
    const base = { workspaceId, name: name(), description: null, createdAt, updatedAt: createdAt };

    expect(Workspace.restore({ ...base, status: 'active', archivedAt })).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_STATE_INVALID' },
    });
    expect(Workspace.restore({ ...base, status: 'archived', archivedAt: null })).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_STATE_INVALID' },
    });
    expect(
      Workspace.restore({
        ...base,
        status: 'archived',
        updatedAt: createdAt,
        archivedAt,
      }),
    ).toMatchObject({ success: false, error: { code: 'WORKSPACE_STATE_INVALID' } });
    expect(
      Workspace.restore({
        ...base,
        status: 'active',
        updatedAt: instant('2026-07-12T09:00:00Z'),
        archivedAt: null,
      }),
    ).toMatchObject({ success: false, error: { code: 'WORKSPACE_STATE_INVALID' } });
    expect(Workspace.restore({ ...base, status: 'unknown', archivedAt: null })).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_STATE_INVALID' },
    });
  });

  it('returns frozen independent canonical snapshots without technical fields', () => {
    const result = workspace('Description');
    const snapshot = result.toSnapshot();
    const copy = { ...snapshot, name: 'Changed' };

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(copy.name).toBe('Changed');
    expect(result.name.value).toBe('Engineering Hub');
    expect(Object.keys(snapshot).sort()).toEqual([
      'archivedAt',
      'createdAt',
      'description',
      'name',
      'normalizedName',
      'status',
      'updatedAt',
      'workspaceId',
    ]);
  });
});
