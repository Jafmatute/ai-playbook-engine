import { err, ok, type Result } from '@ai-playbook-engine/shared';

const MAX_KNOWLEDGE_TITLE_LENGTH = 256;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_PATTERN = /[\x00-\x1f\x7f]/;

export type KnowledgeTitleInvalidReason = 'empty' | 'too_long' | 'contains_control_character';

export interface KnowledgeTitleError {
  readonly code: 'KNOWLEDGE_TITLE_INVALID';
  readonly message: string;
  readonly details: {
    readonly reason: KnowledgeTitleInvalidReason;
  };
}

export class KnowledgeTitle {
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  static create(rawValue: string): Result<KnowledgeTitle, KnowledgeTitleError> {
    const value = rawValue.trim();

    if (value.length === 0) {
      return err(knowledgeTitleInvalid('empty'));
    }

    if (value.length > MAX_KNOWLEDGE_TITLE_LENGTH) {
      return err(knowledgeTitleInvalid('too_long'));
    }

    if (CONTROL_CHARACTER_PATTERN.test(value)) {
      return err(knowledgeTitleInvalid('contains_control_character'));
    }

    return ok(new KnowledgeTitle(value));
  }

  get value(): string {
    return this.#value;
  }

  equals(other: KnowledgeTitle): boolean {
    return this.#value === other.#value;
  }

  toString(): string {
    return this.#value;
  }
}

function knowledgeTitleInvalid(reason: KnowledgeTitleInvalidReason): KnowledgeTitleError {
  return Object.freeze({
    code: 'KNOWLEDGE_TITLE_INVALID' as const,
    message: 'The knowledge title is invalid.',
    details: Object.freeze({ reason }),
  });
}
