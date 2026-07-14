import { isKnowledgeType, type KnowledgeType } from './knowledge-type.js';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export interface SectionAttributes {
  readonly type: 'section';
}

export interface MethodologyAttributes {
  readonly type: 'methodology';
}

export interface WorkflowAttributes {
  readonly type: 'workflow';
}

export interface PromptDefinitionAttributes {
  readonly type: 'prompt_definition';
}

export interface CriterionAttributes {
  readonly type: 'criterion';
}

export interface DecisionMatrixAttributes {
  readonly type: 'decision_matrix';
}

export interface AuditDefinitionAttributes {
  readonly type: 'audit_definition';
}

export interface ReferenceDocumentAttributes {
  readonly type: 'reference_document';
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type KnowledgeItemAttributes =
  | SectionAttributes
  | MethodologyAttributes
  | WorkflowAttributes
  | PromptDefinitionAttributes
  | CriterionAttributes
  | DecisionMatrixAttributes
  | AuditDefinitionAttributes
  | ReferenceDocumentAttributes;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createKnowledgeItemAttributes(type: KnowledgeType): KnowledgeItemAttributes {
  switch (type) {
    case 'section':
      return Object.freeze({ type: 'section' });
    case 'methodology':
      return Object.freeze({ type: 'methodology' });
    case 'workflow':
      return Object.freeze({ type: 'workflow' });
    case 'prompt_definition':
      return Object.freeze({ type: 'prompt_definition' });
    case 'criterion':
      return Object.freeze({ type: 'criterion' });
    case 'decision_matrix':
      return Object.freeze({ type: 'decision_matrix' });
    case 'audit_definition':
      return Object.freeze({ type: 'audit_definition' });
    case 'reference_document':
      return Object.freeze({ type: 'reference_document' });
  }
}

// ---------------------------------------------------------------------------
// Compatibility check
// ---------------------------------------------------------------------------

export function knowledgeItemAttributesMatchType(
  attributes: KnowledgeItemAttributes,
  type: KnowledgeType,
): boolean {
  return attributes.type === type;
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isKnowledgeItemAttributes(value: unknown): value is KnowledgeItemAttributes {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);

  if (keys.length !== 1 || keys[0] !== 'type') {
    return false;
  }

  const candidate = value as { readonly type?: unknown };

  return typeof candidate.type === 'string' && isKnowledgeType(candidate.type);
}
