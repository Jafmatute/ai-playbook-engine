import { describe, expect, it } from 'vitest';

import { WorkspaceName } from '../index.js';

function name(value: string): WorkspaceName {
  const result = WorkspaceName.create(value);
  if (!result.success) {
    throw new Error('Expected a valid workspace name fixture.');
  }

  return result.value;
}

describe('WorkspaceName', () => {
  it('trims while preserving the display capitalization', () => {
    const result = name('  Engineering Hub  ');

    expect(result.value).toBe('Engineering Hub');
    expect(result.normalizedValue).toBe('engineering hub');
  });

  it.each(['', '   '])('rejects required names: %s', (value) => {
    expect(WorkspaceName.create(value)).toMatchObject({
      success: false,
      error: { code: 'WORKSPACE_NAME_REQUIRED' },
    });
  });

  it('accepts the exact maximum and rejects a longer value', () => {
    expect(WorkspaceName.create('a'.repeat(120)).success).toBe(true);
    expect(WorkspaceName.create('a'.repeat(121))).toMatchObject({
      success: false,
      error: {
        code: 'WORKSPACE_NAME_INVALID',
        details: { maximumLength: 120, actualLength: 121 },
      },
    });
  });

  it('compares normalized values case-insensitively', () => {
    expect(name('Engineering Hub').equals(name('engineering hub'))).toBe(true);
  });
});
