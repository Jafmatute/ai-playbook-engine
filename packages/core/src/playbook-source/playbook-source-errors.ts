import type { PlaybookSourceStatus } from './playbook-source-status.js';

export type PlaybookSourceTransitionOperation = 'disable' | 'enable';

export interface PlaybookSourceTransitionNotAllowedError {
  readonly code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED';
  readonly message: string;
  readonly details: {
    readonly operation: PlaybookSourceTransitionOperation;
    readonly currentStatus: PlaybookSourceStatus;
    readonly expectedStatus: PlaybookSourceStatus;
  };
}

export type PlaybookSourceTransitionError = PlaybookSourceTransitionNotAllowedError;

export type PlaybookSourceStateInvalidReason =
  | 'UNKNOWN_PLAYBOOK_SOURCE_STATUS'
  | 'SUCCESSFUL_RUN_ID_REQUIRES_TIMESTAMP'
  | 'SUCCESSFUL_TIMESTAMP_REQUIRES_RUN_ID'
  | 'SUCCESSFUL_TIMESTAMP_BEFORE_CREATED_AT'
  | 'FAILED_RUN_ID_REQUIRES_TIMESTAMP'
  | 'FAILED_TIMESTAMP_REQUIRES_RUN_ID'
  | 'FAILED_TIMESTAMP_BEFORE_CREATED_AT'
  | 'SAME_RUN_RECORDED_AS_SUCCESS_AND_FAILURE';

export interface PlaybookSourceStateInvalidError {
  readonly code: 'PLAYBOOK_SOURCE_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: PlaybookSourceStateInvalidReason;
  };
}

export type PlaybookSourceRestorationError = PlaybookSourceStateInvalidError;

export type PlaybookSourceSynchronizationMetadataField =
  'lastSuccessfulSynchronization' | 'lastFailedSynchronization';

export type PlaybookSourceSynchronizationMetadataInvalidReason =
  | 'unchanged'
  | 'run_timestamp_conflict'
  | 'timestamp_before_created'
  | 'timestamp_before_last_success'
  | 'timestamp_before_last_failure'
  | 'run_outcome_conflict'
  | 'run_id_without_timestamp'
  | 'timestamp_without_run_id';

export interface PlaybookSourceSynchronizationMetadataInvalidError {
  readonly code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: PlaybookSourceSynchronizationMetadataField;
    readonly reason: PlaybookSourceSynchronizationMetadataInvalidReason;
  };
}

export type PlaybookSourceSynchronizationMetadataError =
  PlaybookSourceSynchronizationMetadataInvalidError;

export function transitionNotAllowed(
  details: PlaybookSourceTransitionNotAllowedError['details'],
): PlaybookSourceTransitionNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED' as const,
    message: 'The playbook source transition is not allowed.',
    details: Object.freeze({ ...details }),
  });
}

export type PlaybookSourceUpdateField = 'externalRootReference' | 'configurationReference';

export type PlaybookSourceUpdateInvalidReason = 'unchanged';

export interface PlaybookSourceUpdateInvalidError {
  readonly code: 'PLAYBOOK_SOURCE_UPDATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly field: PlaybookSourceUpdateField;
    readonly reason: PlaybookSourceUpdateInvalidReason;
  };
}

export type PlaybookSourceUpdateError = PlaybookSourceUpdateInvalidError;

export function stateInvalid(
  reason: PlaybookSourceStateInvalidReason,
): PlaybookSourceStateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_STATE_INVALID' as const,
    message: 'The playbook source state is invalid.',
    details: Object.freeze({ reason }),
  });
}

export function updateInvalid(
  details: PlaybookSourceUpdateInvalidError['details'],
): PlaybookSourceUpdateInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_UPDATE_INVALID' as const,
    message: 'The playbook source update is invalid.',
    details: Object.freeze({ ...details }),
  });
}

export function synchronizationMetadataInvalid(
  details: PlaybookSourceSynchronizationMetadataInvalidError['details'],
): PlaybookSourceSynchronizationMetadataInvalidError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_SYNCHRONIZATION_METADATA_INVALID' as const,
    message: 'The playbook source synchronization metadata is invalid.',
    details: Object.freeze({ ...details }),
  });
}
