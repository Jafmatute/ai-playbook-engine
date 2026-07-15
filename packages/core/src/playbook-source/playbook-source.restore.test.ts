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

function restoreInput(overrides?: Partial<RestorePlaybookSourceInput>): RestorePlaybookSourceInput {
  return {
    playbookSourceId: fixturePsId,
    workspaceId: fixtureWsId,
    playbookId: fixturePbId,
    type: 'notion',
    status: 'enabled',
    externalRootReference: fixtureRootRef,
    configurationReference: fixtureConfigRef,
    createdAt: fixtureCreatedAt,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Restauración válida
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — valid states', () => {
  it('restores enabled', () => {
    const input = restoreInput({ status: 'enabled' });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('enabled');
    }
  });

  it('restores disabled', () => {
    const input = restoreInput({ status: 'disabled' });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.status).toBe('disabled');
    }
  });
});

// ---------------------------------------------------------------------------
// Conservación de identidad, ownership, tipo, referencias y timestamp
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — exact preservation', () => {
  const input = restoreInput({ status: 'disabled' });
  const result = PlaybookSource.restore(input);
  if (!result.success) throw new Error('Unexpected restoration failure.');

  it('preserves playbookSourceId', () => {
    expect(result.value.id).toBe(fixturePsId);
  });

  it('preserves workspaceId', () => {
    expect(result.value.workspaceId).toBe(fixtureWsId);
  });

  it('preserves playbookId', () => {
    expect(result.value.playbookId).toBe(fixturePbId);
  });

  it('preserves type', () => {
    expect(result.value.type).toBe('notion');
  });

  it('preserves externalRootReference instance', () => {
    expect(result.value.externalRootReference).toBe(fixtureRootRef);
  });

  it('preserves configurationReference instance', () => {
    expect(result.value.configurationReference).toBe(fixtureConfigRef);
  });

  it('preserves createdAt', () => {
    expect(result.value.createdAt).toBe(fixtureCreatedAt);
  });
});

// ---------------------------------------------------------------------------
// Estado desconocido
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — unknown status', () => {
  it('rejects an unknown status string', () => {
    const input = restoreInput({ status: 'unknown' as never });
    const result = PlaybookSource.restore(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PLAYBOOK_SOURCE_STATE_INVALID');
      expect(result.error.details.reason).toBe('UNKNOWN_PLAYBOOK_SOURCE_STATUS');
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — immutability', () => {
  it('restored entity is frozen', () => {
    const input = restoreInput({ status: 'disabled' });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Unexpected restoration failure.');

    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it('error root is frozen', () => {
    const input = restoreInput({ status: 'unknown' as never });
    const result = PlaybookSource.restore(input);

    if (!result.success) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it('error details are frozen', () => {
    const input = restoreInput({ status: 'unknown' as never });
    const result = PlaybookSource.restore(input);

    if (!result.success) {
      expect(Object.isFrozen(result.error.details)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Ciclo de vida posterior a la restauración
// ---------------------------------------------------------------------------

describe('PlaybookSource.restore — lifecycle continues', () => {
  it('can disable a restored enabled source', () => {
    const input = restoreInput({ status: 'enabled' });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Unexpected restoration failure.');

    const source = result.value;
    const disableResult = source.disable();

    expect(disableResult.success).toBe(true);
    expect(source.status).toBe('disabled');
  });

  it('can enable a restored disabled source', () => {
    const input = restoreInput({ status: 'disabled' });
    const result = PlaybookSource.restore(input);
    if (!result.success) throw new Error('Unexpected restoration failure.');

    const source = result.value;
    const enableResult = source.enable();

    expect(enableResult.success).toBe(true);
    expect(source.status).toBe('enabled');
  });
});
