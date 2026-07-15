export type PlaybookSourceType = 'notion';

export function isPlaybookSourceType(value: string): value is PlaybookSourceType {
  return value === 'notion';
}
