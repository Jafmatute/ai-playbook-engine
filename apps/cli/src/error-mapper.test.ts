import { describe, expect, it } from 'vitest';

import { mapErrorToExitCode } from './error-mapper.js';

describe('mapErrorToExitCode', () => {
  it.each([
    ['INVALID_IDENTIFIER', 2],
    ['WORKSPACE_NAME_REQUIRED', 2],
    ['PAGINATION_INVALID', 2],
  ])('maps %s to INVALID_INPUT (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it.each([
    ['WORKSPACE_NOT_FOUND', 3],
    ['PLAYBOOK_NOT_FOUND', 3],
  ])('maps %s to NOT_FOUND (%i)', (code, expected) => {
    expect(mapErrorToExitCode(code)).toBe(expected);
  });

  it.each([
    ['WORKSPACE_ALREADY_INITIALIZED', 4],
    ['PLAYBOOK_NAME_CONFLICT', 4],
    ['WORKSPACE_NOT_ACTIVE', 4],
    ['PERSISTENCE_REVISION_CONFLICT', 4],
    ['PLAYBOOK_OPERATION_NOT_ALLOWED', 4],
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
});
