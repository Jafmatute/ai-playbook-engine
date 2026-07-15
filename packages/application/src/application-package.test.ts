import { describe, expect, it } from 'vitest';

import { APPLICATION_PACKAGE_NAME } from './index.js';

import type { WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

interface ApprovedApplicationDependencies {
  readonly workspaceId: WorkspaceId;
  readonly result: Result<void, never>;
}

const _typeCheckGuard: ApprovedApplicationDependencies =
  null as unknown as ApprovedApplicationDependencies;

void _typeCheckGuard;

describe('@ai-playbook-engine/application', () => {
  it('exports APPLICATION_PACKAGE_NAME with the correct value', () => {
    expect(APPLICATION_PACKAGE_NAME).toBe('@ai-playbook-engine/application');
  });
});
