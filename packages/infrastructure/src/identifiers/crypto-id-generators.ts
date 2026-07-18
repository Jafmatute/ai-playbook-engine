import { randomUUID } from 'node:crypto';

import type {
  PlaybookIdGenerator,
  PlaybookSourceIdGenerator,
  WorkspaceIdGenerator,
} from '@ai-playbook-engine/application';
import { parseWorkspaceId, parsePlaybookId, parsePlaybookSourceId } from '@ai-playbook-engine/core';

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

export class CryptoPlaybookSourceIdGenerator implements PlaybookSourceIdGenerator {
  generate() {
    const result = parsePlaybookSourceId(randomUUID());
    if (!result.success)
      throw new Error(
        'CryptoPlaybookSourceIdGenerator: randomUUID produced an invalid PlaybookSourceId.',
      );
    return result.value;
  }
}
