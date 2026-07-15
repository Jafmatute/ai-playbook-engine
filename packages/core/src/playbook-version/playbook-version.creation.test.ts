import { describe, expect, it } from 'vitest';

import { PlaybookVersion } from '../index.js';
import {
  fixturePlaybookVersionId,
  fixtureWorkspaceId,
  fixturePlaybookId,
  fixtureSnapshotId,
  versionSequence,
  versionLabel,
  parserVersion,
  normalizationSchemaVersion,
  contentChecksum,
  createDraft,
  instant,
  defaultNow,
} from './playbook-version.test-fixtures.js';

describe('PlaybookVersion creation', () => {
  it('creates a version in draft status', () => {
    const result = createDraft();
    expect(result.status).toBe('draft');
  });

  it('starts normalization as pending', () => {
    const result = createDraft();
    expect(result.normalizationStatus).toBe('pending');
  });

  it('starts with null normalizationAttemptId', () => {
    const result = createDraft();
    expect(result.normalizationAttemptId).toBeNull();
  });

  it('starts with null validationSummary', () => {
    const result = createDraft();
    expect(result.validationSummary).toBeNull();
  });

  it('starts with all processing timestamps as null', () => {
    const result = createDraft();
    expect(result.validationStartedAt).toBeNull();
    expect(result.validatedAt).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.archivedAt).toBeNull();
  });

  it('sets updatedAt equal to createdAt', () => {
    const result = createDraft();
    expect(result.updatedAt.equals(result.createdAt)).toBe(true);
  });

  it('preserves workspaceId', () => {
    const result = createDraft();
    expect(result.workspaceId).toBe(fixtureWorkspaceId);
  });

  it('preserves playbookId', () => {
    const result = createDraft();
    expect(result.playbookId).toBe(fixturePlaybookId);
  });

  it('preserves synchronizationSnapshotId', () => {
    const result = createDraft();
    expect(result.synchronizationSnapshotId).toBe(fixtureSnapshotId);
  });

  it('preserves versionSequence', () => {
    const result = createDraft();
    expect(result.versionSequence.value).toBe(1);
  });

  it('preserves versionLabel', () => {
    const result = createDraft({ versionLabel: versionLabel('v1-label') });
    expect(result.versionLabel?.value).toBe('v1-label');
  });

  it('accepts null versionLabel', () => {
    const result = createDraft({ versionLabel: null });
    expect(result.versionLabel).toBeNull();
  });

  it('preserves parser version', () => {
    const result = createDraft();
    expect(result.parserVersion.value).toBe('notion-parser/v1');
  });

  it('preserves normalization schema version', () => {
    const result = createDraft();
    expect(result.normalizationSchemaVersion.value).toBe('knowledge-schema/v1');
  });

  it('preserves source content checksum', () => {
    const result = createDraft();
    expect(result.sourceContentChecksum.algorithm).toBe('sha256');
    expect(result.sourceContentChecksum.value).toBe(
      'sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    );
  });

  it('does not generate IDs', () => {
    const result = PlaybookVersion.create({
      playbookVersionId: fixturePlaybookVersionId,
      workspaceId: fixtureWorkspaceId,
      playbookId: fixturePlaybookId,
      synchronizationSnapshotId: fixtureSnapshotId,
      versionSequence: versionSequence(),
      versionLabel: null,
      parserVersion: parserVersion(),
      normalizationSchemaVersion: normalizationSchemaVersion(),
      sourceContentChecksum: contentChecksum(),
      createdAt: defaultNow,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.id).toBe(fixturePlaybookVersionId);
    }
  });

  it('does not obtain current time', () => {
    const createdAt = instant('2026-07-12T10:00:00Z');
    const result = createDraft({ createdAt });
    expect(result.createdAt.toString()).toBe('2026-07-12T10:00:00.000Z');
  });

  it('does not produce events', () => {
    const result = createDraft();
    expect((result as unknown as { pullDomainEvents?: unknown }).pullDomainEvents).toBeUndefined();
  });
});
