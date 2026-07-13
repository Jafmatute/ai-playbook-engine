import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_KNOWLEDGE_SLUG_LENGTH = 128;

const KNOWLEDGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type KnowledgeSlugInvalidReason = 'empty' | 'too_long' | 'invalid_format';

export interface KnowledgeSlugError {
  readonly code: 'KNOWLEDGE_SLUG_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: KnowledgeSlugInvalidReason;
  };
}

export class KnowledgeSlug {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<KnowledgeSlug, KnowledgeSlugError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(knowledgeSlugInvalid('empty'));
    }

    if (value.length > MAX_KNOWLEDGE_SLUG_LENGTH) {
      return err(knowledgeSlugInvalid('too_long'));
    }

    if (!KNOWLEDGE_SLUG_PATTERN.test(value)) {
      return err(knowledgeSlugInvalid('invalid_format'));
    }

    return ok(new KnowledgeSlug(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: KnowledgeSlug): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}

function knowledgeSlugInvalid(reason: KnowledgeSlugInvalidReason): KnowledgeSlugError {
  return Object.freeze({
    code: 'KNOWLEDGE_SLUG_INVALID' as const,
    message: 'The knowledge slug is invalid.',
    details: Object.freeze({ reason }),
  });
}
