import { describe, expect, it } from 'vitest';

import { parsePlaybookId, parsePlaybookSourceId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  PlaybookSource,
  PlaybookSourceExternalRootReference,
  PlaybookSourceConfigurationReference,
} from '../index.js';

function parsedPsId(value: string) {
  const result = parsePlaybookSourceId(value);
  if (!result.success) throw new Error('Invalid PlaybookSourceId fixture.');
  return result.value;
}

function parsedWsId(value: string) {
  const result = parseWorkspaceId(value);
  if (!result.success) throw new Error('Invalid WorkspaceId fixture.');
  return result.value;
}

function parsedPbId(value: string) {
  const result = parsePlaybookId(value);
  if (!result.success) throw new Error('Invalid PlaybookId fixture.');
  return result.value;
}

function instant(value: string): Instant {
  const result = Instant.parse(value);
  if (!result.success) throw new Error('Invalid Instant fixture.');
  return result.value;
}

function externalRootReference(value = 'root-page'): PlaybookSourceExternalRootReference {
  const result = PlaybookSourceExternalRootReference.create(value);
  if (!result.success) throw new Error('Invalid external root reference fixture.');
  return result.value;
}

function configurationReference(value = 'config/main'): PlaybookSourceConfigurationReference {
  const result = PlaybookSourceConfigurationReference.create(value);
  if (!result.success) throw new Error('Invalid configuration reference fixture.');
  return result.value;
}

const fixturePsId = parsedPsId('11111111-2222-3333-4444-555555555555');
const fixtureWsId = parsedWsId('de305d54-75b4-431b-adb2-eb6b9e546014');
const fixturePbId = parsedPbId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
const fixtureCreatedAt = instant('2026-07-12T10:00:00Z');
const fixtureRootRef = externalRootReference();
const fixtureConfigRef = configurationReference();

function createSource(): PlaybookSource {
  return PlaybookSource.create({
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
  });
}

// ---------------------------------------------------------------------------
// Actualización exitosa desde enabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — from enabled', () => {
  it('returns success with a different reference', () => {
    const source = createSource();
    const newReference = externalRootReference('new-root');
    const result = source.updateExternalRootReference({
      externalRootReference: newReference,
    });

    expect(result.success).toBe(true);
  });

  it('replaces the externalRootReference', () => {
    const source = createSource();
    const newReference = externalRootReference('new-root');
    source.updateExternalRootReference({ externalRootReference: newReference });

    expect(source.externalRootReference).toBe(newReference);
  });
});

// ---------------------------------------------------------------------------
// Actualización exitosa desde disabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — from disabled', () => {
  it('returns success when disabled', () => {
    const source = createSource();
    source.disable();
    const newReference = externalRootReference('new-root');
    const result = source.updateExternalRootReference({
      externalRootReference: newReference,
    });

    expect(result.success).toBe(true);
  });

  it('preserves disabled status', () => {
    const source = createSource();
    source.disable();
    const newReference = externalRootReference('new-root');
    source.updateExternalRootReference({ externalRootReference: newReference });

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Conservación de estado
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — preserves state', () => {
  it('preserves id', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.type).toBe('notion');
  });

  it('preserves status', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.status).toBe('enabled');
  });

  it('preserves configurationReference', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Referencia idéntica
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — unchanged reference', () => {
  it('rejects when the same instance is passed', () => {
    const source = createSource();
    const result = source.updateExternalRootReference({
      externalRootReference: fixtureRootRef,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_UPDATE_INVALID',
        details: {
          field: 'externalRootReference',
          reason: 'unchanged',
        },
      });
    }
  });

  it('keeps the original instance after rejection', () => {
    const source = createSource();
    source.updateExternalRootReference({ externalRootReference: fixtureRootRef });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('rejects when an equivalent instance (same value) is passed', () => {
    const source = createSource();
    const equivalentReference = externalRootReference('root-page');
    const result = source.updateExternalRootReference({
      externalRootReference: equivalentReference,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_UPDATE_INVALID',
        details: {
          field: 'externalRootReference',
          reason: 'unchanged',
        },
      });
    }
  });

  it('keeps the original instance instead of the equivalent one', () => {
    const source = createSource();
    const equivalentReference = externalRootReference('root-page');
    source.updateExternalRootReference({ externalRootReference: equivalentReference });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });
});

// ---------------------------------------------------------------------------
// Igualdad después de normalización
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — normalization equality', () => {
  it('rejects when the new value normalizes to the same string', () => {
    const source = createSource();
    const paddedReference = externalRootReference('  root-page  ');
    const result = source.updateExternalRootReference({
      externalRootReference: paddedReference,
    });

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sensibilidad a mayúsculas
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — case sensitivity', () => {
  it('accepts a different-cased value', () => {
    const source = createSource();
    const upperReference = externalRootReference('ROOT-PAGE');
    const result = source.updateExternalRootReference({
      externalRootReference: upperReference,
    });

    expect(result.success).toBe(true);
    expect(source.externalRootReference).toBe(upperReference);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad del error
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — error immutability', () => {
  it('error root is frozen', () => {
    const source = createSource();
    const result = source.updateExternalRootReference({
      externalRootReference: fixtureRootRef,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    const result = source.updateExternalRootReference({
      externalRootReference: fixtureRootRef,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — atomicity', () => {
  it('does not change any property after rejected update', () => {
    const source = createSource();

    const idBefore = source.id;
    const wsBefore = source.workspaceId;
    const pbBefore = source.playbookId;
    const typeBefore = source.type;
    const statusBefore = source.status;
    const refBefore = source.externalRootReference;
    const cfgBefore = source.configurationReference;
    const createdAtBefore = source.createdAt;

    source.updateExternalRootReference({ externalRootReference: fixtureRootRef });

    expect(source.id).toBe(idBefore);
    expect(source.workspaceId).toBe(wsBefore);
    expect(source.playbookId).toBe(pbBefore);
    expect(source.type).toBe(typeBefore);
    expect(source.status).toBe(statusBefore);
    expect(source.externalRootReference).toBe(refBefore);
    expect(source.configurationReference).toBe(cfgBefore);
    expect(source.createdAt).toBe(createdAtBefore);
  });
});

// ---------------------------------------------------------------------------
// Snapshot actualizado
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — snapshot reflects change', () => {
  it('externalRootReference in snapshot is updated', () => {
    const source = createSource();
    const newReference = externalRootReference('updated-reference');
    source.updateExternalRootReference({ externalRootReference: newReference });

    const snapshot = source.toSnapshot();
    expect(snapshot.externalRootReference).toBe('updated-reference');
  });

  it('other fields in snapshot are preserved', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('updated-reference'),
    });

    const snapshot = source.toSnapshot();
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
    expect(snapshot.workspaceId).toBe(fixtureWsId);
    expect(snapshot.playbookId).toBe(fixturePbId);
    expect(snapshot.type).toBe('notion');
    expect(snapshot.status).toBe('enabled');
    expect(snapshot.configurationReference).toBe('config/main');
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Entidad congelada
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateExternalRootReference — entity immutability', () => {
  it('entity is frozen after update', () => {
    const source = createSource();
    source.updateExternalRootReference({
      externalRootReference: externalRootReference('new-root'),
    });

    expect(Object.isFrozen(source)).toBe(true);
  });
});
