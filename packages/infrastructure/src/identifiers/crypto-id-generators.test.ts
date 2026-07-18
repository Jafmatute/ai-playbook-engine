import { describe, expect, it } from 'vitest';

import {
  CryptoWorkspaceIdGenerator,
  CryptoPlaybookIdGenerator,
  CryptoPlaybookSourceIdGenerator,
} from './index.js';
import { parseWorkspaceId, parsePlaybookId, parsePlaybookSourceId } from '@ai-playbook-engine/core';

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

describe('CryptoPlaybookSourceIdGenerator', () => {
  it('generates canonical UUIDs accepted as PlaybookSourceId', () => {
    const id = new CryptoPlaybookSourceIdGenerator().generate();
    expect(parsePlaybookSourceId(id).success).toBe(true);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('generates different values on successive calls', () => {
    const generator = new CryptoPlaybookSourceIdGenerator();
    expect(generator.generate()).not.toBe(generator.generate());
  });
});
