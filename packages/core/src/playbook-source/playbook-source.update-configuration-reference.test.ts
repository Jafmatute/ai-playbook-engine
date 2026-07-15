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
const fixtureRestoreInput = {
  playbookSourceId: fixturePsId,
  workspaceId: fixtureWsId,
  playbookId: fixturePbId,
  type: 'notion' as const,
  status: 'disabled' as const,
  externalRootReference: fixtureRootRef,
  configurationReference: fixtureConfigRef,
  createdAt: fixtureCreatedAt,
  lastSuccessfulSynchronizationRunId: null,
  lastSuccessfulSynchronizationAt: null,
  lastFailedSynchronizationRunId: null,
  lastFailedSynchronizationAt: null,
};

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

describe('PlaybookSource.updateConfigurationReference — from enabled', () => {
  it('returns success with a different reference', () => {
    const source = createSource();
    const newRef = configurationReference('config/secondary');
    const result = source.updateConfigurationReference({
      configurationReference: newRef,
    });

    expect(result.success).toBe(true);
  });

  it('replaces the configurationReference', () => {
    const source = createSource();
    const newRef = configurationReference('config/secondary');
    source.updateConfigurationReference({ configurationReference: newRef });

    expect(source.configurationReference).toBe(newRef);
  });
});

// ---------------------------------------------------------------------------
// Actualización exitosa desde disabled
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — from disabled', () => {
  it('returns success when disabled', () => {
    const source = createSource();
    source.disable();
    const newRef = configurationReference('config/secondary');
    const result = source.updateConfigurationReference({
      configurationReference: newRef,
    });

    expect(result.success).toBe(true);
  });

  it('preserves disabled status', () => {
    const source = createSource();
    source.disable();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Conservación del resto del estado
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — preserves state', () => {
  it('preserves id', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.type).toBe('notion');
  });

  it('preserves status', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.status).toBe('enabled');
  });

  it('preserves externalRootReference', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves createdAt', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/secondary'),
    });

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Misma instancia
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — same instance', () => {
  it('rejects when the same instance is passed', () => {
    const source = createSource();
    const result = source.updateConfigurationReference({
      configurationReference: fixtureConfigRef,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_UPDATE_INVALID',
        details: {
          field: 'configurationReference',
          reason: 'unchanged',
        },
      });
    }
  });

  it('keeps the original instance after rejection', () => {
    const source = createSource();
    source.updateConfigurationReference({ configurationReference: fixtureConfigRef });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });
});

// ---------------------------------------------------------------------------
// Instancia equivalente
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — equivalent value', () => {
  it('rejects when an equivalent instance is passed', () => {
    const source = createSource();
    const equivalentRef = configurationReference('config/main');
    const result = source.updateConfigurationReference({
      configurationReference: equivalentRef,
    });

    expect(result.success).toBe(false);
  });

  it('keeps the original instance instead of the equivalent one', () => {
    const source = createSource();
    const equivalentRef = configurationReference('config/main');
    source.updateConfigurationReference({ configurationReference: equivalentRef });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });
});

// ---------------------------------------------------------------------------
// Igualdad después de normalización
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — normalization equality', () => {
  it('rejects when the new value normalizes to the same string', () => {
    const source = createSource();
    const paddedRef = configurationReference('  config/main  ');
    const result = source.updateConfigurationReference({
      configurationReference: paddedRef,
    });

    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sensibilidad a mayúsculas
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — case sensitivity', () => {
  it('accepts a different-cased value', () => {
    const source = createSource();
    const upperRef = configurationReference('CONFIG/MAIN');
    const result = source.updateConfigurationReference({
      configurationReference: upperRef,
    });

    expect(result.success).toBe(true);
    expect(source.configurationReference).toBe(upperRef);
  });
});

// ---------------------------------------------------------------------------
// Valores con prefijos y barras
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — URI-like values', () => {
  it('accepts a configuration reference with path separators', () => {
    const source = createSource();
    const complexRef = configurationReference('config://playbook-source/secondary');
    const result = source.updateConfigurationReference({
      configurationReference: complexRef,
    });

    expect(result.success).toBe(true);
    expect(source.configurationReference).toBe(complexRef);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad del error
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — error immutability', () => {
  it('error root is frozen', () => {
    const source = createSource();
    const result = source.updateConfigurationReference({
      configurationReference: fixtureConfigRef,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    const result = source.updateConfigurationReference({
      configurationReference: fixtureConfigRef,
    });

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — atomicity', () => {
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

    source.updateConfigurationReference({ configurationReference: fixtureConfigRef });

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

describe('PlaybookSource.updateConfigurationReference — snapshot reflects change', () => {
  it('configurationReference in snapshot is updated', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/updated'),
    });

    const snapshot = source.toSnapshot();
    expect(snapshot.configurationReference).toBe('config/updated');
  });

  it('externalRootReference in snapshot is preserved', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/updated'),
    });

    const snapshot = source.toSnapshot();
    expect(snapshot.externalRootReference).toBe('root-page');
  });
});

// ---------------------------------------------------------------------------
// Entidad congelada
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — entity immutability', () => {
  it('entity is frozen after update', () => {
    const source = createSource();
    source.updateConfigurationReference({
      configurationReference: configurationReference('config/other'),
    });

    expect(Object.isFrozen(source)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fuente restaurada
// ---------------------------------------------------------------------------

describe('PlaybookSource.updateConfigurationReference — restored source', () => {
  it('works after restore', () => {
    const restoreResult = PlaybookSource.restore(fixtureRestoreInput);
    if (!restoreResult.success) throw new Error('Fixture must be valid.');

    const source = restoreResult.value;
    const newRef = configurationReference('config/restored');
    const result = source.updateConfigurationReference({
      configurationReference: newRef,
    });

    expect(result.success).toBe(true);
    expect(source.configurationReference).toBe(newRef);
    expect(source.status).toBe('disabled');
  });
});
