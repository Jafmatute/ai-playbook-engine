import type { PlaybookId, WorkspaceId } from '@ai-playbook-engine/core';

export interface WorkspaceIdGenerator {
  generate(): WorkspaceId;
}

export interface PlaybookIdGenerator {
  generate(): PlaybookId;
}
