import { describe, expect, it } from 'vitest';

import { isSynchronizationRunStatus } from '../index.js';

describe('SynchronizationRunStatus', () => {
  const validStatuses: readonly string[] = ['pending', 'running', 'completed', 'failed'];

  it.each(validStatuses)('accepts %s', (status) => {
    expect(isSynchronizationRunStatus(status)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Pending', 'Pending'],
    ['all uppercase RUNNING', 'RUNNING'],
    ['leading whitespace', ' pending'],
    ['trailing whitespace', 'pending '],
    ['truncated complete', 'complete'],
    ['success alias', 'success'],
    ['succeeded alias', 'succeeded'],
    ['failure alias', 'failure'],
    ['error alias', 'error'],
    ['cancelled', 'cancelled'],
    ['canceled', 'canceled'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(isSynchronizationRunStatus(value)).toBe(false);
  });

  it('narrows string to SynchronizationRunStatus', () => {
    const values: string[] = ['pending', 'running', 'bogus'];
    const typed = values.filter(isSynchronizationRunStatus);

    expect(typed.length).toBe(2);
  });
});
