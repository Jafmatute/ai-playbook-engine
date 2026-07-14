import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type {
  KnowledgeItemId,
  PlaybookId,
  PlaybookVersionId,
  WorkspaceId,
} from '../identifiers.js';
import type { Instant } from '../instant.js';
import type { ContentChecksum } from '../playbook-version/index.js';
import type { DisplayOrder } from './display-order.js';
import type { KnowledgeItemAttributes } from './knowledge-item-attributes.js';
import {
  isKnowledgeItemAttributes,
  knowledgeItemAttributesMatchType,
} from './knowledge-item-attributes.js';
import type {
  CreateKnowledgeItemInput,
  KnowledgeItemSnapshot,
  RestoreKnowledgeItemInput,
  KnowledgeItemState,
} from './knowledge-item-contracts.js';
import type {
  KnowledgeItemCreationError,
  KnowledgeItemRestorationError,
} from './knowledge-item-errors.js';
import { attributesTypeMismatch, restorationStateInvalid } from './knowledge-item-errors.js';
import { isKnowledgeItemValidationState } from './knowledge-item-validation-state.js';
import type { KnowledgeItemValidationState } from './knowledge-item-validation-state.js';
import type { KnowledgeSlug } from './knowledge-slug.js';
import type { KnowledgeTitle } from './knowledge-title.js';
import type { KnowledgeType } from './knowledge-type.js';
import type { NormalizedContent } from './normalized-content.js';
import type { SourceReference } from './source-reference.js';
import type { SourceStableKey } from './source-stable-key.js';

export class KnowledgeItem {
  readonly #state: KnowledgeItemState;

  private constructor(state: KnowledgeItemState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(
    input: CreateKnowledgeItemInput,
  ): Result<KnowledgeItem, KnowledgeItemCreationError> {
    if (!knowledgeItemAttributesMatchType(input.attributes, input.type)) {
      return err(
        attributesTypeMismatch({
          knowledgeType: input.type,
          attributesType: input.attributes.type,
        }),
      );
    }

    return ok(
      new KnowledgeItem({
        knowledgeItemId: input.knowledgeItemId,
        workspaceId: input.workspaceId,
        playbookId: input.playbookId,
        playbookVersionId: input.playbookVersionId,
        type: input.type,
        sourceStableKey: input.sourceStableKey,
        title: input.title,
        slug: input.slug,
        content: input.content,
        attributes: input.attributes,
        sourceReference: input.sourceReference,
        parentKnowledgeItemId: input.parentKnowledgeItemId,
        displayOrder: input.displayOrder,
        contentChecksum: input.contentChecksum,
        validationState: 'pending',
        createdAt: input.createdAt,
      }),
    );
  }

  static restore(
    input: RestoreKnowledgeItemInput,
  ): Result<KnowledgeItem, KnowledgeItemRestorationError> {
    if (!isKnowledgeItemAttributes(input.attributes)) {
      return err(restorationStateInvalid({ field: 'attributes', reason: 'invalid_attributes' }));
    }

    if (!knowledgeItemAttributesMatchType(input.attributes, input.type)) {
      return err(
        restorationStateInvalid({
          field: 'attributes',
          reason: 'attributes_type_mismatch',
          knowledgeType: input.type,
          attributesType: input.attributes.type,
        }),
      );
    }

    if (!isKnowledgeItemValidationState(input.validationState)) {
      return err(
        restorationStateInvalid({
          field: 'validationState',
          reason: 'unknown_validation_state',
          currentValue: input.validationState,
        }),
      );
    }

    return ok(
      new KnowledgeItem({
        knowledgeItemId: input.knowledgeItemId,
        workspaceId: input.workspaceId,
        playbookId: input.playbookId,
        playbookVersionId: input.playbookVersionId,
        type: input.type,
        sourceStableKey: input.sourceStableKey,
        title: input.title,
        slug: input.slug,
        content: input.content,
        attributes: input.attributes,
        sourceReference: input.sourceReference,
        parentKnowledgeItemId: input.parentKnowledgeItemId,
        displayOrder: input.displayOrder,
        contentChecksum: input.contentChecksum,
        validationState: input.validationState,
        createdAt: input.createdAt,
      }),
    );
  }

  get id(): KnowledgeItemId {
    return this.#state.knowledgeItemId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookId(): PlaybookId {
    return this.#state.playbookId;
  }

  get playbookVersionId(): PlaybookVersionId {
    return this.#state.playbookVersionId;
  }

  get type(): KnowledgeType {
    return this.#state.type;
  }

  get sourceStableKey(): SourceStableKey {
    return this.#state.sourceStableKey;
  }

  get title(): KnowledgeTitle {
    return this.#state.title;
  }

  get slug(): KnowledgeSlug | null {
    return this.#state.slug;
  }

  get content(): NormalizedContent {
    return this.#state.content;
  }

  get attributes(): KnowledgeItemAttributes {
    return this.#state.attributes;
  }

  get sourceReference(): SourceReference {
    return this.#state.sourceReference;
  }

  get parentKnowledgeItemId(): KnowledgeItemId | null {
    return this.#state.parentKnowledgeItemId;
  }

  get displayOrder(): DisplayOrder {
    return this.#state.displayOrder;
  }

  get contentChecksum(): ContentChecksum {
    return this.#state.contentChecksum;
  }

  get validationState(): KnowledgeItemValidationState {
    return this.#state.validationState;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  toSnapshot(): KnowledgeItemSnapshot {
    return Object.freeze({
      knowledgeItemId: this.#state.knowledgeItemId,
      workspaceId: this.#state.workspaceId,
      playbookId: this.#state.playbookId,
      playbookVersionId: this.#state.playbookVersionId,
      type: this.#state.type,
      sourceStableKey: this.#state.sourceStableKey.value,
      title: this.#state.title.value,
      slug: this.#state.slug?.value ?? null,
      content: Object.freeze({
        text: this.#state.content.text.value,
      }),
      attributes: Object.freeze({
        type: this.#state.attributes.type,
      }),
      sourceReference: Object.freeze({
        provider: this.#state.sourceReference.provider,
        objectType: this.#state.sourceReference.objectType,
        externalId: this.#state.sourceReference.externalId,
      }),
      parentKnowledgeItemId: this.#state.parentKnowledgeItemId,
      displayOrder: this.#state.displayOrder.value,
      contentChecksum: Object.freeze({
        algorithm: this.#state.contentChecksum.algorithm,
        value: this.#state.contentChecksum.value,
      }),
      validationState: this.#state.validationState,
      createdAt: this.#state.createdAt.toString(),
    });
  }
}
