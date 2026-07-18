import type { PlaybookId } from '@ai-playbook-engine/core';

export const ENABLED_PLAYBOOK_SOURCE_CONFLICT = 'ENABLED_PLAYBOOK_SOURCE_CONFLICT';
export const PLAYBOOK_SOURCE_TYPE_UNSUPPORTED = 'PLAYBOOK_SOURCE_TYPE_UNSUPPORTED';

export interface EnabledPlaybookSourceConflictError {
  readonly code: typeof ENABLED_PLAYBOOK_SOURCE_CONFLICT;
  readonly message: string;
  readonly details: { readonly playbookId: string };
}
export function enabledPlaybookSourceConflict(
  playbookId: PlaybookId,
): EnabledPlaybookSourceConflictError {
  return Object.freeze({
    code: ENABLED_PLAYBOOK_SOURCE_CONFLICT,
    message: 'An enabled playbook source already exists for this playbook.',
    details: Object.freeze({ playbookId }),
  });
}

export interface PlaybookSourceTypeUnsupportedError {
  readonly code: typeof PLAYBOOK_SOURCE_TYPE_UNSUPPORTED;
  readonly message: string;
  readonly details: { readonly type: string; readonly supportedTypes: readonly string[] };
}
export function playbookSourceTypeUnsupported(type: string): PlaybookSourceTypeUnsupportedError {
  return Object.freeze({
    code: PLAYBOOK_SOURCE_TYPE_UNSUPPORTED,
    message: 'The playbook source type is not supported.',
    details: Object.freeze({ type, supportedTypes: Object.freeze(['notion']) }),
  });
}
