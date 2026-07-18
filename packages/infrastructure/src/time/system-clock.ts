import type { Clock } from '@ai-playbook-engine/application';
import { Instant } from '@ai-playbook-engine/core';

export class SystemClock implements Clock {
  now(): Instant {
    const result = Instant.fromDate(new Date());
    if (!result.success) {
      throw new Error('SystemClock: Failed to create Instant from current date.');
    }

    return result.value;
  }
}
