import { describe, expect, it } from 'vitest';

import { SourceSchemaVersion, sourceSchemaVersionMaximumLength } from './source-schema-version.js';

describe('SourceSchemaVersion', () => {
  describe('valores válidos', () => {
    it.each([
      ['1', '1'],
      ['v1', 'v1'],
      ['2026-07', '2026-07'],
      ['notion-source-v1', 'notion-source-v1'],
      ['notion.blocks.v1', 'notion.blocks.v1'],
      ['source-schema/1', 'source-schema/1'],
      ['source schema v1', 'source schema v1'],
    ])('acepta %s', (_label, value) => {
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(value);
        expect(result.value.toString()).toBe(value);
      }
    });
  });

  describe('trim exterior', () => {
    it('elimina espacios al inicio y final', () => {
      const result = SourceSchemaVersion.create('  notion-source-v1  ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('notion-source-v1');
      }
    });
  });

  describe('vacío', () => {
    it.each(['', '   '])('rechaza "%s"', (value) => {
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_REQUIRED');
        expect(result.error.message).toBe('A source schema version is required.');
        expect(result.error.details).toEqual({});
      }
    });
  });

  describe('longitud máxima', () => {
    it('acepta exactamente 100 caracteres', () => {
      const value = 'a'.repeat(100);
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(value);
      }
    });

    it('rechaza 101 caracteres', () => {
      const result = SourceSchemaVersion.create('a'.repeat(101));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('too_long');
        expect(result.error.details.maximumLength).toBe(100);
        expect(result.error.details.actualLength).toBe(101);
      }
    });
  });

  describe('longitud después de trim', () => {
    it('acepta con espacios exteriores que reducen la longitud efectiva', () => {
      const value = '  ' + 'a'.repeat(100) + '  ';
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('a'.repeat(100));
      }
    });
  });

  describe('caracteres de control', () => {
    it.each([
      ['newline interior', 'a\nb'],
      ['carriage return interior', 'a\rb'],
      ['tab interior', 'a\tb'],
      ['null interior', 'a\0b'],
      ['U+007F interior', 'a\u007fb'],
    ])('rechaza %s', (_label, value) => {
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza control exterior', () => {
      const result = SourceSchemaVersion.create('\nsource-schema-v1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
        expect(result.error.details.actualLength).toBe(17);
      }
    });

    it('rechaza control como único contenido', () => {
      const result = SourceSchemaVersion.create('\t');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('prioridad', () => {
    it('"\n" produce contains_control_characters, no SOURCE_SCHEMA_VERSION_REQUIRED', () => {
      const result = SourceSchemaVersion.create('\n');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('valor largo con control devuelve contains_control_characters antes que too_long', () => {
      const value = '\n' + 'a'.repeat(200);
      const result = SourceSchemaVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SOURCE_SCHEMA_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('sensibilidad a mayúsculas', () => {
    it('v1 y V1 son diferentes', () => {
      const a = SourceSchemaVersion.create('v1');
      const b = SourceSchemaVersion.create('V1');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('igualdad después de trim', () => {
    it('notion-source-v1 y "  notion-source-v1  " son iguales', () => {
      const a = SourceSchemaVersion.create('notion-source-v1');
      const b = SourceSchemaVersion.create('  notion-source-v1  ');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });
  });

  describe('espacios interiores', () => {
    it('acepta y distingue espacios interiores', () => {
      const a = SourceSchemaVersion.create('source schema v1');
      const b = SourceSchemaVersion.create('source  schema v1');

      expect(a.success).toBe(true);
      expect(b.success).toBe(true);
      if (a.success && b.success) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });

  describe('símbolos opacos', () => {
    it('acepta source.schema/v1-alpha_01', () => {
      const result = SourceSchemaVersion.create('source.schema/v1-alpha_01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('source.schema/v1-alpha_01');
      }
    });
  });

  describe('inmutabilidad', () => {
    it('la instancia está congelada', () => {
      const result = SourceSchemaVersion.create('v1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.value)).toBe(true);
      }
    });

    it('el error required está congelado', () => {
      const result = SourceSchemaVersion.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });

    it('el error invalid con control chars está congelado', () => {
      const result = SourceSchemaVersion.create('\n');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });

    it('el error invalid con too_long está congelado', () => {
      const result = SourceSchemaVersion.create('a'.repeat(101));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });
  });

  describe('representación primitiva', () => {
    it('expone types correctos', () => {
      const result = SourceSchemaVersion.create('v1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value.value).toBe('string');
        expect(typeof result.value.toString()).toBe('string');
      }
    });
  });

  describe('constante máxima', () => {
    it('sourceSchemaVersionMaximumLength es 100', () => {
      expect(sourceSchemaVersionMaximumLength).toBe(100);
    });
  });
});
