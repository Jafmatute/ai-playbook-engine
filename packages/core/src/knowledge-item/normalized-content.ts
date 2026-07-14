import type { NormalizedText } from './normalized-text.js';

interface NormalizedContentState {
  readonly text: NormalizedText;
}

export interface CreateNormalizedContentInput {
  readonly text: NormalizedText;
}

export class NormalizedContent {
  readonly #state: NormalizedContentState;

  private constructor(state: NormalizedContentState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreateNormalizedContentInput): NormalizedContent {
    return new NormalizedContent({ text: input.text });
  }

  get text(): NormalizedText {
    return this.#state.text;
  }

  equals(other: NormalizedContent): boolean {
    return this.#state.text.equals(other.#state.text);
  }
}
