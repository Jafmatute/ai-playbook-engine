import { describe, expect, it } from 'vitest';

import { normalizationStatuses, type NormalizationStatus } from '../index.js';

describe('NormalizationStatus', () => {
  it('contains exactly the four expected values', () => {
    const expected: readonly NormalizationStatus[] = ['pending', 'running', 'completed', 'failed'];

    expect([...normalizationStatuses]).toStrictEqual(expected);
  });

  it('is separate from PlaybookVersionStatus', () => {
    expect(normalizationStatuses).not.toContain('validated');
    expect(normalizationStatuses).not.toContain('published');
    expect(normalizationStatuses).not.toContain('archived');
  });

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(normalizationStatuses)).toBe(true);
  });
});
