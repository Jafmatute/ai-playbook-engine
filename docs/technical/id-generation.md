# AI Playbook Engine — Identifier Generation

## Purpose

This document defines the identifier strategy for AI Playbook Engine version 1.

It establishes:

- Which concepts require domain identifiers.
- Which identifiers are randomly generated.
- Which identifiers are deterministically generated.
- How identifiers are serialized.
- How identifiers differ from database keys and external references.
- How idempotency and cross-version correlation use identifiers.
- Which package owns identifier contracts and implementations.

This document does not define:

- Database column types.
- ORM decorators.
- API URL formats.
- CLI argument syntax.
- Final cryptographic libraries.
- Persistence indexes.

Those decisions must remain compatible with this strategy.

---

# Identifier Principles

## Identifiers Are Opaque

A domain identifier represents identity only.

Consumers must not infer business information from:

- Prefixes.
- Length.
- Ordering.
- Creation time.
- Internal encoding.
- Database position.

An identifier may use a readable prefix for diagnostics, but the prefix must not become a substitute for type safety.

## Distinct Concepts Use Distinct Types

The following identifiers must not be interchangeable:

- WorkspaceId.
- PlaybookId.
- PlaybookSourceId.
- SynchronizationRunId.
- SynchronizationSnapshotId.
- PlaybookVersionId.
- KnowledgeItemId.
- KnowledgeRelationshipId.
- NormalizationAttemptId.
- ValidationAttemptId.
- ValidationFindingId.
- CommandId.
- CorrelationId.

A function expecting a `PlaybookId` must not accept a `WorkspaceId`, even if both serialize to strings.

## Domain Identity Is Not Storage Identity

A domain identifier is not automatically:

- A database-generated numeric key.
- An ORM entity identifier.
- A file path.
- A Notion object identifier.
- A checksum.
- A sequence number.

Persistence may use the domain identifier directly as its primary key, but that is a persistence decision.

The domain meaning remains independent.

## External Identity Is Separate

External source identifiers must use separate concepts.

Examples:

- Notion page identifier.
- Notion database identifier.
- Notion block identifier.
- Notion user identifier.

They must not be stored in fields such as `PlaybookId` or `KnowledgeItemId`.

## Identity Is Immutable

Once created, an identifier never changes.

Renaming, archiving, moving or reconfiguring a concept does not replace its identity.

---

# Identifier Categories

Version 1 uses four identifier categories:

1. Random domain identifiers.
2. Deterministic domain identifiers.
3. Scoped business sequences.
4. External and operational identifiers.

---

# Random Domain Identifiers

Random identifiers are used for Aggregate Roots and independent records whose identity is created by the Engine.

## Approved Randomly Generated Identifiers

- WorkspaceId.
- PlaybookId.
- PlaybookSourceId.
- SynchronizationRunId.
- SynchronizationSnapshotId.
- PlaybookVersionId.
- NormalizationAttemptId.
- ValidationAttemptId.
- ValidationFindingId.
- KnowledgeRelationshipId when deterministic generation is not required.

## Required Characteristics

Random identifiers must:

- Have sufficiently low collision probability.
- Be generated without a central sequence service.
- Work across local, test and future distributed environments.
- Be serializable as stable strings.
- Avoid exposing database implementation details.
- Be suitable for logs, CLI output and persistence.
- Be generated before persistence when domain creation requires identity.

## Recommended Representation

Version 1 should use UUID-compatible opaque identifiers.

Preferred implementation direction:

- UUID version 7 for newly generated domain records when the selected runtime support and library are stable.
- UUID version 4 as an acceptable fallback.

## Why UUIDv7 Is Preferred

UUIDv7 provides:

- High collision resistance.
- Time-oriented ordering.
- Better database index locality than fully random UUIDv4.
- Client-side generation.
- Standard UUID string representation.

The domain must not depend on the timestamp encoded by UUIDv7.

Sorting by identifier must not replace sorting by an explicit timestamp.

## Fallback Rule

If UUIDv7 requires an unnecessary or unstable dependency, use UUIDv4.

The choice between UUIDv7 and UUIDv4 is an implementation decision constrained by this document.

The project must not create a custom random identifier algorithm.

---

# Deterministic Domain Identifiers

Deterministic identifiers are used when the same normalized input inside the same explicit scope must produce the same identity.

## KnowledgeItemId

Version 1 requires deterministic, version-specific `KnowledgeItemId` values.

Conceptual input:

```text
PlaybookVersionId
SourceStableKey
Knowledge identity strategy version
```

Conceptual formula:

```text
KnowledgeItemId =
  deterministicIdentifier(
    namespace = PlaybookVersionId,
    value = identityStrategyVersion + ":" + SourceStableKey
  )
```

## Required Characteristics

The same inputs must always produce the same `KnowledgeItemId`.

Different values of any of the following must produce different identifiers:

- PlaybookVersionId.
- SourceStableKey.
- Identity strategy version.

The identifier must:

- Be opaque.
- Be UUID-compatible or use another approved stable string format.
- Be safe to persist and serialize.
- Not expose the raw SourceStableKey.
- Not reveal source content.
- Work identically across supported operating systems.

## Recommended Algorithm

Use a standard name-based UUID algorithm.

Preferred direction:

- UUID version 5 using SHA-1 as defined by the UUID standard.

Although SHA-1 is unsuitable for modern cryptographic security, UUIDv5 uses it for deterministic namespacing rather than password or signature security.

The identifier is not used as a cryptographic integrity guarantee.

If a different standards-based deterministic algorithm is selected, it must preserve:

- Stable output.
- Explicit namespace.
- Cross-platform consistency.
- Strategy versioning.
- Fixture-based tests.

A custom ad hoc hash truncation strategy is prohibited.

## Namespace Rule

The `PlaybookVersionId` must participate in the deterministic namespace or input.

This guarantees that the same `SourceStableKey` in two different Playbook Versions does not share the same `KnowledgeItemId`.

Example:

```text
Version 1 + workflow:model-selection
  ≠
Version 2 + workflow:model-selection
```

## Cross-Version Correlation

Cross-version correlation uses:

- SourceStableKey.
- Playbook lineage.
- Source lineage.
- Optional content checksum.

It does not use equality of `KnowledgeItemId`.

---

# KnowledgeRelationshipId

## Decision

Knowledge Relationship identity should be deterministic when the relationship is produced from normalized Playbook content.

Conceptual input:

```text
PlaybookVersionId
Source KnowledgeItemId
Target KnowledgeItemId
Relationship type
Optional discriminator
Relationship identity strategy version
```

Conceptual formula:

```text
KnowledgeRelationshipId =
  deterministicIdentifier(
    version,
    source,
    target,
    type,
    discriminator
  )
```

## Rationale

Deterministic relationship identity supports:

- Idempotent normalization retries.
- Duplicate relationship prevention.
- Stable fixture tests.
- Predictable persistence.

## Discriminator

A discriminator is required only when multiple valid relationships can exist with the same:

- Source.
- Target.
- Relationship type.

Examples may include:

- Different source locations.
- Different labels.
- Different semantic roles.

If duplicates have no valid distinct meaning, they should collapse into one relationship.

---

# Scoped Business Sequences

A sequence represents order or human-facing version progression.

It is not the primary identity.

## VersionSequence

`VersionSequence` is a positive integer scoped to one Playbook.

Examples:

```text
Playbook A
- VersionSequence 1
- VersionSequence 2
- VersionSequence 3

Playbook B
- VersionSequence 1
```

## Rules

- Starts at a positive integer.
- Monotonically increases within one Playbook.
- Is never reused.
- May contain gaps.
- Must be unique within the Playbook.
- Must not replace PlaybookVersionId.
- Must not be globally unique.
- Must not imply semantic-version compatibility.
- Must be assigned safely under concurrency.

## Allocation

The Application layer requests the next sequence through an abstraction.

The Infrastructure implementation must enforce uniqueness transactionally.

Possible technical implementations include:

- Database locking.
- Atomic counter record.
- Query plus unique constraint and retry.
- Database sequence scoped through an allocation table.

The exact strategy will be defined during persistence design.

## Failure and Gaps

If a sequence is allocated but version creation later fails, the sequence may remain unused.

Sequence gaps are acceptable.

Reusing a sequence is not acceptable.

---

# Operational Identifiers

Operational identifiers support traceability and idempotency.

They do not replace domain identities.

---

## CorrelationId

### Purpose

Connect logs and operations that belong to one invocation or pipeline.

Examples:

- One CLI command.
- One ingestion workflow.
- One synchronization process.
- One validation process.

### Generation

A CorrelationId should normally be randomly generated at the delivery boundary.

A caller may supply one in future API or automation contexts when safely validated.

### Rules

- Must be safe for logs.
- Must not contain secrets.
- Must not be used as Aggregate identity.
- May be propagated through Application and adapters.
- Must remain unchanged during the same logical operation.
- Child operations may add separate causation information if needed.

---

## CommandId

### Purpose

Identify one state-changing application request for idempotency.

Candidate use cases:

- Initialize Workspace.
- Register Playbook.
- Start Synchronization.
- Create Draft Playbook Version.
- Publish Playbook Version.
- Activate Playbook Version.

### Rules

- Supplied or created at the application boundary.
- Scoped by operation and Workspace.
- Repeating the same CommandId with equivalent input must return the prior accepted outcome or a safe idempotent result.
- Repeating the same CommandId with conflicting input must fail.
- Must not be used as the created Aggregate identity unless the use case explicitly defines that behavior.

### Initial Scope

Not every version 1 command requires persisted idempotency immediately.

The contract must remain possible for operations susceptible to duplicate invocation.

---

## CausationId

CausationId is optional in version 1.

It may later identify the operation that caused another operation.

Example:

```text
SynchronizationRunCompleted
  causes
CreateDraftPlaybookVersion
```

If introduced:

- CorrelationId groups the overall workflow.
- CausationId identifies the immediate parent operation or event.

Do not implement it speculatively unless a real event workflow requires it.

---

# External Identifiers

## ExternalObjectId

External source objects require typed references.

A generic raw string is insufficient when the object kind matters.

For Notion, candidate object kinds include:

- Page.
- Database.
- Data source.
- Block.
- Database record or page.
- User when source metadata requires it.

## Conceptual Structure

```text
ExternalObjectId
- source type
- object type
- raw external value
```

## Rules

- Raw values must be validated according to the source type.
- Source type is required.
- Object type is required when different object categories may share the same format.
- External identifiers must not be regenerated by the Engine.
- External identifiers must not be treated as secrets.
- External identifiers may appear in traceability output when safe.
- External identifiers must not replace internal identities.

## Notion Identifier Normalization

Notion identifiers may appear:

- With hyphens.
- Without hyphens.
- Inside URLs.

The Notion adapter may normalize valid identifiers into one canonical representation.

The canonical representation must remain stable.

The Core must not implement Notion-specific normalization.

---

# SourceStableKey

## Purpose

`SourceStableKey` correlates normalized knowledge with its stable source meaning.

It is not the primary domain identity.

## Preferred Source

Use a reliable explicit source identity when available.

Examples:

- Notion page ID.
- Notion database-record page ID.
- Explicit metadata key defined in the Playbook.
- Stable block ID for content that maps one-to-one to a Knowledge Item.

## Generated Structural Key

When no reliable external object maps cleanly to one Knowledge Item, the parser may generate a structural key.

A generated structural key must include enough stable context, such as:

- Parent source identity.
- Knowledge type.
- Explicit local key.
- Structural path based on stable source objects.

## Prohibited Inputs

A SourceStableKey must not rely solely on:

- Title.
- Heading text.
- Display order.
- Current array index.
- File or block traversal order.
- Content checksum.

Titles and order may change while the underlying concept remains the same.

Content checksum represents content equality, not identity.

## Normalization

SourceStableKey must have:

- A canonical string form.
- Stable casing rules.
- Stable separator rules.
- An explicit strategy version where generated.

## Uniqueness

SourceStableKey must be unique inside one Playbook Version.

Duplicate keys must cause:

- A normalization failure, or
- A blocking validation finding when normalization can safely complete.

The preferred behavior is to fail normalization when identity is ambiguous.

---

# Identity Strategy Versioning

Deterministic identity behavior must have an explicit version.

Examples:

```text
knowledge-item-id/v1
knowledge-relationship-id/v1
source-stable-key/notion/v1
```

## Purpose

Strategy versioning allows the system to identify which algorithm produced an identifier.

It supports:

- Reprocessing.
- Migrations.
- Fixture stability.
- Diagnostics.
- Controlled algorithm evolution.

## Rules

- Strategy version is immutable for generated records.
- A new algorithm requires a new strategy version.
- Changing strategy version may produce different identifiers.
- Existing Published and Invalid versions must not be rewritten.
- Reprocessing with a new identity strategy must create a new Playbook Version or a controlled migration when explicitly approved.
- Strategy versions must be persisted with normalization metadata when required for reproduction.

---

# Identifier String Format

## Domain Serialization

All domain identifiers must serialize to canonical lowercase strings.

For UUID-based identifiers:

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## Parsing Rules

Parsing must:

- Reject malformed values.
- Normalize accepted UUID casing to lowercase.
- Reject empty strings.
- Reject surrounding whitespace unless the delivery layer trims input before parsing.
- Return a typed validation result or domain-safe error.
- Avoid throwing raw library exceptions across package boundaries.

## Display Prefixes

CLI output may optionally present typed prefixes:

```text
workspace_019...
playbook_019...
sync_019...
version_019...
```

This is not approved as the persisted domain representation in version 1.

If prefixes are later adopted:

- They must be documented.
- Parsing must validate the correct type.
- They must not encode mutable business data.
- They must not duplicate type systems inconsistently.

The initial recommendation is to use canonical UUID strings without custom prefixes.

---

# Typed Identifier Design

## Package Ownership

Generic branded identifier primitives may live in:

```text
packages/shared
```

Domain-specific identifier types belong in:

```text
packages/core
```

Examples:

- Generic branded-string utility: Shared.
- WorkspaceId: Core.
- PlaybookId: Core.
- SynchronizationRunId: Core.

## Desired Characteristics

A domain identifier type should support:

- Construction from a valid canonical string.
- Creation through an injected generator where random.
- Equality.
- String serialization.
- Safe inspection.
- Validation.
- Immutability.

## Prohibited Behavior

Identifier types must not:

- Access environment variables.
- Generate themselves implicitly during arbitrary deserialization.
- Query persistence.
- Contain business state.
- Expose mutable fields.
- Accept any string without validation.
- Share one universal `EntityId` type throughout the domain.

## TypeScript Direction

The implementation may use:

- Branded string types.
- Small immutable Value Object classes.
- A controlled hybrid approach.

The exact pattern will be selected before the first implementation task.

Whichever pattern is chosen must prevent accidental mixing of identifier types.

---

# Identifier Generation Ports

## RandomIdGenerator

The Application or Core construction boundary may require a generator contract.

Conceptual behavior:

```text
generate WorkspaceId
generate PlaybookId
generate SynchronizationRunId
```

## Design Direction

Prefer concept-specific factories or a generic approved random UUID generator combined with typed identifier constructors.

Avoid a service with arbitrary string type names such as:

```text
generate("playbook")
```

when compile-time types can provide stronger safety.

## DeterministicIdGenerator

A deterministic identity service must accept:

- Explicit namespace.
- Canonical input.
- Strategy version.

It returns a stable opaque identifier.

The implementation belongs in Infrastructure when it uses a technical UUID or hashing library.

The deterministic identity policy and input composition remain domain or normalization concerns.

## Dependency Direction

Core and Application may define or use abstractions.

Infrastructure provides the algorithm implementation.

Core must not import a UUID library merely for infrastructure convenience unless the chosen typed identifier implementation requires a small approved domain-safe dependency.

---

# Identifier Generation by Concept

| Concept                   | Strategy                                 | Scope                                    |
| ------------------------- | ---------------------------------------- | ---------------------------------------- |
| WorkspaceId               | Random UUID                              | Global                                   |
| PlaybookId                | Random UUID                              | Global                                   |
| PlaybookSourceId          | Random UUID                              | Global                                   |
| SynchronizationRunId      | Random UUID                              | Global                                   |
| SynchronizationSnapshotId | Random UUID                              | Global                                   |
| PlaybookVersionId         | Random UUID                              | Global                                   |
| NormalizationAttemptId    | Random UUID                              | Global                                   |
| ValidationAttemptId       | Random UUID                              | Global                                   |
| ValidationFindingId       | Random UUID                              | Global                                   |
| KnowledgeItemId           | Deterministic UUID                       | Playbook Version + SourceStableKey       |
| KnowledgeRelationshipId   | Deterministic preferred                  | Playbook Version + relationship identity |
| VersionSequence           | Monotonic integer                        | Playbook                                 |
| CorrelationId             | Random UUID                              | Logical operation                        |
| CommandId                 | Random or caller-provided validated UUID | Workspace + operation                    |
| ExternalObjectId          | External value                           | Source system                            |
| SourceStableKey           | Source-derived canonical key             | Playbook Version uniqueness              |

---

# Database Considerations

This document does not select database types, but persistence must preserve canonical identifiers.

Recommended direction:

- PostgreSQL UUID type for UUID-based domain identifiers.
- Integer or bigint for VersionSequence.
- Text for SourceStableKey.
- Text plus explicit metadata for external identifiers when needed.

## Rules

- Database-generated sequential integer primary keys must not replace domain identifiers.
- If internal surrogate keys are introduced for performance, they remain private to Infrastructure.
- Foreign-key relations must use authoritative identifiers or safe internal mappings.
- Workspace isolation may require composite uniqueness including WorkspaceId.
- Deterministic identifiers must be persisted exactly as generated.
- Database triggers must not independently generate domain identifiers without Application awareness.

---

# File Storage Identifiers

Snapshot payloads use a `StorageReference`.

A storage key may include:

- WorkspaceId.
- PlaybookSourceId.
- SynchronizationSnapshotId.
- ContentChecksum.

Example conceptual organization:

```text
workspaces/{workspaceId}/snapshots/{snapshotId}/payload.json
```

This is an infrastructure detail.

Rules:

- StorageReference is not SynchronizationSnapshotId.
- Moving a payload must not change Snapshot identity.
- A storage path must not be accepted directly from untrusted CLI input.
- Path traversal must be prevented.
- The domain must not construct operating-system paths.

---

# Logging and Redaction

Domain and operational identifiers may appear in structured logs.

Recommended log fields:

```text
workspaceId
playbookId
playbookSourceId
synchronizationRunId
snapshotId
playbookVersionId
correlationId
commandId
```

## Rules

- Identifiers are not considered secrets by default.
- External URLs may contain sensitive query information and require sanitization.
- CredentialReference may be logged only in a redacted or approved safe form.
- Raw secrets must never appear.
- Large arrays of identifiers should not be logged without diagnostic need.

---

# CLI Behavior

The CLI must:

- Accept canonical identifiers.
- Validate identifier type and format.
- Produce clear errors for malformed identifiers.
- Support identifier output in JSON.
- Avoid requiring users to infer identity from names.
- Permit selection by name only in commands where uniqueness is guaranteed and ambiguity is handled.

## Name Resolution

A command may accept a unique Playbook name for usability.

The Application must resolve it to PlaybookId.

Historical operations should prefer explicit identifiers when ambiguity or archival state matters.

Names do not replace identifiers.

---

# Idempotency Rules

## Command Identity

For use cases using CommandId, the idempotency record must bind:

- WorkspaceId.
- Operation name.
- CommandId.
- Canonical input checksum.
- Outcome reference.
- Creation timestamp.

## Repeated Equivalent Command

Same Workspace, operation, CommandId and equivalent input:

- Return previous outcome or safe no-change result.
- Do not create a duplicate Aggregate.

## Repeated Conflicting Command

Same Workspace, operation and CommandId with different canonical input:

- Return an idempotency conflict.
- Do not execute the second command.

## Aggregate Identity

CommandId must not automatically equal the created Aggregate identifier.

They serve different purposes.

A future use case may intentionally derive Aggregate identity from CommandId, but that requires an explicit decision.

---

# Equality Rules

Identifiers are equal when their canonical serialized values are equal and their domain types match.

Examples:

```text
PlaybookId(A) == PlaybookId(A)
```

Valid.

```text
PlaybookId(A) == WorkspaceId(A)
```

Invalid comparison at the type level.

## External Identifier Equality

External identifiers are equal only when all required context matches:

- Source system.
- Object type.
- Canonical external value.

The same raw string under different source systems is not the same identity.

---

# Error Rules

Identifier-related failures must use stable error categories.

Candidate error codes:

```text
INVALID_IDENTIFIER
INVALID_WORKSPACE_ID
INVALID_PLAYBOOK_ID
INVALID_EXTERNAL_OBJECT_ID
DUPLICATE_SOURCE_STABLE_KEY
IDENTITY_STRATEGY_UNSUPPORTED
IDENTITY_GENERATION_FAILED
IDEMPOTENCY_CONFLICT
VERSION_SEQUENCE_CONFLICT
```

Delivery layers map these errors to:

- CLI messages.
- Exit codes.
- Future HTTP responses.

Raw UUID-library errors must not escape as expected application errors.

---

# Testing Requirements

## Random Identifier Tests

Test:

- Generated values are valid.
- Consecutive generation produces distinct values.
- Canonical serialization is lowercase.
- Parsing round-trips.
- Invalid values are rejected.
- Identifier types cannot be mixed in compile-time type tests where feasible.

Tests must not attempt to prove mathematical collision impossibility.

## Deterministic Identifier Tests

Use fixed fixtures to verify:

- Same namespace and input produce the same identifier.
- Different PlaybookVersionId produces a different identifier.
- Different SourceStableKey produces a different identifier.
- Different strategy version produces a different identifier.
- Cross-platform canonicalization remains stable.
- Unicode normalization behavior is defined and stable.
- Whitespace rules are explicit.

## SourceStableKey Tests

Test:

- Reliable external IDs map consistently.
- Generated structural keys are stable.
- Duplicate keys are detected.
- Title changes do not change identity when an external stable ID exists.
- Display-order changes do not change identity.
- Strategy version is recorded.

## VersionSequence Tests

Test:

- First sequence is positive.
- Sequence increases.
- Sequence is scoped by Playbook.
- Gaps are accepted.
- Concurrent allocation cannot produce duplicate committed values.
- Sequence is never reused after committed creation.

## Idempotency Tests

Test:

- Equivalent repeated command returns the prior outcome.
- Conflicting repeated command fails.
- Different Workspace may use the same CommandId without collision when scope permits.
- Different operation may use the same CommandId when operation forms part of the key.

---

# Migration Rules

Identifier strategy changes are high-impact.

Changing any of the following requires explicit migration design:

- UUID version for existing records.
- Deterministic algorithm.
- Knowledge identity namespace composition.
- SourceStableKey strategy.
- Relationship identity strategy.
- Identifier string format.
- VersionSequence allocation semantics.

## Historical Rule

Published and Invalid Playbook Versions must preserve their original identifiers and identity strategy metadata.

A new strategy does not rewrite historical knowledge.

## Reprocessing Rule

Reprocessing with a new deterministic strategy should normally create a new Playbook Version.

This preserves reproducibility and avoids hidden identity replacement.

---

# Prohibited Strategies

Version 1 must not use:

- Auto-incrementing integers as public domain identity.
- Database row position.
- Array index.
- Display order.
- Title alone.
- Timestamp alone.
- Content checksum alone.
- File path.
- Notion URL.
- Random IDs for KnowledgeItem when deterministic normalization is required.
- Stable cross-version KnowledgeItemId.
- Custom short-ID algorithms without documented collision analysis.
- Secret values as identifier input.
- Mutable business values embedded into primary identity.

---

# Package Responsibilities

## Shared

May contain:

- Generic branded identifier utility.
- Generic UUID string validation primitives.
- Generic equality helpers.

Must not contain:

- WorkspaceId.
- PlaybookId.
- KnowledgeItemId.
- SourceStableKey domain policy.

## Core

Owns:

- Domain-specific identifier types.
- SourceStableKey.
- VersionSequence.
- Identity-related domain errors.
- Deterministic Knowledge identity input policy.

## Application

Owns:

- CommandId usage contracts.
- Idempotency ports.
- Sequence allocation port where persistence is required.
- Identifier generation orchestration for use cases.

## Infrastructure

Implements:

- Random UUID generator.
- Deterministic UUID generator.
- Sequence allocation.
- Idempotency persistence.
- Storage-key generation.
- Technical parsing adapters where needed.

## Notion

Owns:

- Notion external identifier parsing and canonicalization.
- Mapping Notion IDs to ExternalObjectId.
- Source-specific SourceStableKey candidate generation.

It must not generate domain Aggregate identifiers independently unless injected through an approved generator.

## CLI

Owns:

- Identifier argument parsing.
- User-facing validation messages.
- JSON serialization.
- Name-to-ID resolution invocation.

It must not implement identity algorithms.

---

# Approved Version 1 Direction

Version 1 will use:

- Typed, opaque domain identifiers.
- UUID-compatible random identifiers for Aggregate Roots and independent records.
- UUIDv7 when practical, UUIDv4 as fallback.
- Deterministic UUIDv5-style identity for Knowledge Items.
- Deterministic relationship identity where normalization benefits from it.
- Version-specific KnowledgeItemId.
- SourceStableKey for cross-version correlation.
- Positive monotonic VersionSequence per Playbook.
- Explicit CommandId and CorrelationId concepts.
- External identifiers separated from domain identity.
- Strategy versioning for deterministic algorithms.
- Canonical lowercase UUID serialization.
- Infrastructure implementations behind approved contracts.

---

# Completion Criteria

The identifier strategy is ready for implementation when:

- Every version 1 domain concept has an approved identity category.
- Random and deterministic identifiers are clearly separated.
- Knowledge identity inputs are explicit.
- Cross-version correlation does not depend on KnowledgeItemId equality.
- VersionSequence is distinct from PlaybookVersionId.
- External identifiers remain isolated.
- Package ownership is clear.
- Parsing and serialization rules are defined.
- Idempotency identity is separated from Aggregate identity.
- Testing requirements are explicit.
