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
// Deshabilitación exitosa
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — successful', () => {
  it('disables from enabled', () => {
    const source = createSource();
    const result = source.disable();

    expect(result.success).toBe(true);
  });

  it('changes status to disabled', () => {
    const source = createSource();
    source.disable();

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Conservación de identidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — preserves identity', () => {
  it('preserves id', () => {
    const source = createSource();
    source.disable();

    expect(source.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    const source = createSource();
    source.disable();

    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    const source = createSource();
    source.disable();

    expect(source.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    const source = createSource();
    source.disable();

    expect(source.type).toBe('notion');
  });

  it('preserves externalRootReference instance', () => {
    const source = createSource();
    source.disable();

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves configurationReference instance', () => {
    const source = createSource();
    source.disable();

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    const source = createSource();
    source.disable();

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Segunda llamada
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — second call', () => {
  it('rejects a second disable call', () => {
    const source = createSource();
    source.disable();
    const second = source.disable();

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toMatchObject({
        code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED',
        details: {
          operation: 'disable',
          currentStatus: 'disabled',
          expectedStatus: 'enabled',
        },
      });
    }
  });

  it('preserves disabled state after rejected second call', () => {
    const source = createSource();
    source.disable();
    source.disable();

    expect(source.status).toBe('disabled');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad del error
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — error immutability', () => {
  it('error root is frozen', () => {
    const source = createSource();
    source.disable();
    const second = source.disable();

    if (!second.success) {
      expect(Object.isFrozen(second.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const source = createSource();
    source.disable();
    const second = source.disable();

    if (!second.success) {
      expect(Object.isFrozen(second.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Atomicidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — atomicity', () => {
  it('does not change state after rejected second call', () => {
    const source = createSource();
    source.disable();
    const statusBefore = source.status;
    source.disable();

    expect(source.status).toBe(statusBefore);
  });
});

// ---------------------------------------------------------------------------
// Entidad congelada
// ---------------------------------------------------------------------------

describe('PlaybookSource.disable — entity immutability', () => {
  it('entity is frozen after disable', () => {
    const source = createSource();
    source.disable();

    expect(Object.isFrozen(source)).toBe(true);
  });
});
