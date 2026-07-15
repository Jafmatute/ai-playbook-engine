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

export function transitionNotAllowed(
  details: PlaybookSourceTransitionNotAllowedError['details'],
): PlaybookSourceTransitionNotAllowedError {
  return Object.freeze({
    code: 'PLAYBOOK_SOURCE_TRANSITION_NOT_ALLOWED' as const,
    message: 'The playbook source transition is not allowed.',
    details: Object.freeze({ ...details }),
  });
}
