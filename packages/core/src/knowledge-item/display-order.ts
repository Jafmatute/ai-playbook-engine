import { err, ok, type Result } from '@ai-playbook-engine/shared';

export type DisplayOrderInvalidReason =
  'not_finite' | 'not_integer' | 'negative' | 'unsafe_integer';

export interface DisplayOrderError {
  readonly code: 'DISPLAY_ORDER_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: DisplayOrderInvalidReason;
  };
}

export class DisplayOrder {
  readonly #value: number;

  private constructor(value: number) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(value: number): Result<DisplayOrder, DisplayOrderError> {
    if (!Number.isFinite(value)) {
      return err(displayOrderInvalid('not_finite'));
    }

    if (!Number.isInteger(value)) {
      return err(displayOrderInvalid('not_integer'));
    }

    if (value < 0) {
      return err(displayOrderInvalid('negative'));
    }

    if (!Number.isSafeInteger(value)) {
      return err(displayOrderInvalid('unsafe_integer'));
    }

    return ok(new DisplayOrder(value));
  }

  get value(): number {
    return this.#value;
  }

  equals(other: DisplayOrder): boolean {
    return this.#value === other.#value;
  }

  compare(other: DisplayOrder): number {
    return this.#value - other.#value;
  }

  toString(): string {
    return this.#value.toString();
  }
}

function displayOrderInvalid(reason: DisplayOrderInvalidReason): DisplayOrderError {
  return Object.freeze({
    code: 'DISPLAY_ORDER_INVALID' as const,
    message: 'The display order is invalid.',
    details: Object.freeze({ reason }),
  });
}
