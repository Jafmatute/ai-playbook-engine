import { describe, expect, it } from 'vitest';

import type { PlaybookVersionSnapshot } from '../index.js';
import {
  fixturePlaybookVersionId,
  fixtureWorkspaceId,
  fixturePlaybookId,
  fixtureSnapshotId,
  versionLabel,
  createDraft,
  restoreValidPublished,
} from './playbook-version.test-fixtures.js';

describe('PlaybookVersion snapshot', () => {
  it('contains canonical IDs', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.playbookVersionId).toBe(fixturePlaybookVersionId);
    expect(snapshot.workspaceId).toBe(fixtureWorkspaceId);
    expect(snapshot.playbookId).toBe(fixturePlaybookId);
    expect(snapshot.synchronizationSnapshotId).toBe(fixtureSnapshotId);
  });

  it('converts versionSequence to number', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.versionSequence).toBe(1);
  });

  it('converts versionLabel to string or null', () => {
    const withLabel = createDraft({ versionLabel: versionLabel('test-label') });
    expect(withLabel.toSnapshot().versionLabel).toBe('test-label');

    const withoutLabel = createDraft({ versionLabel: null });
    expect(withoutLabel.toSnapshot().versionLabel).toBeNull();
  });

  it('includes structured sourceContentChecksum', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    expect(snapshot.sourceContentChecksum).toEqual({
      algorithm: 'sha256',
      value: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    });
  });

  it('includes validationSummary when present', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    expect(snapshot.validationSummary).not.toBeNull();
    expect(snapshot.validationSummary?.publicationEligible).toBe(true);
    expect(snapshot.validationSummary?.validatedContentChecksum.algorithm).toBe('sha256');
  });

  it('returns null validationSummary when absent', () => {
    const result = createDraft();
    expect(result.toSnapshot().validationSummary).toBeNull();
  });

  it('returns a new structure on each call', () => {
    const result = createDraft();
    const a = result.toSnapshot();
    const b = result.toSnapshot();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('mutating a nested copy does not modify the aggregate', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    const mutableSummary = { ...snapshot.validationSummary!, blockingFindingCount: 99 };
    const modified: PlaybookVersionSnapshot = { ...snapshot, validationSummary: mutableSummary };
    expect(result.toSnapshot().validationSummary?.blockingFindingCount).toBe(0);
    expect(modified.validationSummary?.blockingFindingCount).toBe(99);
  });

  it('does not contain technical fields', () => {
    const result = createDraft();
    const snapshot = result.toSnapshot();
    const keys = Object.keys(snapshot).sort();
    expect(keys).not.toContain('state');
    expect(keys).not.toContain('domainEvents');
    expect(keys).not.toContain('revision');
  });

  it('does not contain findings collection', () => {
    const result = restoreValidPublished();
    const snapshot = result.toSnapshot();
    expect((snapshot as unknown as Record<string, unknown>).validationFindings).toBeUndefined();
  });

  it('does not contain knowledge items', () => {
    const result = createDraft();
    const snapshotStr = JSON.stringify(result.toSnapshot());
    expect(snapshotStr).not.toContain('knowledgeItems');
    expect(snapshotStr).not.toContain('KnowledgeItems');
  });
});
