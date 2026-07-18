import { describe, expect, it } from 'vitest';
import { PersistenceRevision, PERSISTENCE_REVISION_INVALID } from './persistence-revision.js';

describe('PersistenceRevision', () => {
  it('accepts 1 and returns a valid revision', () => {
    const result = PersistenceRevision.from(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(1);
    }
  });

  it('accepts large positive safe integer', () => {
    const result = PersistenceRevision.from(9007199254740991);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(9007199254740991);
    }
  });

  it('conserves the value', () => {
    const result = PersistenceRevision.from(42);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe(42);
    }
  });

  it('compares equal revisions correctly', () => {
    const r1 = PersistenceRevision.from(5);
    const r2 = PersistenceRevision.from(5);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (r1.success && r2.success) {
      expect(r1.value.equals(r2.value)).toBe(true);
    }
  });

  it('compares different revisions correctly', () => {
    const r1 = PersistenceRevision.from(5);
    const r2 = PersistenceRevision.from(6);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (r1.success && r2.success) {
      expect(r1.value.equals(r2.value)).toBe(false);
    }
  });

  it('rejects 0', () => {
    const result = PersistenceRevision.from(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(PERSISTENCE_REVISION_INVALID);
      expect(result.error.details.reason).toBe('NOT_POSITIVE_SAFE_INTEGER');
    }
  });

  it('rejects negative numbers', () => {
    const result = PersistenceRevision.from(-5);
    expect(result.success).toBe(false);
  });

  it('rejects fractional numbers', () => {
    const result = PersistenceRevision.from(1.5);
    expect(result.success).toBe(false);
  });

  it('rejects NaN', () => {
    const result = PersistenceRevision.from(NaN);
    expect(result.success).toBe(false);
  });

  it('rejects Infinity and -Infinity', () => {
    const r1 = PersistenceRevision.from(Infinity);
    const r2 = PersistenceRevision.from(-Infinity);
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('rejects unsafe integers larger than MAX_SAFE_INTEGER', () => {
    const result = PersistenceRevision.from(Number.MAX_SAFE_INTEGER + 1);
    expect(result.success).toBe(false);
  });

  it('freezes the error and details objects', () => {
    const result = PersistenceRevision.from(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });

  it('creates an immutable instance', () => {
    const result = PersistenceRevision.from(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('does not expose any increment or modification APIs', () => {
    const result = PersistenceRevision.from(1);
    expect(result.success).toBe(true);
    if (result.success) {
      const prototypeMembers = Object.getOwnPropertyNames(Object.getPrototypeOf(result.value));
      expect(prototypeMembers).not.toContain('increment');
      expect(prototypeMembers).not.toContain('next');
      expect(prototypeMembers).not.toContain('add');
    }
  });
});
