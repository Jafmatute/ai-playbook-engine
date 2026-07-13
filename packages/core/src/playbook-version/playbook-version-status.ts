export const playbookVersionStatuses = Object.freeze([
  'draft',
  'validating',
  'validated',
  'invalid',
  'published',
  'archived',
] as const);

export type PlaybookVersionStatus = (typeof playbookVersionStatuses)[number];
