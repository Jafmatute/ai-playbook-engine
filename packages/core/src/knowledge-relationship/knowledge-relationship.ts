import { err, ok, type Result } from '@ai-playbook-engine/shared';

import type { Instant } from '../instant.js';
import type { KnowledgeItemId, PlaybookVersionId, WorkspaceId } from '../identifiers.js';
import type { SourceReference, SourceReferenceSnapshot } from '../knowledge-item/index.js';
import { isKnowledgeRelationshipType } from './knowledge-relationship-type.js';
import type {
  CreateKnowledgeRelationshipInput,
  KnowledgeRelationshipSnapshot,
  KnowledgeRelationshipState,
  RestoreKnowledgeRelationshipInput,
} from './knowledge-relationship-contracts.js';
import type {
  KnowledgeRelationshipCreationError,
  KnowledgeRelationshipRestorationError,
} from './knowledge-relationship-errors.js';
import { restorationStateInvalid, selfReference } from './knowledge-relationship-errors.js';
import type { KnowledgeRelationshipType } from './knowledge-relationship-type.js';

export class KnowledgeRelationship {
  readonly #state: KnowledgeRelationshipState;

  private constructor(state: KnowledgeRelationshipState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(
    input: CreateKnowledgeRelationshipInput,
  ): Result<KnowledgeRelationship, KnowledgeRelationshipCreationError> {
    if (input.sourceKnowledgeItemId === input.targetKnowledgeItemId) {
      return err(
        selfReference({
          knowledgeItemId: input.sourceKnowledgeItemId,
          relationshipType: input.type,
        }),
      );
    }

    return ok(
      new KnowledgeRelationship({
        workspaceId: input.workspaceId,
        playbookVersionId: input.playbookVersionId,
        sourceKnowledgeItemId: input.sourceKnowledgeItemId,
        targetKnowledgeItemId: input.targetKnowledgeItemId,
        type: input.type,
        sourceReference: input.sourceReference,
        createdAt: input.createdAt,
      }),
    );
  }

  static restore(
    input: RestoreKnowledgeRelationshipInput,
  ): Result<KnowledgeRelationship, KnowledgeRelationshipRestorationError> {
    if (!isKnowledgeRelationshipType(input.type)) {
      return err(
        restorationStateInvalid({
          field: 'type',
          reason: 'unknown_relationship_type',
          currentValue: input.type,
        }),
      );
    }

    if (input.sourceKnowledgeItemId === input.targetKnowledgeItemId) {
      return err(
        restorationStateInvalid({
          field: 'targetKnowledgeItemId',
          reason: 'self_reference',
          knowledgeItemId: input.sourceKnowledgeItemId,
          relationshipType: input.type,
        }),
      );
    }

    return ok(
      new KnowledgeRelationship({
        workspaceId: input.workspaceId,
        playbookVersionId: input.playbookVersionId,
        sourceKnowledgeItemId: input.sourceKnowledgeItemId,
        targetKnowledgeItemId: input.targetKnowledgeItemId,
        type: input.type,
        sourceReference: input.sourceReference,
        createdAt: input.createdAt,
      }),
    );
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookVersionId(): PlaybookVersionId {
    return this.#state.playbookVersionId;
  }

  get sourceKnowledgeItemId(): KnowledgeItemId {
    return this.#state.sourceKnowledgeItemId;
  }

  get targetKnowledgeItemId(): KnowledgeItemId {
    return this.#state.targetKnowledgeItemId;
  }

  get type(): KnowledgeRelationshipType {
    return this.#state.type;
  }

  get sourceReference(): SourceReference | null {
    return this.#state.sourceReference;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }

  toSnapshot(): KnowledgeRelationshipSnapshot {
    const sourceReference: SourceReferenceSnapshot | null =
      this.#state.sourceReference === null
        ? null
        : Object.freeze({
            provider: this.#state.sourceReference.provider,
            objectType: this.#state.sourceReference.objectType,
            externalId: this.#state.sourceReference.externalId,
          });

    return Object.freeze({
      workspaceId: this.#state.workspaceId,
      playbookVersionId: this.#state.playbookVersionId,
      sourceKnowledgeItemId: this.#state.sourceKnowledgeItemId,
      targetKnowledgeItemId: this.#state.targetKnowledgeItemId,
      type: this.#state.type,
      sourceReference,
      createdAt: this.#state.createdAt.toString(),
    });
  }
}
