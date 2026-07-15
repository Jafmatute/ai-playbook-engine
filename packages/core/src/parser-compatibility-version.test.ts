import { describe, expect, it } from 'vitest';

import { SourceSchemaVersion } from './source-schema-version.js';
import {
  ParserCompatibilityVersion,
  parserCompatibilityVersionMaximumLength,
} from './parser-compatibility-version.js';

describe('ParserCompatibilityVersion', () => {
  describe('valores válidos', () => {
    it.each([
      ['1', '1'],
      ['v1', 'v1'],
      ['parser-v1', 'parser-v1'],
      ['notion-parser-v1', 'notion-parser-v1'],
      ['notion.blocks.parser.v1', 'notion.blocks.parser.v1'],
      ['parser/compatibility/1', 'parser/compatibility/1'],
      ['2026-07', '2026-07'],
      ['parser compatibility v1', 'parser compatibility v1'],
    ])('acepta %s', (_label, value) => {
      const result = ParserCompatibilityVersion.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(value);
        expect(result.value.toString()).toBe(value);
      }
    });
  });

  describe('trim exterior', () => {
    it('elimina espacios al inicio y final', () => {
      const result = ParserCompatibilityVersion.create('  notion-parser-v1  ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('notion-parser-v1');
      }
    });
  });

  describe('vacío', () => {
    it.each(['', '   '])('rechaza "%s"', (value) => {
      const result = ParserCompatibilityVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_REQUIRED');
        expect(result.error.message).toBe('A parser compatibility version is required.');
        expect(result.error.details).toEqual({});
      }
    });
  });

  describe('longitud máxima', () => {
    it('acepta exactamente 100 caracteres', () => {
      const value = 'a'.repeat(100);
      const result = ParserCompatibilityVersion.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(value);
      }
    });

    it('rechaza 101 caracteres', () => {
      const result = ParserCompatibilityVersion.create('a'.repeat(101));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('too_long');
        expect(result.error.details.maximumLength).toBe(100);
        expect(result.error.details.actualLength).toBe(101);
      }
    });
  });

  describe('longitud después de trim', () => {
    it('acepta con espacios exteriores que reducen la longitud efectiva', () => {
      const value = '  ' + 'a'.repeat(100) + '  ';
      const result = ParserCompatibilityVersion.create(value);

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
      const result = ParserCompatibilityVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza control exterior', () => {
      const result = ParserCompatibilityVersion.create('\nparser-v1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
        expect(result.error.details.actualLength).toBe(10);
      }
    });

    it('rechaza control como único contenido', () => {
      const result = ParserCompatibilityVersion.create('\t');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('prioridad', () => {
    it('"\n" produce contains_control_characters, no PARSER_COMPATIBILITY_VERSION_REQUIRED', () => {
      const result = ParserCompatibilityVersion.create('\n');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('valor largo con control devuelve contains_control_characters antes que too_long', () => {
      const value = '\n' + 'a'.repeat(200);
      const result = ParserCompatibilityVersion.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PARSER_COMPATIBILITY_VERSION_INVALID');
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('longitud original para controles', () => {
    it('"\nparser-v1" reporta actualLength = 10 (rawValue.length)', () => {
      const result = ParserCompatibilityVersion.create('\nparser-v1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.actualLength).toBe(10);
      }
    });
  });

  describe('sensibilidad a mayúsculas', () => {
    it('parser-v1 y PARSER-V1 son diferentes', () => {
      const a = ParserCompatibilityVersion.create('parser-v1');
      const b = ParserCompatibilityVersion.create('PARSER-V1');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('igualdad después de trim', () => {
    it('notion-parser-v1 y "  notion-parser-v1  " son iguales', () => {
      const a = ParserCompatibilityVersion.create('notion-parser-v1');
      const b = ParserCompatibilityVersion.create('  notion-parser-v1  ');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });
  });

  describe('espacios interiores', () => {
    it('acepta y distingue espacios interiores', () => {
      const a = ParserCompatibilityVersion.create('parser compatibility v1');
      const b = ParserCompatibilityVersion.create('parser  compatibility v1');

      expect(a.success).toBe(true);
      expect(b.success).toBe(true);
      if (a.success && b.success) {
        expect(a.value.equals(b.value)).toBe(false);
      }
    });
  });

  describe('símbolos opacos', () => {
    it('acepta parser.compatibility/v1-alpha_01', () => {
      const result = ParserCompatibilityVersion.create('parser.compatibility/v1-alpha_01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('parser.compatibility/v1-alpha_01');
      }
    });
  });

  describe('diferencia respecto al esquema fuente', () => {
    it('SourceSchemaVersion y ParserCompatibilityVersion son tipos distintos', () => {
      const sourceSchema = SourceSchemaVersion.create('v1');
      const parserCompatibility = ParserCompatibilityVersion.create('v1');

      expect(sourceSchema.success).toBe(true);
      expect(parserCompatibility.success).toBe(true);
    });
  });

  describe('inmutabilidad', () => {
    it('la instancia está congelada', () => {
      const result = ParserCompatibilityVersion.create('v1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.value)).toBe(true);
      }
    });

    it('el error required está congelado', () => {
      const result = ParserCompatibilityVersion.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });

    it('el error invalid con control chars está congelado', () => {
      const result = ParserCompatibilityVersion.create('\n');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });

    it('el error invalid con too_long está congelado', () => {
      const result = ParserCompatibilityVersion.create('a'.repeat(101));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });
  });

  describe('representación primitiva', () => {
    it('expone types correctos', () => {
      const result = ParserCompatibilityVersion.create('v1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value.value).toBe('string');
        expect(typeof result.value.toString()).toBe('string');
      }
    });
  });

  describe('constante pública', () => {
    it('parserCompatibilityVersionMaximumLength es 100', () => {
      expect(parserCompatibilityVersionMaximumLength).toBe(100);
    });
  });
});
