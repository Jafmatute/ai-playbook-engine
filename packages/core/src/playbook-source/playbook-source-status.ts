export type PlaybookSourceStatus = 'enabled' | 'disabled';

const VALID_PLAYBOOK_SOURCE_STATUSES: ReadonlySet<string> = new Set(['enabled', 'disabled']);

export function isPlaybookSourceStatus(value: string): value is PlaybookSourceStatus {
  return VALID_PLAYBOOK_SOURCE_STATUSES.has(value);
}
