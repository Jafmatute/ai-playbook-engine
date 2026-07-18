export const PLAYBOOK_NAME_CONFLICT = 'PLAYBOOK_NAME_CONFLICT' as const;

export interface PlaybookNameConflictError {
  readonly code: typeof PLAYBOOK_NAME_CONFLICT;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function playbookNameConflict(): PlaybookNameConflictError {
  return Object.freeze({
    code: PLAYBOOK_NAME_CONFLICT,
    message: 'A playbook with the same name already exists in this workspace.',
    details: Object.freeze({}),
  });
}

export const PLAYBOOK_NOT_FOUND = 'PLAYBOOK_NOT_FOUND' as const;

export interface PlaybookNotFoundError {
  readonly code: typeof PLAYBOOK_NOT_FOUND;
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

export function playbookNotFound(): PlaybookNotFoundError {
  return Object.freeze({
    code: PLAYBOOK_NOT_FOUND,
    message: 'The playbook was not found in the current workspace.',
    details: Object.freeze({}),
  });
}
