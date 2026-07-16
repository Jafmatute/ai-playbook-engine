import type {
  NormalizationAttempt,
  NormalizationAttemptId,
  WorkspaceId,
} from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface NormalizationAttemptRepository {
  findById(
    workspaceId: WorkspaceId,
    normalizationAttemptId: NormalizationAttemptId,
  ): Promise<Result<NormalizationAttempt | null, PersistenceOperationFailedError>>;
}
