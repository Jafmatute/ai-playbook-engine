import { describe, expect, it } from 'vitest';

import { ExitCode } from './exit-codes.js';

describe('ExitCode', () => {
  it('SUCCESS is 0', () => {
    expect(ExitCode.SUCCESS).toBe(0);
  });

  it('UNEXPECTED_ERROR is 1', () => {
    expect(ExitCode.UNEXPECTED_ERROR).toBe(1);
  });

  it('INVALID_INPUT is 2', () => {
    expect(ExitCode.INVALID_INPUT).toBe(2);
  });

  it('NOT_FOUND is 3', () => {
    expect(ExitCode.NOT_FOUND).toBe(3);
  });

  it('CONFLICT is 4', () => {
    expect(ExitCode.CONFLICT).toBe(4);
  });

  it('CONFIG_ERROR is 5', () => {
    expect(ExitCode.CONFIG_ERROR).toBe(5);
  });

  it('INFRASTRUCTURE_ERROR is 6', () => {
    expect(ExitCode.INFRASTRUCTURE_ERROR).toBe(6);
  });
});
