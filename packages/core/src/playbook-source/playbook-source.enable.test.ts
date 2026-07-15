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

function createDisabledSource(): PlaybookSource {
  const source = createSource();
  const result = source.disable();
  if (!result.success) throw new Error('Failed to disable source for fixture.');
  return source;
}

// ---------------------------------------------------------------------------
// Habilitación exitosa
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — successful', () => {
  it('returns success after disable → enable', () => {
    const source = createDisabledSource();
    const result = source.enable();

    expect(result.success).toBe(true);
  });

  it('changes status to enabled', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.status).toBe('enabled');
  });
});

// ---------------------------------------------------------------------------
// Conservación del estado restante
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — preserves identity and references', () => {
  it('preserves id', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.type).toBe('notion');
  });

  it('preserves externalRootReference instance', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves configurationReference instance', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    const source = createDisabledSource();
    source.enable();

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Habilitación desde estado inicial (ya enabled)
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — from initial enabled state', () => {
  it('rejects enable when already enabled', () => {
    const source = createSource();
    const result = source.enable();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'enable',
          currentStatus: 'enabled',
          expectedStatus: 'disabled',
        },
      });
    }
  });

  it('preserves enabled state after rejected call', () => {
    const source = createSource();
    source.enable();

    expect(source.status).toBe('enabled');
  });
});

// ---------------------------------------------------------------------------
// Segunda habilitación
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — second call', () => {
  it('rejects a second enable call', () => {
    const source = createDisabledSource();
    source.enable();
    const second = source.enable();

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'enable',
          currentStatus: 'enabled',
          expectedStatus: 'disabled',
        },
      });
    }
  });

  it('preserves enabled state after rejected second call', () => {
    const source = createDisabledSource();
    source.enable();
    source.enable();

    expect(source.status).toBe('enabled');
  });
});

// ---------------------------------------------------------------------------
// Ciclos válidos
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — valid cycles', () => {
  it('allows disable → enable → disable → enable', () => {
    const source = createSource();

    expect(source.disable().success).toBe(true);
    expect(source.status).toBe('disabled');

    expect(source.enable().success).toBe(true);
    expect(source.status).toBe('enabled');

    expect(source.disable().success).toBe(true);
    expect(source.status).toBe('disabled');

    expect(source.enable().success).toBe(true);
    expect(source.status).toBe('enabled');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad del error
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — error immutability', () => {
  it('error root is frozen', () => {
    const source = createSource();
    const result = source.enable();

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    const result = source.enable();

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — atomicity', () => {
  it('does not change state after rejected enable from enabled', () => {
    const source = createSource();
    const statusBefore = source.status;
    const idBefore = source.id;
    const wsBefore = source.workspaceId;
    const pbBefore = source.playbookId;
    const typeBefore = source.type;
    const refBefore = source.externalRootReference;
    const cfgBefore = source.configurationReference;
    const createdAtBefore = source.createdAt;

    source.enable();

    expect(source.status).toBe(statusBefore);
    expect(source.id).toBe(idBefore);
    expect(source.workspaceId).toBe(wsBefore);
    expect(source.playbookId).toBe(pbBefore);
    expect(source.type).toBe(typeBefore);
    expect(source.externalRootReference).toBe(refBefore);
    expect(source.configurationReference).toBe(cfgBefore);
    expect(source.createdAt).toBe(createdAtBefore);
  });
});

// ---------------------------------------------------------------------------
// Entidad congelada
// ---------------------------------------------------------------------------

describe('PlaybookSource.enable — entity immutability', () => {
  it('entity is frozen after enable', () => {
    const source = createDisabledSource();
    source.enable();

    expect(Object.isFrozen(source)).toBe(true);
  });
});
