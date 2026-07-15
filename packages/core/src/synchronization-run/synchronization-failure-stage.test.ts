import { describe, expect, it } from 'vitest';

import { isSynchronizationFailureStage } from '../index.js';

describe('SynchronizationFailureStage', () => {
  const validStages: readonly string[] = [
    'initialization',
    'authentication',
    'retrieval',
    'pagination',
    'normalization',
    'snapshot_creation',
  ];

  it.each(validStages)('accepts %s', (stage) => {
    expect(isSynchronizationFailureStage(stage)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['uppercase Initialization', 'Initialization'],
    ['all uppercase RETRIEVAL', 'RETRIEVAL'],
    ['leading whitespace', ' retrieval'],
    ['trailing whitespace', 'retrieval '],
    ['hyphen variant', 'snapshot-creation'],
    ['camelCase variant', 'snapshotCreation'],
    ['unknown', 'unknown'],
  ])('rejects %s', (_label, value) => {
    expect(isSynchronizationFailureStage(value)).toBe(false);
  });

  it('narrows string to SynchronizationFailureStage', () => {
    const values: string[] = ['initialization', 'retrieval', 'bogus'];
    const typed = values.filter(isSynchronizationFailureStage);

    expect(typed.length).toBe(2);
  });
});
