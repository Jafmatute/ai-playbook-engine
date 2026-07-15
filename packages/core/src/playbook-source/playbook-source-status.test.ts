import { describe, expect, it } from 'vitest';

import { isPlaybookSourceStatus } from '../index.js';

describe('PlaybookSourceStatus', () => {
  const validStatuses: readonly string[] = ['enabled', 'disabled'];

  it.each(validStatuses)('accepts %s', (status) => {
    expect(isPlaybookSourceStatus(status)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['active', 'active'],
    ['inactive', 'inactive'],
    ['pending', 'pending'],
    ['running', 'running'],
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['uppercase Enabled', 'Enabled'],
    ['all uppercase DISABLED', 'DISABLED'],
    ['leading whitespace', ' enabled'],
    ['trailing whitespace', 'disabled '],
  ])('rejects %s', (_label, value) => {
    expect(isPlaybookSourceStatus(value)).toBe(false);
  });

  it('narrows string to PlaybookSourceStatus', () => {
    const values: string[] = ['enabled', 'disabled', 'bogus'];
    const typed = values.filter(isPlaybookSourceStatus);

    expect(typed.length).toBe(2);
  });
});
