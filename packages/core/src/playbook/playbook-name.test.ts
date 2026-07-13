import { describe, expect, it } from 'vitest';

import { PlaybookName } from '../index.js';

function name(value: string): PlaybookName {
  const result = PlaybookName.create(value);
  if (!result.success) {
    throw new Error('Expected a valid playbook name fixture.');
  }

  return result.value;
}

describe('PlaybookName', () => {
  it('trims while preserving the display capitalization', () => {
    const result = name('  AI Engineering Hub  ');

    expect(result.value).toBe('AI Engineering Hub');
    expect(result.normalizedValue).toBe('ai engineering hub');
  });

  it.each(['', '   '])('rejects required names: %s', (value) => {
    expect(PlaybookName.create(value)).toMatchObject({
      success: false,
      error: { code: 'PLAYBOOK_NAME_REQUIRED' },
    });
  });

  it('accepts the exact maximum and rejects a longer value', () => {
    expect(PlaybookName.create('a'.repeat(160)).success).toBe(true);
    expect(PlaybookName.create('a'.repeat(161))).toMatchObject({
      success: false,
      error: {
        code: 'PLAYBOOK_NAME_INVALID',
        details: { maximumLength: 160, actualLength: 161 },
      },
    });
  });

  it('compares normalized values case-insensitively', () => {
    expect(name('AI Hub').equals(name('ai hub'))).toBe(true);
  });

  it('normalizes independently of locale', () => {
    const result = PlaybookName.create('İSTANBUL');
    if (!result.success) {
      throw new Error('Expected a valid name fixture.');
    }

    expect(result.value.normalizedValue).toBe('i̇stanbul');
  });
});
