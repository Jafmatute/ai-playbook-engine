export const ExitCode = {
  SUCCESS: 0,
  UNEXPECTED_ERROR: 1,
  INVALID_INPUT: 2,
  NOT_FOUND: 3,
  CONFLICT: 4,
  CONFIG_ERROR: 5,
  INFRASTRUCTURE_ERROR: 6,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
