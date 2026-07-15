import { describe, expect, it } from 'vitest';

import { ContentChecksum } from './content-checksum.js';

const validHex64 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('ContentChecksum', () => {
  describe('creación válida', () => {
    it('acepta un SHA-256 checksum válido', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.algorithm).toBe('sha256');
        expect(result.value.digest).toBe(validHex64);
        expect(result.value.value).toBe(`sha256:${validHex64}`);
        expect(result.value.toString()).toBe(`sha256:${validHex64}`);
      }
    });
  });

  describe('trim exterior', () => {
    it('elimina espacios al inicio y final', () => {
      const result = ContentChecksum.create(`  sha256:${validHex64}  `);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(`sha256:${validHex64}`);
      }
    });
  });

  describe('vacío', () => {
    it('rechaza string vacío', () => {
      const result = ContentChecksum.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('empty');
      }
    });

    it('rechaza solo espacios', () => {
      const result = ContentChecksum.create('   ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('empty');
      }
    });
  });

  describe('formato inválido', () => {
    it('rechaza sin separador', () => {
      const result = ContentChecksum.create('sha256');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_format');
      }
    });

    it('rechaza separadores múltiples', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}:extra`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_format');
      }
    });

    it('rechaza solo separador con digest vacío', () => {
      const result = ContentChecksum.create('sha256:');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_format');
      }
    });

    it('rechaza solo separador sin algoritmo', () => {
      const result = ContentChecksum.create(`:${validHex64}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_format');
      }
    });
  });

  describe('algoritmo no soportado', () => {
    it('rechaza sha1', () => {
      const result = ContentChecksum.create(`sha1:${validHex64}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('unsupported_algorithm');
      }
    });

    it('rechaza md5', () => {
      const result = ContentChecksum.create(`md5:${validHex64}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('unsupported_algorithm');
      }
    });

    it('rechaza sha512', () => {
      const result = ContentChecksum.create(`sha512:${validHex64}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('unsupported_algorithm');
      }
    });

    it('rechaza SHA256 mayúsculas (no normaliza)', () => {
      const result = ContentChecksum.create(`SHA256:${validHex64}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('unsupported_algorithm');
      }
    });
  });

  describe('longitud del digest', () => {
    it('rechaza 63 caracteres', () => {
      const result = ContentChecksum.create(`sha256:${'a'.repeat(63)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_length');
      }
    });

    it('rechaza 65 caracteres', () => {
      const result = ContentChecksum.create(`sha256:${'a'.repeat(65)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_length');
      }
    });

    it('rechaza digest vacío (ya capturado como invalid_format por prioridad)', () => {
      const result = ContentChecksum.create('sha256:');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_format');
      }
    });
  });

  describe('caracteres inválidos en digest', () => {
    it('rechaza g', () => {
      const result = ContentChecksum.create(`sha256:${'g'}${'a'.repeat(63)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_characters');
      }
    });

    it('rechaza z', () => {
      const result = ContentChecksum.create(`sha256:${'z'}${'a'.repeat(63)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_characters');
      }
    });

    it('rechaza mayúsculas A-F', () => {
      const result = ContentChecksum.create(`sha256:${'ABCDEF0123456789'.repeat(4)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_characters');
      }
    });

    it('rechaza espacio interno', () => {
      const fixture = 'a'.repeat(32) + ' ' + 'a'.repeat(31);
      const result = ContentChecksum.create(`sha256:${fixture}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_characters');
      }
    });

    it('rechaza guiones', () => {
      const result = ContentChecksum.create(`sha256:${'-'}${'a'.repeat(63)}`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('invalid_digest_characters');
      }
    });
  });

  describe('caracteres de control', () => {
    it('rechaza newline', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}\n`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza carriage return', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}\r`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza tab', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}\t`);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('igualdad', () => {
    it('dos instancias con mismo valor son iguales', () => {
      const a = ContentChecksum.create(`sha256:${validHex64}`);
      const b = ContentChecksum.create(`sha256:${validHex64}`);

      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('instancias con diferente valor no son iguales', () => {
      const a = ContentChecksum.create(`sha256:${'a'.repeat(64)}`);
      const b = ContentChecksum.create(`sha256:${'b'.repeat(64)}`);

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('inmutabilidad', () => {
    it('la instancia está congelada', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.value)).toBe(true);
      }
    });

    it('el error está congelado', () => {
      const result = ContentChecksum.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });
  });

  describe('representación primitiva', () => {
    it('expone types correctos', () => {
      const result = ContentChecksum.create(`sha256:${validHex64}`);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value.value).toBe('string');
        expect(typeof result.value.algorithm).toBe('string');
        expect(typeof result.value.digest).toBe('string');
        expect(typeof result.value.toString()).toBe('string');
      }
    });
  });
});
