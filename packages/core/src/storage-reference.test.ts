import { describe, expect, it } from 'vitest';

import { StorageReference } from './storage-reference.js';

describe('StorageReference', () => {
  describe('creación válida', () => {
    it('acepta snapshots/workspace-a/run-001.json', () => {
      const result = StorageReference.create('snapshots/workspace-a/run-001.json');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('snapshots/workspace-a/run-001.json');
        expect(result.value.toString()).toBe('snapshots/workspace-a/run-001.json');
      }
    });

    it('acepta local://snapshots/run-001', () => {
      const result = StorageReference.create('local://snapshots/run-001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('local://snapshots/run-001');
      }
    });

    it('acepta object://playbook-snapshots/run-001', () => {
      const result = StorageReference.create('object://playbook-snapshots/run-001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('object://playbook-snapshots/run-001');
      }
    });

    it('acepta snapshot-content/2026/07/item-001', () => {
      const result = StorageReference.create('snapshot-content/2026/07/item-001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('snapshot-content/2026/07/item-001');
      }
    });
  });

  describe('trim exterior', () => {
    it('elimina espacios al inicio y final', () => {
      const result = StorageReference.create('  object://bucket/key  ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('object://bucket/key');
      }
    });
  });

  describe('vacío', () => {
    it('rechaza string vacío', () => {
      const result = StorageReference.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('empty');
      }
    });

    it('rechaza solo espacios', () => {
      const result = StorageReference.create('   ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('empty');
      }
    });
  });

  describe('longitud máxima', () => {
    it('acepta exactamente 1024 caracteres', () => {
      const value = 'a'.repeat(1024);
      const result = StorageReference.create(value);

      expect(result.success).toBe(true);
    });

    it('rechaza 1025 caracteres', () => {
      const value = 'a'.repeat(1025);
      const result = StorageReference.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('too_long');
      }
    });

    it('evalúa longitud sobre valor normalizado (trim)', () => {
      const value = '  ' + 'a'.repeat(1023) + '  ';
      const result = StorageReference.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('a'.repeat(1023));
      }
    });

    it('rechaza cuando el valor normalizado supera 1024', () => {
      const value = '  ' + 'a'.repeat(1025) + '  ';
      const result = StorageReference.create(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('too_long');
      }
    });
  });

  describe('caracteres de control', () => {
    it('rechaza newline interior', () => {
      const result = StorageReference.create('snapshots/a\nb');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza carriage return interior', () => {
      const result = StorageReference.create('snapshots/a\rb');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza tab interior', () => {
      const result = StorageReference.create('snapshots/a\tb');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza null interior', () => {
      const result = StorageReference.create('snapshots/a\0b');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza U+007F interior', () => {
      const result = StorageReference.create('snapshots/a\u007fb');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza control exterior', () => {
      const result = StorageReference.create('\nsnapshots/a');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });

    it('rechaza compuesto solo por carácter de control', () => {
      const result = StorageReference.create('\t');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.reason).toBe('contains_control_characters');
      }
    });
  });

  describe('espacios interiores', () => {
    it('acepta y conserva espacios interiores', () => {
      const result = StorageReference.create('storage references/snapshot one');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('storage references/snapshot one');
      }
    });
  });

  describe('símbolos opacos', () => {
    it('acepta símbolos variados sin interpretar', () => {
      const value = 'storage://bucket/path\\segment?version=1&mode=raw#content';
      const result = StorageReference.create(value);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(value);
      }
    });
  });

  describe('sensibilidad a mayúsculas', () => {
    it('distingue entre mayúsculas y minúsculas', () => {
      const a = StorageReference.create('object://bucket/key');
      const b = StorageReference.create('OBJECT://bucket/key');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('igualdad después de normalización exterior', () => {
    it('dos instancias con mismo valor tras trim son iguales', () => {
      const a = StorageReference.create('object://bucket/key');
      const b = StorageReference.create('  object://bucket/key  ');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });
  });

  describe('diferencias opacas', () => {
    it('snapshots/a vs snapshots//a son diferentes', () => {
      const a = StorageReference.create('snapshots/a');
      const b = StorageReference.create('snapshots//a');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });

    it('snapshot one vs snapshot  one son diferentes', () => {
      const a = StorageReference.create('snapshot one');
      const b = StorageReference.create('snapshot  one');

      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('inmutabilidad', () => {
    it('la instancia está congelada', () => {
      const result = StorageReference.create('snapshots/a');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.value)).toBe(true);
      }
    });

    it('el error está congelado', () => {
      const result = StorageReference.create('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });
  });

  describe('representación primitiva', () => {
    it('expone types correctos', () => {
      const result = StorageReference.create('snapshots/a');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value.value).toBe('string');
        expect(typeof result.value.toString()).toBe('string');
      }
    });
  });
});
