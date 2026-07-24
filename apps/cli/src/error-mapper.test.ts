import { describe, expect, it } from 'vitest';

import { mapErrorToExitCode } from './error-mapper.js';
import { playbookSourceNotFound } from '@ai-playbook-engine/application';
import {
  PlaybookSource,
  PlaybookSourceConfigurationReference,
  PlaybookSourceExternalRootReference,
  parsePlaybookId,
  parsePlaybookSourceId,
  parseWorkspaceId,
  Instant,
} from '@ai-playbook-engine/core';

describe('mapErrorToExitCode', () => {
  it.each([
    ['INVALID_IDENTIFIER', 2],
    ['WORKSPACE_NAME_REQUIRED', 2],
    ['PAGINATION_INVALID', 2],
    ['PLAYBOOK_SOURCE_TYPE_UNSUPPORTED', 2],
    ['PLAYBOOK_SOURCE_EXTERNAL_ROOT_REFERENCE_INVALID', 2],
    ['PLAYBOOK_SOURCE_CONFIGURATION_REFERENCE_INVALID', 2],
  ])('maps %s to INVALID_INPUT (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it.each([
    ['WORKSPACE_NOT_FOUND', 3],
    ['PLAYBOOK_NOT_FOUND', 3],
    ['PLAYBOOK_SOURCE_NOT_FOUND', 3],
  ])('maps %s to NOT_FOUND (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it('maps real playbookSourceNotFound error to NOT_FOUND (3)', () => {
    const idResult = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
    if (!idResult.success) throw new Error('Expected valid playbook source ID.');
    const error = playbookSourceNotFound(idResult.value);
    expect(mapErrorToExitCode(error.code)).toBe(3);
  });

  it.each([
    ['WORKSPACE_ALREADY_INITIALIZED', 4],
    ['PLAYBOOK_NAME_CONFLICT', 4],
    ['WORKSPACE_NOT_ACTIVE', 4],
    ['PERSISTENCE_REVISION_CONFLICT', 4],
    ['PLAYBOOK_OPERATION_NOT_ALLOWED', 4],
    ['PLAYBOOK_ALREADY_ARCHIVED', 4],
    ['PLAYBOOK_NOT_ARCHIVED', 4],
    ['ENABLED_PLAYBOOK_SOURCE_CONFLICT', 4],
    ['PLAYBOOK_ARCHIVED', 4],
    ['PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED', 4],
  ])('maps %s to CONFLICT (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it.each([
    ['CURRENT_WORKSPACE_UNAVAILABLE', 5],
    ['CONFIGURATION_INVALID', 5],
  ])('maps %s to CONFIG_ERROR (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it('maps PERSISTENCE_OPERATION_FAILED to INFRASTRUCTURE_ERROR (6)', () => {
    expect(mapErrorToExitCode('PERSISTENCE_OPERATION_FAILED')).toBe(6);
  });

  it('maps unknown code to UNEXPECTED_ERROR (1)', () => {
    expect(mapErrorToExitCode('SOME_UNKNOWN_CODE')).toBe(1);
  });

  it('maps real PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED error from disable on disabled source to CONFLICT (4)', () => {
    const workspaceIdResult = parseWorkspaceId('00000000-0000-0000-0000-000000000001');
    if (!workspaceIdResult.success) throw new Error('Expected valid workspace ID.');
    const nowResult = Instant.parse('2026-07-17T12:00:00.000Z');
    if (!nowResult.success) throw new Error('Expected valid instant.');
    const sourceIdResult = parsePlaybookSourceId('00000000-0000-0000-0000-000000000003');
    if (!sourceIdResult.success) throw new Error('Expected valid source ID.');
    const playbookIdResult = parsePlaybookId('00000000-0000-0000-0000-000000000002');
    if (!playbookIdResult.success) throw new Error('Expected valid playbook ID.');
    const externalResult = PlaybookSourceExternalRootReference.create('https://example.com/root');
    if (!externalResult.success) throw new Error('Expected valid external root reference.');
    const configResult = PlaybookSourceConfigurationReference.create('config-1');
    if (!configResult.success) throw new Error('Expected valid configuration reference.');
    const source = PlaybookSource.create({
      playbookSourceId: sourceIdResult.value,
      workspaceId: workspaceIdResult.value,
      playbookId: playbookIdResult.value,
      type: 'notion',
      externalRootReference: externalResult.value,
      configurationReference: configResult.value,
      createdAt: nowResult.value,
    });

    const firstDisableResult = source.disable();
    expect(firstDisableResult.success).toBe(true);
    if (!firstDisableResult.success) {
      throw new Error('Expected the first disable transition to succeed.');
    }

    const secondDisableResult = source.disable();
    expect(secondDisableResult.success).toBe(false);
    if (secondDisableResult.success) {
      throw new Error('Expected second disable to fail.');
    }

    expect(mapErrorToExitCode(secondDisableResult.error.code)).toBe(4);
  });
});
