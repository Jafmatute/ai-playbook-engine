export const normalizationStatuses = Object.freeze([
  'pending',
  'running',
  'completed',
  'failed',
] as const);

export type NormalizationStatus = (typeof normalizationStatuses)[number];
