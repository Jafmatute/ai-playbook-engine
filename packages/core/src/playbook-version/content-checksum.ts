import { err, ok, type Result } from '@ai-playbook-engine/shared';

export type ContentChecksumAlgorithm = 'sha256';

export interface ContentChecksumError {
  readonly code: 'CONTENT_CHECKSUM_INVALID';
  readonly message: string;
  readonly details: {
    readonly algorithm: string;
    readonly reason:
      | 'unsupported_algorithm'
      | 'empty'
      | 'invalid_length'
      | 'invalid_format'
      | 'surrounding_whitespace';
    readonly expectedLength: number;
    readonly actualLength: number;
  };
}

const sha256Pattern = /^[0-9a-fA-F]{64}$/;
const sha256Length = 64;

export class ContentChecksum {
  readonly #algorithm: ContentChecksumAlgorithm;
  readonly #value: string;

  private constructor(algorithm: ContentChecksumAlgorithm, value: string) {
    this.#algorithm = algorithm;
    this.#value = value;
    Object.freeze(this);
  }

  static create(input: {
    algorithm: string;
    value: string;
  }): Result<ContentChecksum, ContentChecksumError> {
    if (input.algorithm !== 'sha256') {
      return err(
        contentChecksumInvalid(input.algorithm, 'unsupported_algorithm', input.value.length),
      );
    }

    if (input.value.length === 0) {
      return err(contentChecksumInvalid(input.algorithm, 'empty', 0));
    }

    if (input.value !== input.value.trim()) {
      return err(
        contentChecksumInvalid(input.algorithm, 'surrounding_whitespace', input.value.length),
      );
    }

    if (!sha256Pattern.test(input.value)) {
      if (input.value.length !== sha256Length) {
        return err(contentChecksumInvalid(input.algorithm, 'invalid_length', input.value.length));
      }

      return err(contentChecksumInvalid(input.algorithm, 'invalid_format', input.value.length));
    }

    return ok(new ContentChecksum('sha256', input.value.toLowerCase()));
  }

  get algorithm(): ContentChecksumAlgorithm {
    return this.#algorithm;
  }

  get value(): string {
    return this.#value;
  }

  equals(other: ContentChecksum): boolean {
    return this.#algorithm === other.#algorithm && this.#value === other.#value;
  }

  toString(): string {
    return `${this.#algorithm}:${this.#value}`;
  }
}

function contentChecksumInvalid(
  algorithm: string,
  reason: ContentChecksumError['details']['reason'],
  actualLength: number,
): ContentChecksumError {
  return Object.freeze({
    code: 'CONTENT_CHECKSUM_INVALID' as const,
    message: 'The content checksum is invalid.',
    details: Object.freeze({
      algorithm,
      reason,
      expectedLength: sha256Length,
      actualLength,
    }),
  });
}
