export const playbookStatuses = Object.freeze(['active', 'archived'] as const);

export type PlaybookStatus = (typeof playbookStatuses)[number];
