import type { PlaybookId, PlaybookSourceId, WorkspaceId } from '@ai-playbook-engine/core';

export interface WorkspaceIdGenerator {
  generate(): WorkspaceId;
}

export interface PlaybookIdGenerator {
  generate(): PlaybookId;
}
export interface PlaybookSourceIdGenerator {
  generate(): PlaybookSourceId;
}
