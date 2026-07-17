import type {
  NormalizationAttempt,
  NormalizationAttemptId,
  PlaybookVersionId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface NormalizationAttemptRepository {
  findById(
    workspaceId: WorkspaceId,
    normalizationAttemptId: NormalizationAttemptId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>>;

  findLatestByPlaybookVersionId(
    workspaceId: WorkspaceId,
    playbookVersionId: PlaybookVersionId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>>;
}
