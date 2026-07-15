import { describe, expect, it } from 'vitest';

import { PlaybookSourceExternalRootReference } from '../index.js';

describe('PlaybookSourceExternalRootReference', () => {
  // ---------------------------------------------------------------------------
  // Creación válida
  // ---------------------------------------------------------------------------

  it('creates a valid reference', () => {
    const result = PlaybookSourceExternalRootReference.create('root-ref');

    expect(result.success).toBe(true);
  });

  it('exposes value via getter', () => {
    const result = PlaybookSourceExternalRootReference.create('abc-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('abc-123');
    }
  });

  it('exposes value via toString', () => {
    const result = PlaybookSourceExternalRootReference.create('abc-123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('abc-123');
    }
  });

  // ---------------------------------------------------------------------------
  // Normalización
  // ---------------------------------------------------------------------------

  it('trims leading whitespace', () => {
    const result = PlaybookSourceExternalRootReference.create('  ref');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('ref');
    }
  });

  it('trims trailing whitespace', () => {
    const result = PlaybookSourceExternalRootReference.create('ref  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('ref');
    }
  });

  it('preserves interior spaces', () => {
    const result = PlaybookSourceExternalRootReference.create('a b c');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('a b c');
    }
  });

  it('preserves uppercase', () => {
    const result = PlaybookSourceExternalRootReference.create('ROOT-REF');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('ROOT-REF');
    }
  });

  it('preserves hyphens and special characters', () => {
    const result = PlaybookSourceExternalRootReference.create('ref-123_abc');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('ref-123_abc');
    }
  });

  // ---------------------------------------------------------------------------
  // Valor vacío
  // ---------------------------------------------------------------------------

  it.each([
    ['empty string', ''],
    ['spaces only', ' '],
    ['tab', '\t'],
    ['newline', '\n'],
  ])('rejects %s', (_label, value) => {
    const result = PlaybookSourceExternalRootReference.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_EXTERNAL_ROOT_REFERENCE_INVALID',
        details: { field: 'value', reason: 'empty' },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Longitud
  // ---------------------------------------------------------------------------

  it('accepts exactly 512 characters', () => {
    const value = 'x'.repeat(512);
    const result = PlaybookSourceExternalRootReference.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 513 characters', () => {
    const value = 'x'.repeat(513);
    const result = PlaybookSourceExternalRootReference.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'value', reason: 'too_long' },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Caracteres de control
  // ---------------------------------------------------------------------------

  it.each([
    ['null byte', 'abc\u0000def'],
    ['US (unit separator)', 'abc\u001fdef'],
    ['DEL character', 'abc\u007fdef'],
  ])('rejects %s', (_label, value) => {
    const result = PlaybookSourceExternalRootReference.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        details: { field: 'value', reason: 'contains_control_character' },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Igualdad
  // ---------------------------------------------------------------------------

  it('considers identical refs equal', () => {
    const a = PlaybookSourceExternalRootReference.create('ref');
    const b = PlaybookSourceExternalRootReference.create('ref');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers trimmed refs equal to non-trimmed originals', () => {
    const a = PlaybookSourceExternalRootReference.create('  ref  ');
    const b = PlaybookSourceExternalRootReference.create('ref');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('detects different values', () => {
    const a = PlaybookSourceExternalRootReference.create('ref-a');
    const b = PlaybookSourceExternalRootReference.create('ref-b');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('is case-sensitive', () => {
    const a = PlaybookSourceExternalRootReference.create('REF');
    const b = PlaybookSourceExternalRootReference.create('ref');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // Inmutabilidad
  // ---------------------------------------------------------------------------

  it('instance is frozen', () => {
    const result = PlaybookSourceExternalRootReference.create('ref');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = PlaybookSourceExternalRootReference.create('');

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = PlaybookSourceExternalRootReference.create('');

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
