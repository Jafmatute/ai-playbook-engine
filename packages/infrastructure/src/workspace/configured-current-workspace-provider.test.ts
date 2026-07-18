import { describe, expect, it } from 'vitest';

import { ConfiguredCurrentWorkspaceProvider } from './index.js';
import { CURRENT_WORKSPACE_UNAVAILABLE } from '@ai-playbook-engine/application';

const validUuid = 'de305d54-75b4-431b-adb2-eb6b9e546014';

describe('ConfiguredCurrentWorkspaceProvider', () => {
  it('returns workspace ID when valid UUID is configured', () => {
    const provider = new ConfiguredCurrentWorkspaceProvider(validUuid);
    const result = provider.getCurrentWorkspaceId();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(validUuid);
    }
  });

  it('returns CURRENT_WORKSPACE_UNAVAILABLE when workspaceId is undefined', () => {
    const provider = new ConfiguredCurrentWorkspaceProvider(undefined);
    const result = provider.getCurrentWorkspaceId();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CURRENT_WORKSPACE_UNAVAILABLE);
    }
  });

  it('returns CURRENT_WORKSPACE_UNAVAILABLE when workspaceId is an invalid UUID', () => {
    const provider = new ConfiguredCurrentWorkspaceProvider('not-a-uuid');
    const result = provider.getCurrentWorkspaceId();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(CURRENT_WORKSPACE_UNAVAILABLE);
    }
  });
});
