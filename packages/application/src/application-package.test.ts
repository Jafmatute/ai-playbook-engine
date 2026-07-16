import { describe, expect, it } from 'vitest';

import { APPLICATION_PACKAGE_NAME } from './index.js';

describe('@ai-playbook-engine/application', () => {
  it('exports APPLICATION_PACKAGE_NAME with the correct value', () => {
    expect(APPLICATION_PACKAGE_NAME).toBe('@ai-playbook-engine/application');
  });
});
