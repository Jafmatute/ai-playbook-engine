import { describe, expect, it } from 'vitest';

import { isValidationAttemptStatus } from '../index.js';

describe('ValidationAttemptStatus', () => {
  it('accepts running', () => {
    expect(isValidationAttemptStatus('running')).toBe(true);
  });

  it('accepts validated', () => {
    expect(isValidationAttemptStatus('validated')).toBe(true);
  });

  it('accepts invalid', () => {
    expect(isValidationAttemptStatus('invalid')).toBe(true);
  });

  it('rejects pending', () => {
    expect(isValidationAttemptStatus('pending')).toBe(false);
  });

  it('rejects validating', () => {
    expect(isValidationAttemptStatus('validating')).toBe(false);
  });

  it('rejects completed', () => {
    expect(isValidationAttemptStatus('completed')).toBe(false);
  });

  it('rejects failed', () => {
    expect(isValidationAttemptStatus('failed')).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(isValidationAttemptStatus('unknown')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidationAttemptStatus('')).toBe(false);
  });

  it('rejects uppercase Running', () => {
    expect(isValidationAttemptStatus('Running')).toBe(false);
  });

  it('rejects uppercase VALIDATED', () => {
    expect(isValidationAttemptStatus('VALIDATED')).toBe(false);
  });

  it('rejects leading whitespace', () => {
    expect(isValidationAttemptStatus(' running')).toBe(false);
  });

  it('rejects trailing whitespace', () => {
    expect(isValidationAttemptStatus('running ')).toBe(false);
  });
});
