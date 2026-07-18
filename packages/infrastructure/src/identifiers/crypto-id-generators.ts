import { randomUUID } from 'node:crypto';

import type { PlaybookIdGenerator, WorkspaceIdGenerator } from '@ai-playbook-engine/application';
import { parseWorkspaceId, parsePlaybookId } from '@ai-playbook-engine/core';

export class CryptoWorkspaceIdGenerator implements WorkspaceIdGenerator {
  generate() {
    const raw = randomUUID();
    const result = parseWorkspaceId(raw);
    if (!result.success) {
      throw new Error('CryptoWorkspaceIdGenerator: randomUUID produced an invalid WorkspaceId.');
    }

    return result.value;
  }
}

export class CryptoPlaybookIdGenerator implements PlaybookIdGenerator {
  generate() {
    const raw = randomUUID();
    const result = parsePlaybookId(raw);
    if (!result.success) {
      throw new Error('CryptoPlaybookIdGenerator: randomUUID produced an invalid PlaybookId.');
    }

    return result.value;
  }
}
