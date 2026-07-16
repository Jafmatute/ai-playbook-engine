import type { ValidationAttempt, ValidationAttemptId, WorkspaceId } from '@ai-playbook-engine/core';
import type { Result } from '@ai-playbook-engine/shared';

import type { PersistenceOperationFailedError } from '../../persistence/index.js';

export interface ValidationAttemptRepository {
  findById(
    workspaceId: WorkspaceId,
    validationAttemptId: ValidationAttemptId,
  ): Promise<Result<ValidationAttempt | null, PersistenceOperationFailedError>>;
}
