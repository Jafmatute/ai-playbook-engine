import { describe, expect, it } from 'vitest';

import {
  isSynchronizationSnapshotStorageFormat,
  parseSynchronizationSnapshotStorageFormat,
  synchronizationSnapshotStorageFormats,
  type SynchronizationSnapshotStorageFormat,
} from './synchronization-snapshot-storage-format.js';

describe('SynchronizationSnapshotStorageFormat', () => {
  describe('lista soportada', () => {
    it('contiene exactamente json', () => {
      expect(synchronizationSnapshotStorageFormats).toEqual(['json']);
    });

    it('no contiene valores adicionales', () => {
      expect(synchronizationSnapshotStorageFormats).toHaveLength(1);
    });
  });

  describe('lista congelada', () => {
    it('está congelada', () => {
      expect(Object.isFrozen(synchronizationSnapshotStorageFormats)).toBe(true);
    });
  });

  describe('type guard válido', () => {
    it('devuelve true para json', () => {
      expect(isSynchronizationSnapshotStorageFormat('json')).toBe(true);
    });
  });

  describe('type guard inválido', () => {
    it.each([
      ['string vacío', ''],
      ['JSON mayúsculas', 'JSON'],
      ['Json capitalizado', 'Json'],
      ['espacio antes', ' json'],
      ['espacio después', 'json '],
      ['application/json', 'application/json'],
      ['yaml', 'yaml'],
      ['markdown', 'markdown'],
      ['binary', 'binary'],
    ])('rechaza %s', (_label, value) => {
      expect(isSynchronizationSnapshotStorageFormat(value)).toBe(false);
    });
  });

  describe('parse válido', () => {
    it('devuelve ok con json', () => {
      const result = parseSynchronizationSnapshotStorageFormat('json');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('json');
      }
    });
  });

  describe('parse inválido', () => {
    it.each([
      ['yaml', 'yaml'],
      ['JSON mayúsculas', 'JSON'],
      ['string vacío', ''],
    ])('rechaza %s', (_label, value) => {
      const result = parseSynchronizationSnapshotStorageFormat(value);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SYNCHRONIZATION_SNAPSHOT_STORAGE_FORMAT_INVALID');
        expect(result.error.message).toBe(
          'The synchronization snapshot storage format is invalid.',
        );
        expect(result.error.details.value).toBe(value);
      }
    });
  });

  describe('sin normalización', () => {
    it('no acepta " json "', () => {
      expect(isSynchronizationSnapshotStorageFormat(' json ')).toBe(false);
    });

    it('no convierte JSON a json', () => {
      expect(isSynchronizationSnapshotStorageFormat('JSON')).toBe(false);
    });
  });

  describe('inmutabilidad del error', () => {
    it('error y details están congelados', () => {
      const result = parseSynchronizationSnapshotStorageFormat('yaml');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(Object.isFrozen(result.error)).toBe(true);
        expect(Object.isFrozen(result.error.details)).toBe(true);
      }
    });
  });

  describe('preservación del valor inválido', () => {
    it('conserva exactamente "  YAML  "', () => {
      const result = parseSynchronizationSnapshotStorageFormat('  YAML  ');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details.value).toBe('  YAML  ');
      }
    });
  });

  describe('narrowing de TypeScript', () => {
    it('type guard reduce el tipo correctamente', () => {
      const value = 'json' as string;

      if (isSynchronizationSnapshotStorageFormat(value)) {
        const format: SynchronizationSnapshotStorageFormat = value;

        expect(format).toBe('json');
      }
    });
  });
});
