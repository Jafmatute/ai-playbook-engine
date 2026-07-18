import type { Instant } from '@ai-playbook-engine/core';

export interface Clock {
  now(): Instant;
}
