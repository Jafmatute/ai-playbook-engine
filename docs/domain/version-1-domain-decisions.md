# AI Playbook Engine — Version 1 Domain Decisions

## Purpose

This document resolves the domain decisions that must be fixed before implementation of the first AI Playbook Engine vertical slice.

The decisions apply to version 1 and cover:

* Playbook Version validation and publication.
* Playbook naming.
* Playbook Source history.
* Synchronization cancellation.
* Normalization failures.
* Knowledge Item modeling.
* Validation Result ownership.
* Knowledge Item identity.

These decisions refine the following documents:

* Ubiquitous Language.
* Initial Aggregate Boundaries.
* Lifecycle State Machines.
* Initial Application Use Cases.
* Version 1 Functional Scope.
* Version 1 Conceptual Domain Model.

Implementation must follow these decisions unless a later approved domain decision or ADR explicitly replaces them.

---

# Decision 1 — Playbook Version Validation and Publication

## Decision

Version 1 will introduce a separate `Validated` state between `Validating` and `Published`.

The approved lifecycle is:

```text
Draft
  │
  └── begin validation ─────► Validating

Validating
  │
  ├── validation passed ────► Validated
  └── validation failed ────► Invalid

Validated
  │
  ├── publish ──────────────► Published
  └── archive ──────────────► Archived

Invalid
  │
  └── archive ──────────────► Archived

Published
  │
  └── archive ──────────────► Archived
```

## Rationale

Validation and publication represent different business decisions.

Validation answers:

> Is this Playbook Version structurally and semantically eligible for publication?

Publication answers:

> Should this validated version become available for normal Engine use?

Keeping these transitions separate provides:

* Explicit control over publication.
* A review checkpoint before releasing a version.
* Clearer CLI behavior.
* Better traceability.
* Separation between automated validation and deliberate publication.
* A future path toward human approval without redesigning the lifecycle.

## Rules

* A Draft version is not executable.
* A Validating version is not executable.
* An Invalid version is not executable.
* A Validated version is not executable in normal operation.
* A Published version is executable.
* An Archived version is not eligible for new normal executions or activation.
* Successful validation transitions the version to Validated.
* Publication is a separate explicit command.
* Publication requires the version to be Validated.
* A version cannot transition directly from Draft to Published.
* A version cannot transition directly from Validating to Published.
* A Validated version cannot be modified.
* Corrections require a new Playbook Version.

## Required Lifecycle Data

A Validated version must contain:

* Validation completion timestamp.
* Validation summary.
* Validator version.
* Content checksum.
* Normalization schema version.
* Zero unresolved blocking findings.

A Published version additionally contains:

* Publication timestamp.
* Publication origin.
* Optional publication note.

## Consequences

### Positive

* Publication remains deliberate.
* Validation can be automated without automatically releasing content.
* CLI commands have clear responsibilities.
* Future approval workflows remain possible.
* Invalid and unpublished valid content remain distinguishable.

### Negative

* Adds one lifecycle state.
* Requires an additional command and transition.
* Allows validated versions to remain unpublished indefinitely.
* Requires query interfaces to distinguish validation eligibility from execution eligibility.

---

# Decision 2 — Playbook Name Uniqueness

## Decision

Playbook names must be unique within a Workspace among non-Archived Playbooks.

Archived Playbooks do not reserve their names.

Name comparison will use a normalized representation.

## Normalization Rules

For uniqueness purposes, the name must be:

* Trimmed.
* Compared case-insensitively.
* Compared using a stable normalized form.
* Independent from display formatting that does not change meaning.

Examples considered equivalent:

```text
AI Engineering Playbook
ai engineering playbook
 AI Engineering Playbook
```

The original validated display value may be preserved.

## Rationale

In the personal version, duplicate active Playbook names would make CLI selection and operational output unnecessarily ambiguous.

Allowing archived names to be reused supports replacement without requiring artificial suffixes.

## Rules

* Two non-Archived Playbooks in the same Workspace cannot share the same normalized name.
* Different Workspaces may use the same name.
* Renaming must enforce the same uniqueness rule.
* Restoring an Archived Playbook must fail when its normalized name conflicts with a non-Archived Playbook.
* Archiving releases the name for reuse.
* Playbook identity remains independent from its name.
* Historical records continue referencing PlaybookId, not the name.

## Persistence Requirement

The persistence model must enforce this rule safely under concurrent creation or rename operations.

The application layer must provide a readable conflict error, but the database remains the final concurrency protection.

---

# Decision 3 — Playbook Source History

## Decision

A Playbook may have multiple historical Playbook Source records, but at most one source may be Enabled at a time.

Version 1 supports only the `Notion` source type.

## Rationale

Keeping historical source records preserves:

* Source replacement history.
* Synchronization lineage.
* Previous external root references.
* Traceability for old Snapshots and Playbook Versions.

Restricting the Playbook to one Enabled source prevents:

* Ambiguous ingestion.
* Multi-source merging.
* Competing active synchronization pipelines.
* Unclear Snapshot lineage.

## Rules

* A Playbook Source belongs permanently to one Playbook and Workspace.
* Source ownership cannot be transferred.
* At most one source per Playbook may be Enabled.
* Registering a new source does not automatically disable the existing Enabled source.
* Enabling one source must fail when another source is Enabled, unless an explicit application use case coordinates the switch.
* Disabling a source does not modify historical Synchronization Runs.
* Archived Playbooks cannot enable sources.
* Disabled sources remain queryable.
* Existing Playbook Versions preserve their original Snapshot and source lineage.
* A Playbook Version in version 1 is produced from exactly one source and one Snapshot.

## Source Replacement Workflow

The approved replacement sequence is:

1. Register the new source as Disabled.
2. Verify the new source connection.
3. Disable the current source.
4. Enable the new source.
5. Start a new Synchronization Run.

A future atomic `Replace Active Source` use case may coordinate steps 3 and 4.

It is not required for the first implementation.

## Persistence Requirement

The database must protect the one-Enabled-source-per-Playbook invariant.

Application checks alone are insufficient.

---

# Decision 4 — Synchronization Cancellation

## Decision

Synchronization cancellation is excluded from the first version implementation.

The initial Synchronization Run lifecycle is:

```text
Pending
  │
  └── start ────────────────► Running

Running
  │
  ├── complete ─────────────► Completed
  └── fail ─────────────────► Failed
```

## Rationale

Version 1 synchronization runs directly through the CLI process without:

* A durable queue.
* A separate worker.
* Distributed execution.
* Cooperative cancellation infrastructure.
* Long-running remote job ownership.

Introducing cancellation now would create behavior that cannot be implemented reliably.

Stopping the local CLI process is not equivalent to a valid domain cancellation transition.

## Rules

* `Cancelled` is not part of the implemented SynchronizationRunStatus in version 1.
* No `Cancel Synchronization Run` use case will be implemented.
* No CLI cancellation command will be implemented.
* A run interrupted by an unexpected process termination may remain Running until recovery logic detects it.
* Interrupted runs must not be silently marked Completed.
* Recovery must classify abandoned runs explicitly.

## Abandoned Run Recovery

Version 1 may implement a recovery policy that marks stale Running runs as Failed.

A stale run may be identified through:

* Process startup diagnostics.
* A configured maximum run duration.
* Missing heartbeat or progress timestamps, if implemented.
* Explicit administrative recovery command.

The resulting failure must use a stable failure code such as:

```text
SYNCHRONIZATION_RUN_INTERRUPTED
```

## Future Change

Cancellation may be introduced when:

* Synchronization runs in a Worker.
* A durable queue exists.
* Cooperative cancellation is supported.
* Active external requests can be safely ignored or stopped.
* Cancellation acknowledgment can be persisted.

Introducing it will require updating the lifecycle documentation.

---

# Decision 5 — Incomplete Draft and Normalization Failure

## Decision

Normalization status will be modeled separately from the Playbook Version lifecycle.

Normalization failure will not add another PlaybookVersionStatus.

## Playbook Version Lifecycle

The Playbook Version retains these states:

* Draft.
* Validating.
* Validated.
* Invalid.
* Published.
* Archived.

## Normalization Status

Version 1 introduces a separate normalization process state:

* Pending.
* Running.
* Completed.
* Failed.

This state describes preparation of version knowledge.

It does not replace the Playbook Version lifecycle.

## Rationale

Normalization is a technical-domain preparation process.

Playbook Version lifecycle describes release eligibility and publication.

Combining both concerns would create states such as:

* NormalizationFailed.
* PartiallyNormalized.
* ReadyForValidation.
* Published.

That would mix operational processing state with the business lifecycle of the version.

## Rules

* A new Playbook Version starts as Draft with normalization status Pending.
* Normalization may start only while the version is Draft.
* Validation may start only when normalization status is Completed.
* Failed normalization leaves the Playbook Version in Draft.
* A failed normalization preserves structured failure information.
* A failed normalization may be retried against the same immutable Snapshot when the processing configuration is compatible.
* Retrying normalization must preserve attempt history.
* Completed normalization output becomes immutable before validation begins.
* Normalization cannot run after validation starts.
* Publication requires normalization status Completed.
* Archiving a Draft version is allowed only through an explicit cleanup or archive use case if later approved.

## Normalization Attempt

Each attempt should preserve:

* Attempt identity.
* Parser version.
* Normalization schema version.
* Start timestamp.
* Completion timestamp.
* Status.
* Structured failure when applicable.
* Produced Knowledge Item count.
* Produced relationship count.
* Content checksum when successful.

## Retry Rule

A retry does not overwrite the failed attempt.

The application may create a new attempt under the same Draft Playbook Version when:

* Snapshot content is unchanged.
* Previous attempt is Failed.
* Version remains Draft.
* No validation has started.
* Parser and schema compatibility rules permit retry.

If normalized meaning changes due to source changes, a new Snapshot and Playbook Version are required.

## Persistence Consequence

Normalization attempts may be stored as separate immutable operational records.

The Playbook Version may store only:

* Current normalization status.
* Latest attempt identifier.
* Successful normalization summary.

---

# Decision 6 — Knowledge Item Domain Shape

## Decision

Version 1 will use one shared immutable Knowledge Item model with discriminated, type-specific attributes.

Separate Aggregate Roots or unrelated entity classes will not be created for every Knowledge Type.

## Conceptual Shape

Each Knowledge Item contains common fields:

* KnowledgeItemId.
* WorkspaceId.
* PlaybookId.
* PlaybookVersionId.
* KnowledgeType.
* SourceStableKey.
* Title.
* Normalized content.
* Source Reference.
* Parent reference.
* Display order.
* Content checksum.
* Type-specific attributes.

The type-specific attributes must correspond to KnowledgeType.

Conceptual examples:

```text
SectionKnowledgeAttributes
MethodologyKnowledgeAttributes
WorkflowKnowledgeAttributes
PromptDefinitionKnowledgeAttributes
CriterionKnowledgeAttributes
DecisionMatrixKnowledgeAttributes
AuditDefinitionKnowledgeAttributes
ReferenceDocumentKnowledgeAttributes
```

The implementation may use a TypeScript discriminated union.

## Rationale

The supported Knowledge Types share:

* Version ownership.
* Immutability.
* Source traceability.
* Common query behavior.
* Common persistence lifecycle.
* Common validation pipeline.

Creating an independent domain hierarchy and repository for each type would introduce complexity before those types have independent behavior.

## Rules

* KnowledgeType and attributes must be consistent.
* A Workflow item cannot contain Prompt Definition attributes.
* Unknown attribute structures must fail validation.
* Common fields must not be duplicated inside type-specific attributes.
* Notion-specific properties must be translated before creating attributes.
* Knowledge Items are version-owned immutable entities, not Aggregate Roots.
* Type-specific domain classes may be introduced later only when real independent behavior or invariants justify them.
* Runtime execution behavior must not be added to the version 1 Workflow attributes.

## Persistence Guidance

Persistence may use:

* Common relational columns for shared fields.
* A validated JSON-compatible structure for type-specific attributes.
* Separate relational structures only where query or integrity needs justify them.

The exact database representation will be decided during data modeling.

The persistence structure must not weaken type validation.

---

# Decision 7 — Validation Result Ownership

## Decision

Playbook Version owns the authoritative Validation Summary.

Validation Findings are persisted separately as immutable records associated with the Playbook Version and validation attempt.

## Rationale

Loading all Validation Findings into the Playbook Version Aggregate would make the Aggregate grow without a clear bound.

However, the version must still enforce publication eligibility from an authoritative result.

The summary provides the bounded consistency data required by the Aggregate.

## Validation Summary

The Playbook Version stores:

* Validation attempt identity.
* Validator version.
* Validation completion timestamp.
* Total findings.
* Error count.
* Warning count.
* Information count.
* Blocking finding count.
* Publication eligibility.
* Validated content checksum.

## Validation Findings

Each Validation Finding stores:

* ValidationFindingId.
* WorkspaceId.
* PlaybookId.
* PlaybookVersionId.
* Validation attempt identity.
* Optional KnowledgeItemId.
* ValidationCode.
* ValidationSeverity.
* Blocking indicator.
* ValidationStage.
* ValidationMessage.
* Optional Source Reference.
* Safe diagnostic metadata.
* Created timestamp.

## Consistency Rule

Validation Summary and Validation Findings must be persisted atomically as part of validation completion.

The following must hold:

```text
totalFindings =
  errorCount +
  warningCount +
  informationCount
```

And:

```text
blockingFindingCount <= errorCount
```

For version 1:

```text
publicationEligible =
  blockingFindingCount == 0
```

## Lifecycle Rules

* Beginning validation creates or reserves one validation attempt identity.
* Findings may be accumulated while status is Validating.
* Completing validation finalizes the findings.
* Finalized findings cannot be edited.
* Successful validation transitions the version to Validated.
* Failed validation transitions the version to Invalid.
* A second validation attempt is not allowed after the version becomes Validated or Invalid.
* Corrections require a new Playbook Version.

## Repository Guidance

Playbook Version Repository persists Aggregate state.

Validation Finding Repository or validation persistence contract stores and queries findings.

The application service coordinates their atomic completion through a transaction abstraction.

---

# Decision 8 — Knowledge Item Identity

## Decision

Version 1 will use deterministic version-specific KnowledgeItemId values derived from:

* PlaybookVersionId.
* SourceStableKey.
* Knowledge identity strategy version.

The SourceStableKey remains a separate persisted value.

## Conceptual Formula

```text
KnowledgeItemId =
  deterministicId(
    PlaybookVersionId,
    SourceStableKey,
    identityStrategyVersion
  )
```

The exact algorithm will be selected during implementation.

It must produce an opaque typed identifier.

## Rationale

Deterministic version-specific identity provides:

* Idempotent normalization.
* Safe retry behavior.
* Duplicate prevention.
* Stable fixture tests.
* Predictable relationship resolution.
* No false assumption of a permanent cross-version entity.

Including PlaybookVersionId ensures that:

* The same source concept in different versions receives different KnowledgeItemIds.
* Each version remains an immutable independent knowledge graph.
* Historical versions do not share mutable Knowledge entities.

SourceStableKey supports cross-version correlation without becoming the domain identifier.

## Rules

* SourceStableKey must be unique within one Playbook Version.
* The identity algorithm must be deterministic.
* The identity strategy version must be explicit.
* Changing the identity strategy requires a controlled migration or a new normalization schema version.
* Title must not be used as the sole SourceStableKey.
* Display order must not be used as the sole SourceStableKey.
* A reliable external object identifier should be preferred when available.
* Generated structural keys must record their generation strategy.
* Duplicate SourceStableKeys produce a blocking validation or normalization failure.
* KnowledgeItemId must remain opaque outside the identity service.
* Cross-version comparison uses SourceStableKey and source lineage, not KnowledgeItemId equality.

## Relationship Identity

Knowledge Relationships may use deterministic identity derived from:

* PlaybookVersionId.
* Source KnowledgeItemId.
* Target KnowledgeItemId.
* Relationship type.
* Optional relationship discriminator.

This is recommended but not mandatory until persistence design.

---

# Consolidated Version 1 Lifecycle

## Playbook Version State Machine

The approved lifecycle is:

```text
Draft
  │
  └── begin validation ─────► Validating

Validating
  │
  ├── pass ─────────────────► Validated
  └── fail ─────────────────► Invalid

Validated
  │
  ├── publish ──────────────► Published
  └── archive ──────────────► Archived

Invalid
  │
  └── archive ──────────────► Archived

Published
  │
  └── archive ──────────────► Archived
```

## Normalization Lifecycle

```text
Pending
  │
  └── start ────────────────► Running

Running
  │
  ├── complete ─────────────► Completed
  └── fail ─────────────────► Failed

Failed
  │
  └── retry ────────────────► new attempt in Running
```

Normalization retries preserve all prior attempts.

## Synchronization Run Lifecycle

```text
Pending
  │
  └── start ────────────────► Running

Running
  │
  ├── complete ─────────────► Completed
  └── fail ─────────────────► Failed
```

Retries create a new Synchronization Run.

---

# Updated Publication Preconditions

A Playbook Version may be published only when:

* It belongs to an Active Workspace.
* Its Playbook is not Archived.
* Its status is Validated.
* Normalization status is Completed.
* Validation Summary exists.
* Blocking finding count is zero.
* Publication eligibility is true.
* Validated content checksum matches the normalized content checksum.
* Parser version is recorded.
* Normalization schema version is recorded.
* Validator version is recorded.
* The version has not already been published or archived.

Publication does not activate the version.

---

# Updated Activation Preconditions

A Playbook may activate a version only when:

* Playbook and version belong to the same Workspace.
* Version belongs to the Playbook.
* Playbook is not Archived.
* Version status is Published.
* Version is not Archived.
* Published content is resolvable.
* No ownership inconsistency exists.

A Validated but unpublished version cannot be activated.

---

# Updated Version 1 CLI Implications

The version commands must remain separate:

```text
version create
version normalize
version validate
version publish
version archive
```

Expected behavior:

## `version normalize`

* Starts a normalization attempt.
* Produces immutable normalized knowledge.
* Leaves the version in Draft.
* Sets normalization status to Completed or Failed.

## `version validate`

* Requires normalization Completed.
* Transitions Draft to Validating.
* Finalizes as Validated or Invalid.
* Does not publish.

## `version publish`

* Requires Validated.
* Transitions to Published.
* Does not activate.

## `playbook activate-version`

* Requires Published.
* Sets the Playbook active version reference.

A future convenience command may coordinate these steps but must report each transition separately.

---

# Updated Version 1 Status Values

## WorkspaceStatus

* Active.
* Archived.

## PlaybookStatus

* Active.
* Archived.

## PlaybookSourceStatus

* Enabled.
* Disabled.

## SynchronizationRunStatus

* Pending.
* Running.
* Completed.
* Failed.

## NormalizationAttemptStatus

* Pending.
* Running.
* Completed.
* Failed.

## PlaybookVersionStatus

* Draft.
* Validating.
* Validated.
* Invalid.
* Published.
* Archived.

## ValidationSeverity

* Error.
* Warning.
* Information.

---

# Implementation Constraints

The first implementation must not:

* Omit Workspace ownership.
* Use plain strings interchangeably for all identifiers.
* Merge normalization status into PlaybookVersionStatus.
* Publish automatically after successful validation.
* Activate automatically after publication.
* Allow two Enabled sources for one Playbook.
* Add Synchronization cancellation.
* Mutate failed Synchronization Runs for retries.
* Mutate Published or Invalid versions.
* Load every Validation Finding as required Aggregate state.
* Create one Aggregate Root per Knowledge Type.
* Use Knowledge title as identity.
* Create stable cross-version KnowledgeItemId values.
* Expose Notion SDK types in core.
* Add users, organizations or authentication.

---

# Required Documentation Alignment

Before implementation begins, the following existing documents should be aligned with these decisions:

## `docs/domain/lifecycle-state-machines.md`

Update:

* Add `Validated` to Playbook Version lifecycle.
* Change `Validating → Published` to `Validating → Validated`.
* Add `Validated → Published`.
* Add `Validated → Archived`.
* State that Synchronization cancellation is deferred from version 1.
* Remove `Cancelled` from the required version 1 Synchronization state set.
* Reference separate normalization lifecycle.

## `docs/domain/version-1-scope.md`

Update:

* Include `Validated` in Playbook Version states.
* Clarify that validation does not publish.
* Clarify that publication is explicit.
* Remove Synchronization cancellation from version 1.
* Add normalization attempt history.
* Confirm multiple historical sources with at most one Enabled source.
* Confirm deterministic version-specific Knowledge identity.

## `docs/domain/version-1-conceptual-model.md`

Update:

* Replace the pending validation-state decision with the approved `Validated` state.
* Confirm Playbook name uniqueness.
* Confirm source history rule.
* Confirm cancellation deferral.
* Confirm separate normalization status.
* Confirm shared discriminated Knowledge Item model.
* Confirm Validation Summary and separate Findings.
* Confirm deterministic version-specific KnowledgeItemId.

## `docs/domain/application-use-cases.md`

Update:

* `Validate Playbook Version` ends in Validated or Invalid.
* `Publish Playbook Version` starts from Validated.
* Remove or mark synchronization cancellation as deferred.
* Add normalization attempt behavior.
* Clarify source replacement sequence.

These are alignment edits, not new architectural decisions.

---

# Final Decision Summary

Version 1 will use:

1. A separate `Validated` Playbook Version state.
2. Explicit publication after validation.
3. Unique non-Archived Playbook names per Workspace.
4. Multiple historical Playbook Sources with at most one Enabled.
5. No Synchronization cancellation.
6. Separate normalization process state and attempt history.
7. One shared Knowledge Item model with discriminated attributes.
8. Validation Summary owned by Playbook Version.
9. Validation Findings stored separately and finalized atomically.
10. Deterministic version-specific KnowledgeItemId values.
11. SourceStableKey for cross-version correlation.
12. Explicit publication and activation as separate operations.

These decisions are approved for version 1 implementation.
