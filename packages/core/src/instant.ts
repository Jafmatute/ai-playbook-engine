import { err, ok, type Result } from '@ai-playbook-engine/shared';

export interface InstantError {
  readonly code: 'INVALID_INSTANT';
  readonly message: string;
  readonly details: Readonly<Record<string, never>>;
}

const isoInstantPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export class Instant {
  readonly #value: string;
  readonly #millisecondsSinceEpoch: number;

  private constructor(value: string, millisecondsSinceEpoch: number) {
    this.#value = value;
    this.#millisecondsSinceEpoch = millisecondsSinceEpoch;
    Object.freeze(this);
  }

  static parse(rawValue: string): Result<Instant, InstantError> {
    const match = isoInstantPattern.exec(rawValue);
    if (match === null || !hasValidDateAndTime(match)) {
      return err(invalidInstant());
    }

    const millisecondsSinceEpoch = Date.parse(rawValue);
    if (!Number.isFinite(millisecondsSinceEpoch)) {
      return err(invalidInstant());
    }

    return ok(new Instant(new Date(millisecondsSinceEpoch).toISOString(), millisecondsSinceEpoch));
  }

  static fromDate(value: Date): Result<Instant, InstantError> {
    const millisecondsSinceEpoch = value.getTime();
    if (!Number.isFinite(millisecondsSinceEpoch)) {
      return err(invalidInstant());
    }

    return ok(new Instant(new Date(millisecondsSinceEpoch).toISOString(), millisecondsSinceEpoch));
  }

  toString(): string {
    return this.#value;
  }

  equals(other: Instant): boolean {
    return this.#millisecondsSinceEpoch === other.#millisecondsSinceEpoch;
  }

  compare(other: Instant): number {
    return Math.sign(this.#millisecondsSinceEpoch - other.#millisecondsSinceEpoch);
  }
}

function hasValidDateAndTime(match: RegExpExecArray): boolean {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const timezone = match[8];

  if (timezone === undefined) {
    return false;
  }

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    (timezone === 'Z' || Number(timezone.slice(1, 3)) <= 23) &&
    (timezone === 'Z' || Number(timezone.slice(4, 6)) <= 59)
  );
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function invalidInstant(): InstantError {
  return Object.freeze({
    code: 'INVALID_INSTANT' as const,
    message: 'The value must be a valid ISO 8601 instant.',
    details: Object.freeze({}),
  });
}
