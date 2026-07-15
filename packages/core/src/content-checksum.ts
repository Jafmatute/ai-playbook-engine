import { err, ok, type Result } from '@ai-playbook-engine/shared';

export type ContentChecksumAlgorithm = 'sha256';

export type ContentChecksumInvalidReason =
  | 'empty'
  | 'invalid_format'
  | 'unsupported_algorithm'
  | 'invalid_digest_length'
  | 'invalid_digest_characters'
  | 'contains_control_characters';

export interface ContentChecksumInvalidError {
  readonly code: 'CONTENT_CHECKSUM_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: ContentChecksumInvalidReason;
  };
}

interface ContentChecksumState {
  readonly value: string;
  readonly algorithm: ContentChecksumAlgorithm;
  readonly digest: string;
}

const hex64Pattern = /^[0-9a-f]{64}$/;

function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export class ContentChecksum {
  readonly #state: ContentChecksumState;

  private constructor(state: ContentChecksumState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(value: string): Result<ContentChecksum, ContentChecksumInvalidError> {
    if (hasControlCharacters(value)) {
      return err(contentChecksumInvalid('contains_control_characters'));
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return err(contentChecksumInvalid('empty'));
    }

    const separatorIndex = trimmed.indexOf(':');

    if (separatorIndex <= 0 || trimmed.indexOf(':', separatorIndex + 1) !== -1) {
      return err(contentChecksumInvalid('invalid_format'));
    }

    const algorithm = trimmed.slice(0, separatorIndex);
    const digest = trimmed.slice(separatorIndex + 1);

    if (digest.length === 0) {
      return err(contentChecksumInvalid('invalid_format'));
    }

    if (algorithm !== 'sha256') {
      return err(contentChecksumInvalid('unsupported_algorithm'));
    }

    if (digest.length !== 64) {
      return err(contentChecksumInvalid('invalid_digest_length'));
    }

    if (!hex64Pattern.test(digest)) {
      return err(contentChecksumInvalid('invalid_digest_characters'));
    }

    return ok(
      new ContentChecksum({
        value: trimmed,
        algorithm,
        digest,
      }),
    );
  }

  get value(): string {
    return this.#state.value;
  }

  get algorithm(): ContentChecksumAlgorithm {
    return this.#state.algorithm;
  }

  get digest(): string {
    return this.#state.digest;
  }

  toString(): string {
    return this.#state.value;
  }

  equals(other: ContentChecksum): boolean {
    return this.#state.value === other.#state.value;
  }
}

function contentChecksumInvalid(reason: ContentChecksumInvalidReason): ContentChecksumInvalidError {
  return Object.freeze({
    code: 'CONTENT_CHECKSUM_INVALID' as const,
    message: 'The content checksum is invalid.',
    details: Object.freeze({
      reason,
    }),
  });
}
