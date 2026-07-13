import { describe, expect, it } from 'vitest';

import { playbookVersionStatuses, type PlaybookVersionStatus } from '../index.js';

describe('PlaybookVersionStatus', () => {
  it('contains exactly the six expected values', () => {
    const expected: readonly PlaybookVersionStatus[] = [
      'draft',
      'validating',
      'validated',
      'invalid',
      'published',
      'archived',
    ];

    expect([...playbookVersionStatuses]).toStrictEqual(expected);
  });

  it('does not contain cancelled', () => {
    expect(playbookVersionStatuses).not.toContain('cancelled');
  });

  it('does not contain normalization status values', () => {
    expect(playbookVersionStatuses).not.toContain('pending');
    expect(playbookVersionStatuses).not.toContain('running');
    expect(playbookVersionStatuses).not.toContain('completed');
    expect(playbookVersionStatuses).not.toContain('failed');
  });

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(playbookVersionStatuses)).toBe(true);
  });
});
