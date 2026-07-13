import { describe, expect, it } from 'vitest';

import { isNormalizationAttemptStatus, type NormalizationAttemptStatus } from '../index.js';

describe('NormalizationAttemptStatus', () => {
  it('accepts running', () => {
    expect(isNormalizationAttemptStatus('running')).toBe(true);
  });

  it('accepts completed', () => {
    expect(isNormalizationAttemptStatus('completed')).toBe(true);
  });

  it('accepts failed', () => {
    expect(isNormalizationAttemptStatus('failed')).toBe(true);
  });

  it('rejects pending', () => {
    expect(isNormalizationAttemptStatus('pending')).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(isNormalizationAttemptStatus('unknown')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isNormalizationAttemptStatus('')).toBe(false);
  });

  it('rejects uppercase variation', () => {
    expect(isNormalizationAttemptStatus('RUNNING')).toBe(false);
  });

  it('rejects leading or trailing whitespace', () => {
    expect(isNormalizationAttemptStatus(' running')).toBe(false);
    expect(isNormalizationAttemptStatus('running ')).toBe(false);
    expect(isNormalizationAttemptStatus(' running ')).toBe(false);
  });

  it('has exactly three possible values', () => {
    const expected: readonly NormalizationAttemptStatus[] = ['running', 'completed', 'failed'];

    expect(expected.length).toBe(3);
  });
});
