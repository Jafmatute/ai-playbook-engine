import { describe, expect, it } from 'vitest';

import type { PlaybookOutput, PlaybookSourceOutput } from '@ai-playbook-engine/application';

import {
  renderWorkspace,
  renderWorkspaceInitialized,
  renderPlaybook,
  renderPlaybookList,
  renderPlaybookSource,
} from './human-renderer.js';

const sourceFixture: PlaybookSourceOutput = Object.freeze({
  playbookSourceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  workspaceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  playbookId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  type: 'notion',
  status: 'enabled',
  externalRootReference: 'notion-root-page',
  configurationReference: 'notion/main',
  createdAt: '2026-07-18T10:00:00.000Z',
  lastSuccessfulSynchronizationRunId: null,
  lastSuccessfulSynchronizationAt: null,
  lastFailedSynchronizationRunId: null,
  lastFailedSynchronizationAt: null,
});

function createSourceFixture(): PlaybookSourceOutput {
  return {
    ...sourceFixture,
    lastSuccessfulSynchronizationRunId: 'run-success',
    lastSuccessfulSynchronizationAt: '2026-07-18T11:00:00.000Z',
    lastFailedSynchronizationRunId: 'run-failed',
    lastFailedSynchronizationAt: '2026-07-18T12:00:00.000Z',
  };
}

describe('renderPlaybookSource', () => {
  it('renders all fields and null synchronization metadata as (none)', () => {
    const result = renderPlaybookSource(sourceFixture);
    expect(result).toContain('Playbook Source:');
    expect(result).toContain(`ID:                       ${sourceFixture.playbookSourceId}`);
    expect(result).toContain(`Playbook ID:              ${sourceFixture.playbookId}`);
    expect(result).toContain('Type:                     notion');
    expect(result).toContain('Status:                   enabled');
    expect(result).toContain('External Root Reference:  notion-root-page');
    expect(result).toContain('Configuration Reference:  notion/main');
    expect(result).toContain('Created At:               2026-07-18T10:00:00.000Z');
    expect(result).toContain('Last Successful Run ID:   (none)');
    expect(result).toContain('Last Successful At:       (none)');
    expect(result).toContain('Last Failed Run ID:       (none)');
    expect(result).toContain('Last Failed At:           (none)');
    expect(result.match(/\(none\)/g)).toHaveLength(4);
    expect(result).not.toMatch(/revision|token|credential|secret/i);
  });

  it('renders synchronization history and excludes sensitive fields', () => {
    const source = createSourceFixture();
    const result = renderPlaybookSource(source);
    expect(result).toContain('Last Successful Run ID:   run-success');
    expect(result).toContain('Last Successful At:       2026-07-18T11:00:00.000Z');
    expect(result).toContain('Last Failed Run ID:       run-failed');
    expect(result).toContain('Last Failed At:           2026-07-18T12:00:00.000Z');
    expect(result).not.toMatch(/revision|token|credential|secret/i);
    expect(result).not.toContain(sourceFixture.workspaceId);
    expect(source).toEqual(createSourceFixture());
  });
});

describe('renderWorkspace', () => {
  it('renders workspace details', () => {
    const result = renderWorkspace({
      workspaceId: 'abc-123',
      name: 'My Workspace',
      normalizedName: 'my workspace',
      status: 'active',
      description: 'A test workspace',
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).toContain('Workspace:');
    expect(result).toContain('ID:          abc-123');
    expect(result).toContain('Name:        My Workspace');
    expect(result).toContain('Status:      active');
    expect(result).toContain('Description: A test workspace');
    expect(result).toContain('Created At:  2026-07-17T12:00:00.000Z');
    expect(result).not.toContain('Archived At:');
  });

  it('renders null description as (none)', () => {
    const result = renderWorkspace({
      workspaceId: 'abc-123',
      name: 'No Desc',
      normalizedName: 'no desc',
      status: 'active',
      description: null,
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).toContain('Description: (none)');
  });

  it('renders archived workspace', () => {
    const result = renderWorkspace({
      workspaceId: 'abc-123',
      name: 'Archived',
      normalizedName: 'archived',
      status: 'archived',
      description: null,
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: '2026-07-18T12:00:00.000Z',
    });

    expect(result).toContain('Archived At: 2026-07-18T12:00:00.000Z');
  });

  it('renders workspace with null archivedAt', () => {
    const result = renderWorkspace({
      workspaceId: 'abc-123',
      name: 'Active',
      normalizedName: 'active',
      status: 'active',
      description: null,
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).not.toContain('Archived At:');
  });
});

describe('renderWorkspaceInitialized', () => {
  it('includes the environment variable hint', () => {
    const result = renderWorkspaceInitialized({
      workspaceId: 'abc-123',
      name: 'Test',
      normalizedName: 'test',
      status: 'active',
      description: null,
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).toContain('AI_PLAYBOOK_ENGINE_WORKSPACE_ID=abc-123');
  });
});

describe('renderPlaybook', () => {
  it('renders playbook details', () => {
    const result = renderPlaybook({
      playbookId: 'pb-123',
      workspaceId: 'ws-1',
      name: 'Test Playbook',
      normalizedName: 'test playbook',
      status: 'active',
      description: 'A test playbook',
      activeVersionId: 'v-1',
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).toContain('Playbook:');
    expect(result).toContain('pb-123');
    expect(result).toContain('Test Playbook');
    expect(result).toContain('active');
    expect(result).toContain('v-1');
  });

  it('renders null active version', () => {
    const result = renderPlaybook({
      playbookId: 'pb-456',
      workspaceId: 'ws-1',
      name: 'No Version',
      normalizedName: 'no version',
      status: 'active',
      description: null,
      activeVersionId: null,
      createdAt: '2026-07-17T12:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: null,
    });

    expect(result).toContain('Active Version ID: (none)');
  });

  it('renders archived playbook', () => {
    const result = renderPlaybook({
      playbookId: 'pb-789',
      workspaceId: 'ws-1',
      name: 'Archived',
      normalizedName: 'archived',
      status: 'archived',
      description: null,
      activeVersionId: null,
      createdAt: '2026-07-17T10:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: '2026-07-17T12:00:00.000Z',
    });

    expect(result).toContain('Archived At:');
  });
});

describe('renderPlaybookList', () => {
  it('renders "No playbooks found." when empty', () => {
    const page = Object.freeze({
      items: Object.freeze<readonly PlaybookOutput[]>([]),
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 0,
    });

    expect(renderPlaybookList(page)).toBe('No playbooks found.');
  });

  it('renders a table of playbooks', () => {
    const alpha: PlaybookOutput = Object.freeze({
      playbookId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      workspaceId: 'ws-1',
      name: 'Alpha',
      normalizedName: 'alpha',
      status: 'active',
      description: null,
      activeVersionId: 'v-abc123',
      createdAt: '2026-07-17T10:00:00.000Z',
      updatedAt: '2026-07-17T10:00:00.000Z',
      archivedAt: null,
    });

    const beta: PlaybookOutput = Object.freeze({
      playbookId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      workspaceId: 'ws-1',
      name: 'Beta',
      normalizedName: 'beta',
      status: 'archived',
      description: null,
      activeVersionId: null,
      createdAt: '2026-07-17T11:00:00.000Z',
      updatedAt: '2026-07-17T12:00:00.000Z',
      archivedAt: '2026-07-17T12:00:00.000Z',
    });

    const page = Object.freeze({
      items: Object.freeze([alpha, beta]),
      offset: 0,
      limit: 25,
      hasMore: false,
      totalCount: 2,
    });

    const result = renderPlaybookList(page);
    expect(result).toContain('Playbooks:');
    expect(result).toContain('ID');
    expect(result).toContain('Alpha');
    expect(result).toContain('Beta');
    expect(result).toContain('Page: 1-2 of 2');
  });

  it('renders pagination with unknown total count', () => {
    const alpha: PlaybookOutput = Object.freeze({
      playbookId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      workspaceId: 'ws-1',
      name: 'Alpha',
      normalizedName: 'alpha',
      status: 'active',
      description: null,
      activeVersionId: null,
      createdAt: '2026-07-17T10:00:00.000Z',
      updatedAt: '2026-07-17T10:00:00.000Z',
      archivedAt: null,
    });

    const page = Object.freeze({
      items: Object.freeze([alpha]),
      offset: 0,
      limit: 25,
      hasMore: true,
    });

    const result = renderPlaybookList(page);
    expect(result).toContain('Page: 1-1 of ?');
  });
});
