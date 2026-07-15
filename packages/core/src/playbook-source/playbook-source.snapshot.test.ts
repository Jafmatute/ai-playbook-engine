import { describe, expect, it } from 'vitest';

import { parsePlaybookId, parsePlaybookSourceId, parseWorkspaceId } from '../identifiers.js';
import { Instant } from '../instant.js';
import {
  PlaybookSource,
  PlaybookSourceExternalRootReference,
  PlaybookSourceConfigurationReference,
  type RestorePlaybookSourceInput,
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
// Snapshot de fuente habilitada
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — enabled', () => {
  const source = createSource();
  const snapshot = source.toSnapshot();

  it('serializes playbookSourceId', () => {
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
  });

  it('serializes workspaceId', () => {
    expect(snapshot.workspaceId).toBe(fixtureWsId);
  });

  it('serializes playbookId', () => {
    expect(snapshot.playbookId).toBe(fixturePbId);
  });

  it('serializes type', () => {
    expect(snapshot.type).toBe('notion');
  });

  it('serializes status', () => {
    expect(snapshot.status).toBe('enabled');
  });

  it('serializes externalRootReference as string', () => {
    expect(snapshot.externalRootReference).toBe('root-page');
  });

  it('serializes configurationReference as string', () => {
    expect(snapshot.configurationReference).toBe('config/main');
  });

  it('serializes createdAt as ISO string', () => {
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Snapshot de fuente deshabilitada
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — disabled', () => {
  const source = createSource();
  source.disable();
  const snapshot = source.toSnapshot();

  it('serializes status as disabled', () => {
    expect(snapshot.status).toBe('disabled');
  });

  it('preserves other fields', () => {
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
    expect(snapshot.workspaceId).toBe(fixtureWsId);
    expect(snapshot.playbookId).toBe(fixturePbId);
    expect(snapshot.type).toBe('notion');
    expect(snapshot.externalRootReference).toBe('root-page');
    expect(snapshot.configurationReference).toBe('config/main');
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Snapshot de fuente restaurada
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — restored', () => {
  it('reflects restored state', () => {
    const input: RestorePlaybookSourceInput = {
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      status: 'disabled',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
      lastSuccessfulSynchronizationRunId: null,
      lastSuccessfulSynchronizationAt: null,
    };
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Fixture must be valid.');

    const snapshot = result.value.toSnapshot();

    expect(snapshot.status).toBe('disabled');
    expect(snapshot.playbookSourceId).toBe(fixturePsId);
    expect(snapshot.workspaceId).toBe(fixtureWsId);
    expect(snapshot.playbookId).toBe(fixturePbId);
    expect(snapshot.type).toBe('notion');
    expect(snapshot.externalRootReference).toBe('root-page');
    expect(snapshot.configurationReference).toBe('config/main');
    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// Representaciones primitivas
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — primitive representations', () => {
  const source = createSource();
  const snapshot = source.toSnapshot();

  it('playbookSourceId is a string', () => {
    expect(typeof snapshot.playbookSourceId).toBe('string');
  });

  it('workspaceId is a string', () => {
    expect(typeof snapshot.workspaceId).toBe('string');
  });

  it('playbookId is a string', () => {
    expect(typeof snapshot.playbookId).toBe('string');
  });

  it('type is a string', () => {
    expect(typeof snapshot.type).toBe('string');
  });

  it('status is a string', () => {
    expect(typeof snapshot.status).toBe('string');
  });

  it('externalRootReference is a string', () => {
    expect(typeof snapshot.externalRootReference).toBe('string');
  });

  it('configurationReference is a string', () => {
    expect(typeof snapshot.configurationReference).toBe('string');
  });

  it('createdAt is a string', () => {
    expect(typeof snapshot.createdAt).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — immutability', () => {
  it('snapshot root is frozen', () => {
    const source = createSource();
    const snapshot = source.toSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nueva instancia en cada llamada
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — independence', () => {
  it('returns a new object each call', () => {
    const source = createSource();
    const first = source.toSnapshot();
    const second = source.toSnapshot();

    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// Serialización canónica
// ---------------------------------------------------------------------------

describe('PlaybookSource.toSnapshot — canonical serialization', () => {
  it('createdAt is in ISO UTC format', () => {
    const source = createSource();
    const snapshot = source.toSnapshot();

    expect(snapshot.createdAt).toBe('2026-07-12T10:00:00.000Z');
  });
});
