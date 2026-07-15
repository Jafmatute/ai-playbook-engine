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

export type PlaybookSourceStateInvalidReason = 'UNKNOWN_PLAYBOOK_SOURCE_STATUS';

export interface PlaybookSourceStateInvalidError {
  readonly code: 'PLAYBOOK_SOURCE_STATE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: PlaybookSourceStateInvalidReason;
  };
}

export type PlaybookSourceRestorationError = PlaybookSourceStateInvalidError;

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
