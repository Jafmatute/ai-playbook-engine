import { describe, expect, it } from 'vitest';

import { PlaybookSourceConfigurationReference } from '../index.js';

describe('PlaybookSourceConfigurationReference', () => {
  // ---------------------------------------------------------------------------
  // Creación válida
  // ---------------------------------------------------------------------------

  it('creates a valid reference', () => {
    const result = PlaybookSourceConfigurationReference.create('config/main');

    expect(result.success).toBe(true);
  });

  it('accepts reference with slashes', () => {
    const result = PlaybookSourceConfigurationReference.create(
      'playbook-source-config/main-notion',
    );

    expect(result.success).toBe(true);
  });

  it('accepts reference with colons', () => {
    const result = PlaybookSourceConfigurationReference.create('config://playbook-source/primary');

    expect(result.success).toBe(true);
  });

  it('exposes value via getter', () => {
    const result = PlaybookSourceConfigurationReference.create('my-config');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('my-config');
    }
  });

  it('exposes value via toString', () => {
    const result = PlaybookSourceConfigurationReference.create('my-config');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.toString()).toBe('my-config');
    }
  });

  // ---------------------------------------------------------------------------
  // Normalización
  // ---------------------------------------------------------------------------

  it('trims leading whitespace', () => {
    const result = PlaybookSourceConfigurationReference.create('  config');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('config');
    }
  });

  it('trims trailing whitespace', () => {
    const result = PlaybookSourceConfigurationReference.create('config  ');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('config');
    }
  });

  it('preserves interior spaces', () => {
    const result = PlaybookSourceConfigurationReference.create('a b c');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('a b c');
    }
  });

  it('preserves uppercase', () => {
    const result = PlaybookSourceConfigurationReference.create('PROD-CONFIG');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('PROD-CONFIG');
    }
  });

  it('preserves hyphens and slashes', () => {
    const result = PlaybookSourceConfigurationReference.create('config/main-v2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('config/main-v2');
    }
  });

  it('preserves protocol-like prefixes', () => {
    const result = PlaybookSourceConfigurationReference.create('config://playbook-source/primary');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.value).toBe('config://playbook-source/primary');
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
    const result = PlaybookSourceConfigurationReference.create(value);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_CONFIGURATION_REFERENCE_INVALID',
        details: { field: 'value', reason: 'empty' },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Longitud
  // ---------------------------------------------------------------------------

  it('accepts exactly 512 characters', () => {
    const value = 'x'.repeat(512);
    const result = PlaybookSourceConfigurationReference.create(value);

    expect(result.success).toBe(true);
  });

  it('rejects 513 characters', () => {
    const value = 'x'.repeat(513);
    const result = PlaybookSourceConfigurationReference.create(value);

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
    const result = PlaybookSourceConfigurationReference.create(value);

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
    const a = PlaybookSourceConfigurationReference.create('config/main');
    const b = PlaybookSourceConfigurationReference.create('config/main');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('considers trimmed refs equal to non-trimmed originals', () => {
    const a = PlaybookSourceConfigurationReference.create('  config/main  ');
    const b = PlaybookSourceConfigurationReference.create('config/main');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it('detects different values', () => {
    const a = PlaybookSourceConfigurationReference.create('config/a');
    const b = PlaybookSourceConfigurationReference.create('config/b');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    if (a.success && b.success) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });

  it('is case-sensitive', () => {
    const a = PlaybookSourceConfigurationReference.create('PROD');
    const b = PlaybookSourceConfigurationReference.create('prod');

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
    const result = PlaybookSourceConfigurationReference.create('config');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('error root is frozen', () => {
    const result = PlaybookSourceConfigurationReference.create('');

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const result = PlaybookSourceConfigurationReference.create('');

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});
