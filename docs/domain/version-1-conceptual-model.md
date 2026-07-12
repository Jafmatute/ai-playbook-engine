# AI Playbook Engine — Version 1 Conceptual Domain Model

## Purpose

This document defines the conceptual domain model for the first vertical slice of AI Playbook Engine.

The vertical slice covers:

```text
Workspace
  ↓
Playbook
  ↓
Playbook Source
  ↓
Synchronization Run
  ↓
Synchronization Snapshot
  ↓
Playbook Version
  ↓
Knowledge Items
  ↓
Validation Findings
```

The model establishes:

* Domain identifiers.
* Aggregate Roots.
* Entities.
* Value Objects.
* Domain services.
* Domain policies.
* Invariants.
* Relationships.
* Ownership boundaries.
* Candidate domain events.

This document does not define:

* TypeScript classes.
* Database tables.
* ORM models.
* HTTP schemas.
* CLI command payloads.
* Persistence implementation.
* External SDK contracts.

Names may be refined during implementation, but their domain meaning must remain consistent with the ubiquitous language.

---

# Modeling Principles

## Domain Meaning Before Storage

Concepts must be modeled according to their business meaning and lifecycle.

The model must not be shaped primarily by:

* Database normalization.
* ORM limitations.
* Notion API response structures.
* CLI command requirements.
* Serialization convenience.

Persistence models may differ from domain models.

## Explicit Identity

Aggregate Roots and independently traceable records require explicit identifiers.

Identifiers must:

* Be immutable.
* Be globally unique unless explicitly scoped.
* Be opaque to the domain.
* Avoid embedding mutable business meaning.
* Be represented through distinct domain types.

The domain must not use plain strings interchangeably for unrelated identifiers.

## Immutable Historical Records

The following concepts are historical and must not be rewritten after reaching their immutable state:

* Synchronization Snapshot.
* Published Playbook Version content.
* Invalid Playbook Version validation outcome.
* Knowledge Items belonging to a finalized version.
* Validation Findings associated with completed validation.

## Workspace Ownership

Tenant-owned concepts must carry explicit Workspace ownership.

The initial personal mode still uses Workspace identity to avoid permanent single-tenant assumptions.

## External References

External identifiers are not domain identifiers.

For example:

* A Notion page identifier is a Source Object Identifier.
* A Playbook identifier is generated and owned by the Engine.
* A database primary key is not automatically the domain identity.
* A storage path is not the identity of a Synchronization Snapshot.

---

# Domain Identifier Types

## WorkspaceId

Identifies one Workspace.

Characteristics:

* Immutable.
* Opaque.
* Required by all tenant-owned Aggregate Roots.
* Must not be inferred from unrelated records.
* Must not be replaced by `organizationId` in version 1.

## PlaybookId

Identifies the long-lived internal Playbook.

It does not identify:

* A Notion page.
* A Playbook Version.
* A Synchronization Snapshot.

## PlaybookSourceId

Identifies one configured external source.

A source remains identifiable even when its editable configuration changes.

## SynchronizationRunId

Identifies one synchronization attempt.

Retries create new identifiers.

## SynchronizationSnapshotId

Identifies one immutable captured source state.

It does not change when storage location changes.

## PlaybookVersionId

Identifies one immutable version candidate or finalized version.

The identifier is distinct from the version sequence.

## KnowledgeItemId

Identifies one normalized Knowledge Item within the Engine.

It must remain distinct from:

* Notion object identifiers.
* Source stable keys.
* Knowledge slugs.
* Display order.

## ValidationFindingId

Identifies one validation finding.

A finding belongs to one validation outcome and one Playbook Version.

## CorrelationId

Connects related application and operational activity.

Examples:

* CLI invocation.
* Synchronization pipeline.
* Version ingestion pipeline.
* Validation run.

Correlation identity is operational and must not replace domain identity.

## CommandId

Identifies an application command for idempotency.

It is not required for every domain method but may be required at the application boundary for operations such as:

* Starting synchronization.
* Creating a Draft Playbook Version.
* Publishing a version.
* Activating a version.

---

# Common Value Objects

## WorkspaceName

Represents the display name of a Workspace.

Rules:

* Must not be empty.
* Must be trimmed.
* Must have a reasonable maximum length.
* Must not be used as identity.
* Case-sensitivity does not determine uniqueness unless explicitly decided.

## PlaybookName

Represents a Playbook name.

Rules:

* Must not be empty.
* Must be trimmed.
* Must have a reasonable maximum length.
* Must be valid for human-readable output.
* Uniqueness is scoped to a Workspace when enforced.

## Description

Represents optional descriptive text.

Rules:

* May be empty when the concept permits it.
* Must have bounded length.
* Must preserve meaningful formatting only when the owning concept supports it.

A general Description Value Object should only be introduced if several modules truly share the same validation rules.

Otherwise, use concept-specific descriptions.

## Timestamp

Represents an instant in standardized time.

Rules:

* Persist in UTC.
* Do not rely directly on local machine time inside domain tests.
* Generate through an injected clock or application-provided value.
* Preserve lifecycle ordering.

## ContentChecksum

Represents a deterministic digest of content.

Purpose:

* Detect unchanged snapshots.
* Verify normalized content.
* Preserve reproducibility.
* Detect accidental mutation.

Rules:

* Must include the checksum algorithm or use one globally defined algorithm.
* Must be calculated from canonical content.
* Must not depend on storage path.
* Must not be used as the sole domain identity.
* Two equal checksums indicate equal canonical content under the same normalization rules.

## StorageReference

Represents an opaque reference to externally stored content.

Examples:

* Local file storage key.
* Future object storage key.

Rules:

* Must not expose filesystem assumptions to the domain.
* Must not contain secret credentials.
* Must not be interpreted directly by domain entities.
* Resolution belongs to an infrastructure port.

## CredentialReference

Represents an opaque reference to securely resolved credentials.

Rules:

* Must never contain the actual secret.
* Must be safe to persist and display when properly redacted.
* Must not be interpreted by the domain.
* Must be resolved only by authorized infrastructure.

## ExternalObjectId

Represents an identifier from an external source system.

Rules:

* Must include source-system context.
* A Notion page identifier and a Notion database identifier may require different object types or metadata.
* Must not be treated as globally unique without source context.

## SourceStableKey

Represents a stable key used to correlate source content across synchronizations.

It may derive from:

* External object identity.
* Explicit Playbook metadata.
* A deterministic structural key.

Rules:

* Must be unique within the relevant source snapshot or scope.
* Must not depend solely on display order.
* Changes to the key may be interpreted as delete-and-create behavior.
* The strategy must be documented by the source parser.

## VersionSequence

Represents the internal positive integer assigned to a Playbook Version.

Rules:

* Scoped to one Playbook.
* Starts at a positive integer.
* Increases monotonically.
* Is never reused.
* Must not be edited.
* Does not imply semantic compatibility.
* Does not replace PlaybookVersionId.

## VersionLabel

Represents optional human-readable version metadata.

Examples:

* `Initial imported version`.
* `Playbook revision July 2026`.
* A label maintained in Notion.

Rules:

* Optional.
* Not guaranteed unique.
* Must not determine ordering.
* Must not be used as the persistence identity.

## KnowledgeTitle

Represents the title of a Knowledge Item.

Rules:

* Must not be empty for version 1 supported Knowledge Types.
* Must be trimmed.
* Must have bounded length.
* May repeat across different Sections or types unless a stronger rule exists.
* Must not be used as the sole stable identity.

## KnowledgeSlug

Represents an optional human-readable lookup key.

Rules:

* Normalized format.
* Unique within an explicitly defined scope if enabled.
* Must not replace KnowledgeItemId.
* Changes must not break historical source traceability.

Slug generation may be deferred from initial implementation.

## DisplayOrder

Represents relative ordering inside a structural parent.

Rules:

* Must not be used as identity.
* Reordering does not imply item replacement.
* May be represented by an integer or sortable key.
* Uniqueness is only required where the owning structure demands it.

## ValidationCode

Represents a stable machine-readable validation rule identifier.

Examples:

```text
KNOWLEDGE_TITLE_REQUIRED
WORKFLOW_STEP_REQUIRED
DECISION_MATRIX_CRITERION_REQUIRED
UNRESOLVED_REQUIRED_REFERENCE
```

Rules:

* Must remain stable across message wording changes.
* Must be suitable for automated tests and CLI JSON output.
* Must not expose implementation-specific class names.
* Must be documented when introduced.

## ValidationMessage

Represents a human-readable explanation of a validation finding.

Rules:

* Must be understandable without a stack trace.
* May include safe contextual information.
* Must not contain credentials or sensitive raw content.
* Is not the machine-readable identity of the rule.

---

# Enumerated Domain Concepts

These concepts may later become enums, discriminated unions or dedicated Value Objects.

The implementation form is not decided here.

## WorkspaceStatus

Initial values:

* Active.
* Archived.

Rules:

* Only Active Workspaces may initiate new operations.
* Archived Workspaces remain queryable.
* Restoration behavior may be supported through an explicit transition.

## PlaybookStatus

Initial values:

* Active.
* Archived.

This status describes the long-lived Playbook, not its versions.

## PlaybookSourceType

Version 1 value:

* Notion.

The model must permit future source types without allowing unsupported values to enter a valid Aggregate.

## PlaybookSourceStatus

Initial values:

* Enabled.
* Disabled.

Operational failure is not a permanent source status.

Last synchronization outcome must be modeled separately.

## SynchronizationRunStatus

Initial required values:

* Pending.
* Running.
* Completed.
* Failed.

Optional version 1 value:

* Cancelled.

## PlaybookVersionStatus

Values:

* Draft.
* Validating.
* Invalid.
* Published.
* Archived.

## KnowledgeType

Version 1 values:

* Section.
* Methodology.
* Workflow.
* Prompt Definition.
* Criterion.
* Decision Matrix.
* Audit Definition.
* Reference Document.

The implementation may use stable machine names such as:

```text
section
methodology
workflow
prompt_definition
criterion
decision_matrix
audit_definition
reference_document
```

Human-readable labels must remain separate from serialized machine values.

## KnowledgeRelationshipType

Initial values:

* Contains.
* References.
* Implements.
* Uses.
* Evaluates.
* Supports.
* Related To.

The implementation should use stable machine-readable values.

## ValidationSeverity

Values:

* Error.
* Warning.
* Information.

## ValidationStage

Initial values:

* Source.
* Normalization.
* Structural.
* Semantic.
* Reference Resolution.
* Publication.

A finding may belong to only one primary stage.

## SynchronizationFailureStage

Candidate values:

* Configuration.
* Credential Resolution.
* Connection.
* Source Retrieval.
* Pagination.
* Snapshot Construction.
* Snapshot Storage.
* Checksum Calculation.
* Persistence.
* Unexpected.

The exact list will be finalized during error modeling.

---

# Aggregate Root: Workspace

## Purpose

Workspace represents the ownership boundary for version 1 data.

## Conceptual State

* WorkspaceId.
* WorkspaceName.
* WorkspaceStatus.
* Optional description.
* Created timestamp.
* Updated timestamp.
* Archived timestamp when applicable.
* Revision for concurrency control.

## Invariants

* Identity cannot change.
* Name must remain valid.
* Archived timestamp exists only when status is Archived.
* Active Workspace must not have an active archive timestamp.
* Archive operation is explicit.
* Historical tenant-owned data is not deleted by archival.

## Candidate Behaviors

* Create.
* Rename.
* Archive.
* Restore.

## Candidate Domain Events

* WorkspaceCreated.
* WorkspaceRenamed.
* WorkspaceArchived.
* WorkspaceRestored.

The initial implementation may defer domain events until a real consumer exists, but event names help clarify transitions.

---

# Aggregate Root: Playbook

## Purpose

Playbook represents the long-lived identity and operational lifecycle of the methodology inside the Engine.

## Conceptual State

* PlaybookId.
* WorkspaceId.
* PlaybookName.
* Optional description.
* PlaybookStatus.
* Optional active PlaybookVersionId.
* Created timestamp.
* Updated timestamp.
* Archived timestamp.
* Revision.

## Invariants

* Workspace ownership cannot change.
* Name must remain valid.
* Active version reference is optional.
* An active version must belong to this Playbook and Workspace.
* Only a Published, non-Archived version may become active.
* Archived Playbook cannot activate versions.
* Archival does not modify related Playbook Versions.
* Restoring does not automatically restore or activate a version.

## Candidate Behaviors

* Create.
* Rename.
* Update description.
* Activate version after eligibility is proven by the application layer.
* Clear active version.
* Archive.
* Restore.

## Application-Level Validation

Playbook cannot independently verify the complete state of a separate Playbook Version without loading it.

Therefore, the application use case must prove:

* Version exists.
* Version belongs to the Playbook.
* Version belongs to the Workspace.
* Version status is Published.
* Version is not Archived.

The Playbook Aggregate then applies its local transition.

## Candidate Domain Events

* PlaybookRegistered.
* PlaybookRenamed.
* PlaybookVersionActivated.
* PlaybookActiveVersionCleared.
* PlaybookArchived.
* PlaybookRestored.

---

# Aggregate Root: Playbook Source

## Purpose

Playbook Source represents a configured external editorial source.

## Conceptual State

* PlaybookSourceId.
* WorkspaceId.
* PlaybookId.
* PlaybookSourceType.
* Source display name.
* External root reference.
* CredentialReference.
* Source settings.
* PlaybookSourceStatus.
* Optional last successful SynchronizationRunId.
* Optional last successful synchronization timestamp.
* Optional last failed SynchronizationRunId.
* Optional last failure timestamp.
* Created timestamp.
* Updated timestamp.
* Revision.

## External Root Reference

The external root reference should be provider-neutral at the core boundary.

For Notion it may ultimately represent:

* Root page identifier.
* Root database identifier.
* Explicit source object type.

The core model must not contain Notion SDK request or response objects.

## Source Settings

Version 1 candidate settings:

* Maximum traversal depth.
* Whether child pages are included.
* Whether linked databases are included.
* Optional supported-content restrictions.
* Retrieval size limits.

Settings must be:

* Validated.
* Non-secret.
* Snapshotted when a Synchronization Run starts.

## Invariants

* Source belongs to one Workspace.
* Source belongs to one Playbook.
* Ownership cannot change.
* Source type cannot change after creation unless an explicit migration is introduced.
* Credential value is never stored.
* Disabled source cannot start Synchronization Runs.
* External root reference must be valid for the source type.
* Last successful run reference must refer to a completed run for this source.
* Last failed run reference must refer to a failed run for this source.
* Recording a new result must not alter historical runs.

## Candidate Behaviors

* Register.
* Rename display metadata.
* Update root reference.
* Update credential reference.
* Update source settings.
* Enable.
* Disable.
* Record successful synchronization metadata.
* Record failed synchronization metadata.

## Candidate Domain Events

* PlaybookSourceRegistered.
* PlaybookSourceUpdated.
* PlaybookSourceEnabled.
* PlaybookSourceDisabled.
* PlaybookSourceSynchronizationSucceeded.
* PlaybookSourceSynchronizationFailed.

---

# Aggregate Root: Synchronization Run

## Purpose

Synchronization Run represents one synchronization attempt.

## Conceptual State

* SynchronizationRunId.
* WorkspaceId.
* PlaybookSourceId.
* PlaybookId for denormalized traceability if approved.
* SynchronizationRunStatus.
* Source configuration snapshot or reference.
* Optional previous SynchronizationRunId for retries.
* Attempt sequence.
* Created timestamp.
* Optional started timestamp.
* Optional completed timestamp.
* Progress summary.
* Retrieval summary.
* Optional SynchronizationSnapshotId.
* Optional structured failure.
* Revision.

## Source Configuration Snapshot

When the run starts, the relevant source configuration must become fixed.

This prevents later changes to the Playbook Source from changing the meaning of the historical run.

The snapshot may include:

* Source type.
* External root reference.
* Non-secret retrieval settings.
* Credential reference identifier.
* Parser compatibility version.

It must not include actual credentials.

## Progress Summary

Progress is operational information.

Candidate values:

* Current stage.
* Retrieved object count.
* Retrieved block count.
* Current external cursor reference.
* Last progress timestamp.

Progress updates must not weaken lifecycle invariants.

## Retrieval Summary

Candidate final information:

* Pages retrieved.
* Databases retrieved.
* Records retrieved.
* Blocks retrieved.
* Unsupported block count.
* Warning count.
* Request count.
* Retry count.
* Source last-edited maximum timestamp.

## Structured Synchronization Failure

Candidate information:

* Stable failure code.
* Failure stage.
* Safe message.
* Retryable indicator.
* External status code when safe.
* External request reference when available.
* Diagnostic metadata.
* Timestamp.

## Invariants

* Workspace and source identities cannot change.
* Previous run reference cannot point to the same run.
* Pending run has no start or completion timestamp.
* Running run has a start timestamp and no completion timestamp.
* Completed run has a completion timestamp and Snapshot identity.
* Failed run has a completion timestamp and structured failure.
* Failed run cannot have a successful Snapshot identity.
* Terminal state cannot transition.
* Completion timestamp cannot precede start timestamp.
* Attempt sequence must be positive.
* Retry relationship must preserve the same source.
* Source configuration is immutable after start.

## Candidate Behaviors

* Create pending run.
* Start.
* Record progress.
* Complete with Snapshot identity and retrieval summary.
* Fail with structured failure.
* Cancel when included.

## Candidate Domain Events

* SynchronizationRunCreated.
* SynchronizationRunStarted.
* SynchronizationProgressRecorded.
* SynchronizationRunCompleted.
* SynchronizationRunFailed.
* SynchronizationRunCancelled.

---

# Conceptual Boundary: Synchronization Snapshot

## Classification

Synchronization Snapshot is treated as an immutable independent domain record for version 1.

It may be implemented as:

* An Aggregate Root.
* An immutable entity persisted through a dedicated repository.

The selected code pattern may depend on whether it has behavior beyond creation.

## Purpose

Preserve the exact source-aligned content captured by a successful Synchronization Run.

## Conceptual State

* SynchronizationSnapshotId.
* WorkspaceId.
* PlaybookSourceId.
* SynchronizationRunId.
* ContentChecksum.
* StorageReference.
* Storage format.
* Source schema version.
* Parser compatibility version.
* Item counts.
* Source metadata summary.
* Created timestamp.

## Source Metadata Summary

Candidate information:

* Source type.
* Root external identifier.
* Capture start and completion timestamps.
* Maximum source last-edited timestamp.
* External object counts.
* Unsupported object counts.

## Invariants

* Snapshot is created only for a successful synchronization process.
* Snapshot identity cannot change.
* Workspace, source and run ownership cannot change.
* Snapshot belongs to exactly one run.
* One completed run produces at most one authoritative snapshot.
* ContentChecksum cannot change.
* StorageReference may only change through a controlled storage migration that preserves content identity.
* Snapshot content cannot be overwritten.
* Snapshot payload must match its checksum.
* Snapshot deletion is not supported in version 1.

## Candidate Creation Service

Snapshot construction may require a domain or application service because it coordinates:

* Canonical serialization.
* Content checksum generation.
* Storage.
* Metadata creation.

The Synchronization Run Aggregate should not contain the full raw payload.

## Candidate Domain Event

* SynchronizationSnapshotCreated.

---

# Aggregate Root: Playbook Version

## Purpose

Playbook Version represents one immutable version candidate and its lifecycle.

## Conceptual State

* PlaybookVersionId.
* WorkspaceId.
* PlaybookId.
* SynchronizationSnapshotId.
* VersionSequence.
* Optional VersionLabel.
* PlaybookVersionStatus.
* Optional normalized ContentChecksum.
* Parser version.
* Normalization schema version.
* Knowledge item count.
* Relationship count.
* Validation summary.
* Created timestamp.
* Optional validation start timestamp.
* Optional validation completion timestamp.
* Optional publication timestamp.
* Optional archive timestamp.
* Revision.

## Validation Summary

Candidate information:

* Validation attempt identifier.
* Total findings.
* Error count.
* Warning count.
* Information count.
* Blocking finding count.
* Validator schema version.
* Validation completion timestamp.
* Publication eligibility.

The complete finding collection should not be loaded into the Aggregate when unbounded.

The Aggregate may own the authoritative summary while findings are persisted separately as immutable members of the version validation outcome.

## Invariants

* Workspace, Playbook, Snapshot and sequence cannot change.
* Snapshot must belong to the same Workspace and Playbook source lineage.
* Sequence must be unique within the Playbook.
* Sequence must be positive.
* Draft version is not executable.
* Validation can start only from Draft.
* Published status requires zero blocking findings.
* Invalid status requires at least one blocking finding.
* Published content checksum cannot change.
* Invalid validation outcome cannot be replaced.
* Published or Invalid versions cannot return to Draft.
* Archived version cannot be activated.
* Publication timestamp exists only for Published or Archived versions previously published.
* Archive timestamp exists only when Archived.
* Corrections require a new Playbook Version.
* Publication and activation remain separate.

## Candidate Behaviors

* Create Draft.
* Begin validation.
* Complete validation successfully and publish.
* Complete validation with blocking findings and mark Invalid.
* Archive.
* Determine publication eligibility.
* Determine execution eligibility.

## Validation and Publication Decision

The current lifecycle allows:

```text
Validating → Published
Validating → Invalid
```

This means successful validation and publication may be one Aggregate transition.

The application layer may still expose separate commands:

1. Validate.
2. Publish.

Before implementation, one of two models must be selected:

### Model A — Validation Automatically Finalizes the Version

Successful validation transitions directly to Published.

Advantages:

* Simpler state model.
* No ambiguous validated-but-unpublished state.
* Matches the current lifecycle document.

Disadvantages:

* No manual approval checkpoint.

### Model B — Add a Validated State

```text
Draft → Validating → Validated → Published
                     └─────────→ Invalid
```

Advantages:

* Explicit human or application approval.
* Publication can be delayed.
* Better separation of validation and release.

Disadvantages:

* Additional state and transitions.
* More operational complexity.

Version 1 should select one model before coding Playbook Version.

The current approved default remains Model A unless a manual publication checkpoint is required.

## Candidate Domain Events

* PlaybookVersionDraftCreated.
* PlaybookVersionValidationStarted.
* PlaybookVersionPublished.
* PlaybookVersionMarkedInvalid.
* PlaybookVersionArchived.

---

# Entity: Knowledge Item

## Classification

Knowledge Item is an immutable version-owned entity.

It belongs to one Playbook Version.

It is independently identifiable and queryable, but it does not have an independent mutable lifecycle in version 1.

## Conceptual State

Common state:

* KnowledgeItemId.
* WorkspaceId.
* PlaybookId.
* PlaybookVersionId.
* KnowledgeType.
* SourceStableKey.
* KnowledgeTitle.
* Optional KnowledgeSlug.
* Normalized content.
* Type-specific attributes.
* Source Reference.
* Optional parent KnowledgeItemId.
* DisplayOrder.
* ContentChecksum.
* Validation state.
* Created timestamp.

## Normalized Content

Normalized content must be provider-neutral.

Candidate representation:

* Structured text blocks.
* Plain searchable text.
* Structured fields.
* Type-specific metadata.

The domain should avoid storing only one unstructured text blob if the content has meaningful structure.

However, version 1 must also avoid creating excessive type-specific models before studying representative Notion content.

## Type-Specific Attributes

Attributes may be represented through validated type-specific structures.

Examples:

### Section

* Section purpose.
* Structural level.
* Child ordering metadata.

### Methodology

* Purpose.
* Applicable context.
* Inputs.
* Outputs.
* Ordered guidance.

### Workflow

* Preconditions.
* Inputs.
* Outputs.
* Ordered Step Definitions.

### Prompt Definition

* Purpose.
* Instructions.
* Variables.
* Expected output.
* Constraints.

### Criterion

* Criterion category.
* Evaluation guidance.
* Optional weight.
* Blocking indicator.

### Decision Matrix

* Purpose.
* Alternative definitions.
* Criterion references.
* Constraints.
* Interpretation guidance.

### Audit Definition

* Purpose.
* Scope.
* Target description.
* Criterion references.
* Evidence guidance.
* Severity guidance.
* Completion guidance.

### Reference Document

* Reference category.
* Summary metadata.
* Supporting content.

## Invariants

* Knowledge Item belongs to exactly one Workspace, Playbook and Playbook Version.
* Ownership identities cannot change.
* Version must be Draft or Validating while normalization is being constructed.
* Finalized version Knowledge Items are immutable.
* KnowledgeType must be supported.
* Title is required.
* SourceStableKey is required unless an explicit generated-key rule applies.
* ContentChecksum is required.
* Parent item, when present, belongs to the same Playbook Version.
* Display order does not define identity.
* Source Reference must allow traceability.
* Type-specific attributes must match the KnowledgeType.
* One item must not contain attributes belonging to an incompatible type.

## Knowledge Identity Strategy

KnowledgeItemId is generated by the Engine.

SourceStableKey is used to correlate source identity.

Possible strategies:

### Random Version-Specific Identity

Each Playbook Version generates new KnowledgeItemIds.

Advantages:

* Simple.
* No false assumption that items are identical across versions.

Disadvantages:

* Cross-version comparison requires SourceStableKey.

### Deterministic Version-Specific Identity

Identity derived from:

* PlaybookVersionId.
* SourceStableKey.

Advantages:

* Idempotent normalization.
* Easy duplicate prevention.

Disadvantages:

* Couples identity generation to deterministic algorithm.

### Stable Cross-Version Knowledge Identity

A separate long-lived KnowledgeDefinitionId represents the conceptual item across versions.

Advantages:

* Strong historical comparison.

Disadvantages:

* Introduces substantial identity resolution complexity.
* Renames, moves and splits become difficult.

Version 1 should use version-specific KnowledgeItemId plus SourceStableKey.

A cross-version conceptual identity is deferred.

---

# Entity: Knowledge Relationship

## Classification

Knowledge Relationship is an immutable version-owned entity or value record.

It connects two Knowledge Items in the same Playbook Version.

## Conceptual State

* Relationship identity when persistence requires it.
* WorkspaceId.
* PlaybookVersionId.
* Source KnowledgeItemId.
* Target KnowledgeItemId.
* KnowledgeRelationshipType.
* Optional source traceability.
* Optional label or description.
* Created timestamp.

## Invariants

* Source and target must exist.
* Source and target belong to the same Workspace.
* Source and target belong to the same Playbook Version.
* Self-reference is allowed only for explicitly approved relationship types.
* Required duplicate relationships must be prevented.
* Relationship type must be supported.
* Cross-version relationships are prohibited in version 1.
* A Contains relationship must not create an invalid structural cycle.
* Source traceability must be preserved when the relationship came from Notion.

## Structural Cycle Rule

At minimum, `Contains` relationships must form an acyclic hierarchy.

Other relationship types may permit cycles.

The system must not incorrectly apply hierarchical rules to all relationships.

---

# Entity: Validation Finding

## Classification

Validation Finding is an immutable record associated with one Playbook Version validation outcome.

It may optionally reference a Knowledge Item or relationship.

## Conceptual State

* ValidationFindingId.
* WorkspaceId.
* PlaybookId.
* PlaybookVersionId.
* Optional KnowledgeItemId.
* Optional relationship reference.
* ValidationCode.
* ValidationSeverity.
* Blocking indicator.
* ValidationStage.
* ValidationMessage.
* Optional Source Reference.
* Safe diagnostic metadata.
* Created timestamp.

## Invariants

* Finding belongs to one Playbook Version.
* Referenced Knowledge Item belongs to the same version.
* Severity and blocking state are explicit.
* Every blocking finding must have Error severity unless an approved rule permits otherwise.
* Machine-readable code is required.
* Message is required.
* Diagnostic metadata must be safe to persist and display.
* Findings cannot be altered after validation completion.
* Corrected content produces a new version and new findings.

## Validation Summary Consistency

The Playbook Version validation summary must equal the authoritative finding collection.

For example:

```text
total = errors + warnings + information
blocking <= errors
```

This consistency may be enforced by:

* A validation result factory.
* A domain service.
* A transactional application operation.

---

# Value Object: Source Reference

## Purpose

Preserve traceability from normalized knowledge or findings to external source content.

## Candidate State

* Source type.
* PlaybookSourceId.
* ExternalObjectId.
* Optional parent ExternalObjectId.
* External object type.
* Optional external URL metadata.
* Optional source position.
* Optional source last-edited timestamp.
* Optional property or block path.

## Invariants

* Source type must match the owning Playbook Source.
* ExternalObjectId is required.
* URL is optional and must not be treated as identity.
* Source position is descriptive, not identity.
* Reference must not contain credentials.
* Notion-specific metadata may be represented in a provider-neutral metadata structure or remain in the integration boundary.

The final balance between generic and source-specific fields will be decided during Notion adapter design.

---

# Value Object: Normalized Content

## Purpose

Represent content in a form independent from Notion block types while preserving enough structure for knowledge queries and future execution.

## Candidate Block Types

* Heading.
* Paragraph.
* Ordered list item.
* Unordered list item.
* Task item.
* Quote.
* Callout.
* Code block.
* Table.
* Divider.
* Link reference.
* Unsupported source block placeholder.

## Rules

* Must preserve ordering.
* Must preserve meaningful hierarchy.
* Must support deterministic serialization.
* Must produce searchable plain text.
* Must preserve unsupported-content diagnostics.
* Must not contain Notion SDK objects.
* Must allow future renderers for CLI, API and web interfaces.
* Must not attempt to support every rich-text feature in version 1.

## Canonical Serialization

A canonical representation is needed for checksums.

Canonical serialization must define:

* Stable property ordering.
* Stable block ordering.
* Normalized whitespace rules.
* Stable line-ending rules.
* Omission or inclusion of non-semantic metadata.
* Schema version.

A checksum calculated under one schema version must preserve that version.

---

# Domain Service: Playbook Version Sequence Generator

## Purpose

Allocate the next VersionSequence within a Playbook.

## Why It Is Not Aggregate-Local

Playbook Version is separate from Playbook and version history may be stored independently.

The next sequence may require checking persisted state.

## Contractual Behavior

Given:

* WorkspaceId.
* PlaybookId.

Return:

* Next unused positive VersionSequence.

## Rules

* Sequence must be unique within the Playbook.
* Sequence must increase monotonically.
* Concurrent allocation must not produce duplicates.
* Database uniqueness remains the final protection.
* A failed version creation must not cause unsafe sequence reuse assumptions.

The implementation may allow sequence gaps.

Sequence continuity is less important than uniqueness and immutability.

---

# Domain Service: Snapshot Checksum Service

## Purpose

Calculate and verify checksums for canonical snapshot content.

## Responsibilities

* Canonicalize source-aligned snapshot data.
* Calculate checksum.
* Verify stored payload against checksum.
* Expose algorithm and canonicalization version.

## Rules

* Same canonical content produces the same checksum.
* Non-semantic transport differences should not change the checksum when safely normalizable.
* Source changes that affect meaningful content must change the checksum.
* Checksum behavior requires fixture-based tests.

This service may be implemented as an application port if hashing itself is considered technical infrastructure.

The canonicalization policy remains domain-relevant.

---

# Domain Service: Knowledge Identity Resolver

## Purpose

Assign stable SourceStableKeys and version-specific KnowledgeItemIds during normalization.

## Inputs

* Playbook Version identity.
* Parsed source item.
* Source Reference.
* Structural context.

## Outputs

* SourceStableKey.
* KnowledgeItemId.
* Duplicate or ambiguity diagnostics.

## Rules

* Must be deterministic where required for idempotent normalization.
* Must detect duplicate source keys.
* Must not rely only on title.
* Must not rely only on display order.
* Must preserve source object identity when reliable.
* Generated structural keys must record their strategy version.

---

# Domain Service: Knowledge Relationship Resolver

## Purpose

Resolve parsed references into Knowledge Relationships.

## Responsibilities

* Match source references to normalized Knowledge Items.
* Detect missing references.
* Detect ambiguous references.
* Validate relationship types.
* Detect invalid containment cycles.
* Produce validation findings.

## Rules

* Required unresolved references produce blocking findings.
* Optional unresolved references produce non-blocking findings.
* Resolution is scoped to one Playbook Version.
* Resolver must not query the active Playbook Version implicitly.
* Result must remain deterministic for the same normalized input.

---

# Domain Service: Playbook Validator

## Purpose

Evaluate normalized Playbook knowledge before publication.

## Validation Layers

### Structural Validation

Examples:

* Required titles.
* Supported Knowledge Types.
* Valid parent references.
* Type-specific required fields.
* Unique SourceStableKeys.
* Valid relationship endpoints.

### Semantic Deterministic Validation

Examples:

* Workflow has at least one step.
* Prompt Definition has instruction content.
* Decision Matrix references criteria.
* Audit Definition references evaluative criteria.
* Required root Sections exist.
* Blocking relationships are resolved.

### Publication Validation

Examples:

* Normalization completed.
* Content checksum exists.
* Parser and schema versions exist.
* No blocking Error remains.
* Validation summary is internally consistent.

## Output

A Validation Result containing:

* Findings.
* Summary.
* Publication eligibility.
* Validator version.
* Completion timestamp.

## Rules

* Same version content and validator version should produce the same findings.
* Validator must not mutate normalized knowledge.
* Validator must not call generative AI in version 1.
* Validator must not silently downgrade blocking errors.
* Every rule must have a stable ValidationCode.

---

# Domain Policy: One Active Source per Playbook

## Version 1 Rule

A Playbook may have only one enabled Notion source used for version ingestion.

This does not necessarily mean only one source record may exist historically.

Possible interpretation:

* Multiple source records may exist.
* At most one may be enabled for ingestion.

The exact enforcement must be decided before persistence design.

## Preferred Version 1 Decision

Allow historical disabled sources, but enforce:

```text
At most one Enabled Playbook Source per Playbook.
```

Reasons:

* Supports source replacement history.
* Avoids source merging.
* Keeps synchronization lineage unambiguous.

A unique partial database constraint may later support this invariant.

---

# Domain Policy: One Active Synchronization per Source

## Rule

At most one Synchronization Run may be Pending or Running for the same Playbook Source.

## Enforcement

Application layer:

* Query for an active run before creating another.

Persistence:

* Use a database constraint, lock or transaction strategy where feasible.

Domain:

* A Synchronization Run only controls its own lifecycle and cannot inspect all runs.

The system must not rely solely on an in-memory check.

---

# Domain Policy: Snapshot Deduplication

## Rule

A successful synchronization may produce content identical to the previous successful snapshot.

Version 1 must detect unchanged content through ContentChecksum.

## Options

### Option A — Create a New Snapshot Every Time

Advantages:

* Complete operational history.
* Every completed run has its own snapshot.

Disadvantages:

* Duplicate payload storage.

### Option B — Reuse the Previous Snapshot

Advantages:

* Saves storage.

Disadvantages:

* Weakens the rule that each successful run produces one captured state.
* Creates shared lineage complexity.

### Approved Version 1 Direction

Create a new Synchronization Snapshot metadata record for each successful run.

The payload storage adapter may deduplicate identical content internally by checksum.

This preserves:

* One run → one snapshot.
* Complete synchronization history.
* Storage optimization without domain ambiguity.

## Unchanged Result

A completed run should record:

* Snapshot identity.
* Whether content is unchanged from the previous successful snapshot.
* Previous snapshot identity when applicable.

An unchanged snapshot does not automatically require creating a new Playbook Version.

---

# Domain Policy: Version Creation from Unchanged Snapshot

## Rule

The Engine should not create a duplicate Draft Playbook Version automatically when the latest snapshot content is unchanged from the latest version source content.

## Explicit Override

A user may later request a reprocessing version when:

* Parser version changed.
* Normalization schema changed.
* Validation rules changed.
* Controlled reprocessing is required.

Version 1 should distinguish:

* Content changed.
* Content unchanged but processing schema changed.
* Fully duplicate ingestion request.

The final idempotency key may include:

* Snapshot checksum.
* Parser version.
* Normalization schema version.

---

# Domain Policy: Knowledge Immutability

## Rule

Knowledge Items and relationships are mutable only while constructing a Draft Playbook Version.

After validation finalizes the version as Published or Invalid:

* Knowledge Items become immutable.
* Relationships become immutable.
* Source References become immutable.
* Validation Findings become immutable.
* Content checksums remain fixed.

If normalization fails before validation begins, the Draft may either:

* Remain incomplete and non-publishable.
* Be marked through an operational failure record.
* Be discarded only through an explicit cleanup policy.

The final incomplete-Draft policy will be defined during persistence and use-case design.

---

# Candidate Domain Events

The following events describe meaningful completed transitions.

They are candidates, not mandatory implementation requirements.

## Workspace

* WorkspaceCreated.
* WorkspaceArchived.
* WorkspaceRestored.

## Playbook

* PlaybookRegistered.
* PlaybookArchived.
* PlaybookRestored.
* PlaybookVersionActivated.
* PlaybookActiveVersionCleared.

## Source

* PlaybookSourceRegistered.
* PlaybookSourceEnabled.
* PlaybookSourceDisabled.
* PlaybookSourceUpdated.

## Synchronization

* SynchronizationRunCreated.
* SynchronizationRunStarted.
* SynchronizationRunCompleted.
* SynchronizationRunFailed.
* SynchronizationSnapshotCreated.
* SynchronizationContentUnchanged.

## Version

* PlaybookVersionDraftCreated.
* PlaybookVersionValidationStarted.
* PlaybookVersionPublished.
* PlaybookVersionMarkedInvalid.
* PlaybookVersionArchived.

## Knowledge

* KnowledgeNormalizationCompleted.
* KnowledgeValidationCompleted.

## Event Rules

* Events describe facts that already occurred.
* Event names use past tense.
* Events must include Workspace context for tenant-owned operations.
* Events must include Aggregate identity.
* Events must not contain secrets.
* Large content payloads should be referenced, not embedded.
* Event publication must not change Aggregate correctness.
* Internal events do not imply a distributed event architecture.

---

# Conceptual Relationship Map

```text
Workspace
  │
  ├── owns many Playbooks
  │
  ├── owns many Playbook Sources
  │
  ├── owns many Synchronization Runs
  │
  ├── owns many Synchronization Snapshots
  │
  └── owns many Playbook Versions
  │
  ▼
Playbook
  │
  ├── references zero or one active Playbook Version
  ├── has historical Playbook Sources
  └── has many Playbook Versions
        │
        ├── created from one Synchronization Snapshot
        ├── owns many Knowledge Items
        ├── owns many Knowledge Relationships
        └── owns one finalized Validation Result
                  └── contains many Validation Findings

Playbook Source
  │
  └── has many Synchronization Runs
          │
          └── completed run produces one Synchronization Snapshot
```

Relationships use identifiers across Aggregate boundaries.

Collections in the diagram do not imply loading complete object graphs.

---

# Cross-Workspace Rules

The following references must always preserve Workspace equality:

```text
Playbook.workspaceId
  = PlaybookSource.workspaceId

PlaybookSource.workspaceId
  = SynchronizationRun.workspaceId

SynchronizationRun.workspaceId
  = SynchronizationSnapshot.workspaceId

Playbook.workspaceId
  = PlaybookVersion.workspaceId

PlaybookVersion.workspaceId
  = KnowledgeItem.workspaceId

PlaybookVersion.workspaceId
  = ValidationFinding.workspaceId
```

Cross-Workspace references are invalid.

Application services and repositories must validate these boundaries.

Database foreign keys alone may not be sufficient when identifiers are globally unique but Workspace ownership must also be guaranteed.

Composite constraints may be required.

---

# Persistence-Neutral Uniqueness Rules

The following conceptual uniqueness rules are candidates for version 1:

## Workspace

* WorkspaceId globally unique.

## Playbook

* PlaybookId globally unique.
* Playbook name unique within active records of one Workspace, if approved.

## Playbook Source

* PlaybookSourceId globally unique.
* At most one enabled source per Playbook.
* External root may not be registered twice for the same Playbook and source type unless explicitly allowed.

## Synchronization Run

* SynchronizationRunId globally unique.
* At most one active run per source.
* CommandId unique for idempotent creation within an appropriate scope.

## Synchronization Snapshot

* SynchronizationSnapshotId globally unique.
* SynchronizationRunId unique because one run has one authoritative snapshot.

## Playbook Version

* PlaybookVersionId globally unique.
* VersionSequence unique within Playbook.
* Snapshot plus processing schema combination may be unique when duplicate version creation is prohibited.

## Knowledge Item

* KnowledgeItemId globally unique.
* SourceStableKey unique within one Playbook Version.
* Slug unique within an approved structural scope when slugs are enabled.

## Knowledge Relationship

* Source, target and relationship type combination unique within one Playbook Version unless multiple labeled relationships are valid.

## Validation Finding

* ValidationFindingId globally unique.
* Duplicate findings from the same rule and target should be deterministically prevented or collapsed.

---

# Concepts Deferred from Version 1 Domain Code

The following concepts must not be implemented in this vertical slice:

* User.
* Organization.
* Membership.
* Role.
* Permission.
* Project.
* Project Snapshot.
* Execution.
* Step Execution.
* AI Provider.
* Provider Configuration.
* AI Request.
* AI Response.
* Audit.
* Audit Finding.
* Decision.
* Automation.
* Report.
* Billing Account.
* Subscription.
* Usage Quota.

Their documentation may remain for future architecture, but they must not create dependencies in the initial implementation.

---

# Decisions Required Before Coding

The following decisions must be resolved before OpenCode implements the domain:

## Required Decision 1 — Playbook Version Validation State

Choose:

* Successful validation directly publishes the version.
* Add a separate Validated state before publication.

Default recommendation:

* Add `Validated` only when manual approval is a real version 1 requirement.
* Otherwise keep the simpler current lifecycle.

## Required Decision 2 — Playbook Name Uniqueness

Choose:

* Unique per Workspace.
* Duplicate names allowed.

Default recommendation:

* Unique per Workspace among non-archived Playbooks.

## Required Decision 3 — Enabled Source Constraint

Choose:

* Only one source record per Playbook.
* Multiple historical sources, at most one Enabled.

Default recommendation:

* Multiple historical sources, at most one Enabled.

## Required Decision 4 — Cancellation

Choose whether version 1 implements:

* Synchronization Run cancellation.
* No cancellation until asynchronous worker execution exists.

Default recommendation:

* Defer cancellation while synchronization runs directly through the CLI.

## Required Decision 5 — Incomplete Draft Handling

Choose how normalization failure is represented:

* Draft remains with operational failure metadata.
* Add a normalization status separate from Playbook Version lifecycle.
* Add another Playbook Version state.

Default recommendation:

* Keep normalization process state separate from Playbook Version lifecycle.
* Do not add more version states until required.

## Required Decision 6 — Knowledge Item Storage Shape

Choose:

* One generic normalized content structure with type-specific attributes.
* Separate domain entity classes for every Knowledge Type.

Default recommendation:

* Shared immutable Knowledge Item model with discriminated type-specific attributes.
* Introduce specialized domain behavior only when a type requires real invariants.

## Required Decision 7 — Validation Result Ownership

Choose:

* Validation findings fully owned and loaded through Playbook Version.
* Validation summary in Aggregate, findings persisted separately.

Default recommendation:

* Summary inside Playbook Version.
* Immutable findings stored and queried separately by version.

## Required Decision 8 — Knowledge Identity

Choose:

* Random version-specific identifiers.
* Deterministic version-specific identifiers.

Default recommendation:

* Deterministic version-specific identity when it can be implemented safely from PlaybookVersionId and SourceStableKey.
* Otherwise use generated identifiers with a strict unique SourceStableKey constraint.

---

# Approved Conceptual Direction

Unless explicitly changed before implementation, version 1 will use:

* Explicit typed identifiers.
* Workspace ownership on all tenant-owned records.
* Multiple historical Playbook Sources with at most one Enabled source per Playbook.
* One active Synchronization Run per source.
* One Snapshot per successful run.
* Snapshot payload deduplication only inside storage infrastructure.
* Positive monotonic VersionSequence scoped to Playbook.
* Version-specific Knowledge Item identity.
* SourceStableKey for cross-synchronization correlation.
* Immutable Knowledge Items after validation finalization.
* Shared Knowledge Item model with type-specific attributes.
* Validation summary on Playbook Version.
* Validation Findings stored separately as immutable version-owned records.
* No generative AI validation.
* No runtime workflow execution.
* No SaaS identity or authorization concepts.

---

# Completion Criteria

This conceptual model is complete enough to proceed when:

* Every version 1 Aggregate Root has an explicit identity.
* Ownership boundaries are understood.
* Historical immutability rules are explicit.
* External identifiers are separated from domain identifiers.
* Knowledge Item and relationship rules are defined.
* Validation ownership is clear.
* Sequence, checksum and identity services are identified.
* Cross-Workspace rules are explicit.
* Deferred concepts are excluded.
* Required pre-coding decisions are resolved.

The next design artifact must resolve the remaining decisions and define the exact version 1 domain contracts before implementation begins.
