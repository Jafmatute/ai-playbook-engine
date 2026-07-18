import { describe, expect, it } from 'vitest';

import { CryptoWorkspaceIdGenerator, CryptoPlaybookIdGenerator } from './index.js';
import { parseWorkspaceId, parsePlaybookId } from '@ai-playbook-engine/core';

describe('CryptoWorkspaceIdGenerator', () => {
  it('generates a valid WorkspaceId', () => {
    const generator = new CryptoWorkspaceIdGenerator();
    const id = generator.generate();

    const parsed = parseWorkspaceId(id);
    expect(parsed.success).toBe(true);
  });
});

describe('CryptoPlaybookIdGenerator', () => {
  it('generates a valid PlaybookId', () => {
    const generator = new CryptoPlaybookIdGenerator();
    const id = generator.generate();

    const parsed = parsePlaybookId(id);
    expect(parsed.success).toBe(true);
  });
});
