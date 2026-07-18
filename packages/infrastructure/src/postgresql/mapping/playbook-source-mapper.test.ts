import { describe, expect, it } from 'vitest';

import { mapRowToPlaybookSource } from './playbook-source-mapper.js';
import type { PlaybookSourceRow } from './playbook-source-mapper.js';

const sourceId = '11111111-1111-1111-1111-111111111111';
const workspaceId = '22222222-2222-2222-2222-222222222222';
const playbookId = '33333333-3333-3333-3333-333333333333';
const successfulRunId = '44444444-4444-4444-4444-444444444444';
const failedRunId = '55555555-5555-5555-5555-555555555555';
const createdAt = new Date('2026-07-01T10:00:00.000Z');

function row(overrides: Partial<PlaybookSourceRow> = {}): PlaybookSourceRow {
  return {
    playbook_source_id: sourceId,
    workspace_id: workspaceId,
    playbook_id: playbookId,
    type: 'notion',
    status: 'enabled',
    external_root_reference: 'root-page',
    configuration_reference: 'configuration-key',
    created_at: createdAt,
    last_successful_synchronization_run_id: null,
    last_successful_synchronization_at: null,
    last_failed_synchronization_run_id: null,
    last_failed_synchronization_at: null,
    ...overrides,
  };
}

describe('mapRowToPlaybookSource', () => {
  it('maps valid enabled, disabled, and synchronization-history rows', () => {
    const enabled = mapRowToPlaybookSource(row());
    const disabled = mapRowToPlaybookSource(row({ status: 'disabled' }));
    const successful = mapRowToPlaybookSource(
      row({
        last_successful_synchronization_run_id: successfulRunId,
        last_successful_synchronization_at: new Date('2026-07-01T11:00:00.000Z'),
      }),
    );
    const failed = mapRowToPlaybookSource(
      row({
        last_failed_synchronization_run_id: failedRunId,
        last_failed_synchronization_at: new Date('2026-07-01T12:00:00.000Z'),
      }),
    );
    const both = mapRowToPlaybookSource(
      row({
        last_successful_synchronization_run_id: successfulRunId,
        last_successful_synchronization_at: new Date('2026-07-01T11:00:00.000Z'),
        last_failed_synchronization_run_id: failedRunId,
        last_failed_synchronization_at: new Date('2026-07-01T12:00:00.000Z'),
      }),
    );
    expect(enabled?.toSnapshot()).toEqual({
      playbookSourceId: sourceId,
      workspaceId,
      playbookId,
      type: 'notion',
      status: 'enabled',
      externalRootReference: 'root-page',
      configurationReference: 'configuration-key',
      createdAt: '2026-07-01T10:00:00.000Z',
      lastSuccessfulSynchronizationRunId: null,
      lastSuccessfulSynchronizationAt: null,
      lastFailedSynchronizationRunId: null,
      lastFailedSynchronizationAt: null,
    });
    expect(disabled?.status).toBe('disabled');
    expect(successful?.lastSuccessfulSynchronizationRunId).toBe(successfulRunId);
    expect(failed?.lastFailedSynchronizationRunId).toBe(failedRunId);
    expect(both?.toSnapshot().lastSuccessfulSynchronizationRunId).toBe(successfulRunId);
    expect(both?.toSnapshot().lastFailedSynchronizationRunId).toBe(failedRunId);
  });

  it.each([
    ['invalid source id', row({ playbook_source_id: 'bad' })],
    ['invalid workspace id', row({ workspace_id: 'bad' })],
    ['invalid playbook id', row({ playbook_id: 'bad' })],
    ['unknown type', row({ type: 'other' })],
    ['unknown status', row({ status: 'other' })],
    ['empty external root', row({ external_root_reference: '' })],
    ['noncanonical external root', row({ external_root_reference: ' root-page ' })],
    ['empty configuration', row({ configuration_reference: '' })],
    ['noncanonical configuration', row({ configuration_reference: ' configuration-key ' })],
    ['invalid created date', row({ created_at: new Date('invalid') })],
    [
      'invalid success run',
      row({
        last_successful_synchronization_run_id: 'bad',
        last_successful_synchronization_at: createdAt,
      }),
    ],
    [
      'invalid failed run',
      row({ last_failed_synchronization_run_id: 'bad', last_failed_synchronization_at: createdAt }),
    ],
    [
      'success run without timestamp',
      row({ last_successful_synchronization_run_id: successfulRunId }),
    ],
    ['success timestamp without run', row({ last_successful_synchronization_at: createdAt })],
    ['failed run without timestamp', row({ last_failed_synchronization_run_id: failedRunId })],
    ['failed timestamp without run', row({ last_failed_synchronization_at: createdAt })],
    [
      'success before creation',
      row({
        last_successful_synchronization_run_id: successfulRunId,
        last_successful_synchronization_at: new Date('2026-06-30T10:00:00.000Z'),
      }),
    ],
    [
      'failure before creation',
      row({
        last_failed_synchronization_run_id: failedRunId,
        last_failed_synchronization_at: new Date('2026-06-30T10:00:00.000Z'),
      }),
    ],
    [
      'same run outcome',
      row({
        last_successful_synchronization_run_id: successfulRunId,
        last_successful_synchronization_at: createdAt,
        last_failed_synchronization_run_id: successfulRunId,
        last_failed_synchronization_at: createdAt,
      }),
    ],
  ])('returns null for %s', (_name, invalidRow) => {
    expect(mapRowToPlaybookSource(invalidRow)).toBeNull();
  });
});
