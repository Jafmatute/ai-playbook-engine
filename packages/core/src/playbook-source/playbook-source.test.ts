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

// ---------------------------------------------------------------------------
// Creación
// ---------------------------------------------------------------------------

describe('PlaybookSource.create', () => {
  it('creates a PlaybookSource instance', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source).toBeInstanceOf(PlaybookSource);
  });
});

// ---------------------------------------------------------------------------
// Estado inicial
// ---------------------------------------------------------------------------

describe('PlaybookSource — initial state', () => {
  it('starts with status enabled', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source.status).toBe('enabled');
  });
});

// ---------------------------------------------------------------------------
// Identidad y ownership
// ---------------------------------------------------------------------------

describe('PlaybookSource — identity and ownership', () => {
  const source = PlaybookSource.create({
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
  });

  it('returns playbookSourceId', () => {
    expect(source.id).toBe(fixturePsId);
  });

  it('returns workspaceId', () => {
    expect(source.workspaceId).toBe(fixtureWsId);
  });

  it('returns playbookId', () => {
    expect(source.playbookId).toBe(fixturePbId);
  });
});

// ---------------------------------------------------------------------------
// Tipo
// ---------------------------------------------------------------------------

describe('PlaybookSource — type', () => {
  it('returns type notion', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source.type).toBe('notion');
  });
});

// ---------------------------------------------------------------------------
// Referencias
// ---------------------------------------------------------------------------

describe('PlaybookSource — references', () => {
  it('returns externalRootReference instance', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source.externalRootReference).toBe(fixtureRootRef);
  });

  it('returns configurationReference instance', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source.configurationReference).toBe(fixtureConfigRef);
  });
});

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

describe('PlaybookSource — createdAt', () => {
  it('preserves the createdAt instance', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(source.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('PlaybookSource — immutability', () => {
  it('entity is frozen', () => {
    const source = PlaybookSource.create({
      playbookSourceId: fixturePsId,
      workspaceId: fixtureWsId,
      playbookId: fixturePbId,
      type: 'notion',
      externalRootReference: fixtureRootRef,
      configurationReference: fixtureConfigRef,
      createdAt: fixtureCreatedAt,
    });

    expect(Object.isFrozen(source)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// API no prematura
// ---------------------------------------------------------------------------

describe('PlaybookSource — no premature API', () => {
  const source = PlaybookSource.create({
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
  });

  it('does not expose recordFailedSynchronization', () => {
    expect(
      (source as unknown as Record<string, unknown>).recordFailedSynchronization,
    ).toBeUndefined();
  });
});
