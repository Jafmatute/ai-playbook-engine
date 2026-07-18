import { describe, expect, it } from 'vitest';

import { SystemClock } from './index.js';
import { Instant } from '@ai-playbook-engine/core';

describe('SystemClock', () => {
  it('now() returns an Instant', () => {
    const clock = new SystemClock();
    const instant = clock.now();

    expect(instant).toBeInstanceOf(Instant);
    expect(typeof instant.toString()).toBe('string');
  });
});
