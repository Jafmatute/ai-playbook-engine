# AI Playbook Engine — Repository Contracts

## Purpose

This document defines the persistence contracts required by the Application layer for AI Playbook Engine version 1.

It establishes:

* Repository ownership.
* Repository responsibilities.
* Aggregate loading and persistence rules.
* Query boundaries.
* Workspace isolation requirements.
* Optimistic concurrency expectations.
* Transaction participation.
* Uniqueness and conflict detection.
* Error behavior.
* Testing requirements.

This document does not define:

* Database tables.
* SQL queries.
* ORM models.
* Migration files.
* PostgreSQL indexes.
* Concrete repository classes.
* Connection-pool configuration.
* Snapshot payload storage.

Repository interfaces belong to the Application package.

Concrete implementations belong to Infrastructure.

---

# Repository Principles

## Repositories Represent Domain Collections

A repository provides access to Aggregate Roots or authoritative immutable records.

It must not be designed as a generic database-access abstraction.

Repositories should expose operations required by approved use cases.

They must not expose arbitrary persistence behavior such as:

```text
findAny
executeRaw
saveObject
queryTable
deleteWhere
```

## Aggregate-Oriented Persistence

Repositories load and persist Aggregate Roots.

Examples:

* WorkspaceRepository persists Workspace.
* PlaybookRepository persists Playbook.
* PlaybookSourceRepository persists PlaybookSource.
* SynchronizationRunRepository persists SynchronizationRun.
* PlaybookVersionRepository persists PlaybookVersion.

Repositories must not allow callers to mutate internal persistence records directly.

## Application Owns Contracts

Repository interfaces live in:

```text
packages/application
```

Infrastructure implements them.

Core must not import repository interfaces.

This preserves:

```text
Infrastructure → Application → Core
```

## Workspace Awareness

Every tenant-owned repository operation must be scoped by Workspace.

A repository must not infer a global Workspace silently.

A method such as:

```text
findById(playbookId)
```

is insufficient for tenant-owned data.

The conceptual contract must include:

```text
findById(workspaceId, playbookId)
```

or an equivalent explicit Workspace scope.

## No ORM Leakage

Repository contracts must not expose:

* ORM entities.
* Query-builder objects.
* Database rows.
* Transaction clients from a vendor library.
* SQL fragments.
* Lazy-loading proxies.
* Database-specific pagination cursors.

## Explicit Absence

A missing record must be represented explicitly.

Possible implementation direction:

```text
Option<T>
```

or:

```text
T | null
```

The final Result and Option primitives will be defined separately.

Repositories must not throw expected not-found exceptions by default.

Application use cases translate absence into Application errors.

---

# Repository Categories

Version 1 uses four persistence contract categories:

1. Aggregate repositories.
2. Immutable record repositories.
3. Query repositories or read services.
4. Coordination and transaction contracts.

---

# Aggregate Repositories

Aggregate repositories persist authoritative mutable Aggregate Roots.

Version 1 Aggregate repositories:

* WorkspaceRepository.
* PlaybookRepository.
* PlaybookSourceRepository.
* SynchronizationRunRepository.
* PlaybookVersionRepository.

These repositories enforce optimistic concurrency where required.

---

# Immutable Record Repositories

Immutable records are created once and not updated after finalization.

Version 1 candidates:

* SynchronizationSnapshotRepository.
* NormalizationAttemptRepository.
* ValidationFindingRepository.
* KnowledgeItemRepository.
* KnowledgeRelationshipRepository.

Some of these contracts may support staged construction while a Draft version is being normalized.

Finalized records remain immutable.

---

# Query Repositories

Queries that do not enforce Aggregate invariants may use dedicated read contracts.

Examples:

* List Playbooks.
* List Synchronization Runs.
* List Playbook Versions.
* Search Knowledge.
* Retrieve validation findings.
* Retrieve version summaries.

Query contracts may return read models rather than domain Aggregates.

Read models must not become authoritative state.

---

# Transaction Contracts

Cross-repository application operations may require one transaction.

Examples:

* Create Playbook Version and allocate VersionSequence.
* Complete normalization and persist Knowledge Items.
* Complete validation and persist Validation Summary plus Findings.
* Activate a version and persist the Playbook.
* Complete Synchronization Run and persist Snapshot metadata.

The Application layer defines the transaction boundary.

Infrastructure provides the transaction mechanism.

---

# Common Repository Rules

## Workspace Scope

All tenant-owned methods require WorkspaceId.

Examples:

```text
findById(workspaceId, aggregateId)
exists(workspaceId, aggregateId)
```

Queries must never return records from another Workspace.

A not-found result must not reveal whether the identifier exists in a different Workspace.

## Stable Ordering

List methods must define deterministic ordering.

Examples:

* Created timestamp descending.
* VersionSequence descending.
* Name ascending plus identifier tie-breaker.

Database default ordering is prohibited.

## Pagination

List and search contracts should support bounded pagination when result sets may grow.

Version 1 may use offset pagination for simple local queries.

The contract must define:

* Page size.
* Maximum page size.
* Stable ordering.
* Total count only when required.

Repository contracts must not expose PostgreSQL-specific cursors.

## Concurrency Revision

Mutable Aggregates should carry a persistence revision.

Conceptual behavior:

```text
save(aggregate, expectedRevision)
```

A conflicting update produces a concurrency conflict.

The revision:

* Is not the domain identity.
* Is not exposed as business state.
* Must increase after successful persistence.
* Must not be generated independently by Application.

The exact representation may be:

* Integer revision.
* Database xmin-style mechanism.
* Updated timestamp only if collision-safe.

Preferred direction:

* Explicit positive integer revision.

## Create Versus Save

Contracts should distinguish creation from update where that improves correctness.

Examples:

```text
insert(workspace)
update(workspace, expectedRevision)
```

This prevents accidental upsert behavior.

Generic `save` is acceptable only when its creation and concurrency semantics are explicit.

## No Silent Upsert

Repositories must not convert:

* Missing update into create.
* Duplicate create into update.
* Concurrency conflict into overwrite.

## No Hard Delete in Version 1

Version 1 does not require hard deletion of authoritative domain data.

Archival and status transitions preserve history.

Repository contracts should not expose general delete operations unless a specific cleanup use case is approved.

---

# WorkspaceRepository

## Purpose

Persist and retrieve Workspace Aggregates.

## Required Operations

### Find by Identifier

Conceptual contract:

```text
findById(workspaceId)
```

Returns:

* Workspace when found.
* Explicit absence when not found.

Workspace is its own tenant boundary, so the identifier is sufficient.

### Insert

```text
insert(workspace)
```

Requirements:

* Fail on duplicate WorkspaceId.
* Preserve initial revision.
* Persist canonical name and status.

### Update

```text
update(workspace, expectedRevision)
```

Requirements:

* Fail on missing record.
* Fail on revision conflict.
* Persist only valid Aggregate state.

### Count or Detect Initialization

A personal-mode bootstrap use case requires a way to determine whether initialization already occurred.

Preferred contract:

```text
hasAnyWorkspace()
```

or a dedicated installation-state contract.

This operation must not evolve into an implicit global Workspace resolver.

## Query Operations

Candidate read operation:

```text
getSummary(workspaceId)
```

A complete list of Workspaces is not required for initial personal mode.

---

# PlaybookRepository

## Purpose

Persist Playbook Aggregates and enforce name uniqueness safely.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, playbookId)
```

### Find by Normalized Name

```text
findByNormalizedName(workspaceId, normalizedName)
```

Used for:

* Creation conflict detection.
* Rename conflict detection.
* Name-based CLI resolution.
* Restore conflict detection.

Archived Playbooks may be included or excluded through an explicit query option.

The method must not rely on display-name casing.

### Insert

```text
insert(playbook)
```

Requirements:

* Enforce unique non-Archived normalized name per Workspace.
* Fail on duplicate PlaybookId.
* Return or expose the new revision.

### Update

```text
update(playbook, expectedRevision)
```

Requirements:

* Enforce name uniqueness.
* Enforce optimistic concurrency.
* Persist active-version reference changes atomically within the Playbook record.

### List

Read-oriented operation:

```text
list(workspaceId, filter, pagination)
```

Candidate filters:

* Status.
* Normalized name prefix.
* Has active version.

Ordering must be deterministic.

## Uniqueness Error

A persistence-level name conflict must map to:

```text
PLAYBOOK_NAME_CONFLICT
```

The repository implementation must not expose a raw constraint name to Application callers.

---

# PlaybookSourceRepository

## Purpose

Persist Playbook Source Aggregates and enforce the one-Enabled-source-per-Playbook rule.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, playbookSourceId)
```

### Find Enabled Source for Playbook

```text
findEnabledByPlaybookId(workspaceId, playbookId)
```

Returns at most one source.

### List Sources for Playbook

```text
listByPlaybookId(workspaceId, playbookId, pagination)
```

Must include historical Disabled sources.

### Insert

```text
insert(playbookSource)
```

Requirements:

* Enforce Workspace and Playbook ownership consistency.
* Enforce at most one Enabled source per Playbook.
* Fail on duplicate source identifier.

### Update

```text
update(playbookSource, expectedRevision)
```

Requirements:

* Enforce optimistic concurrency.
* Enforce at most one Enabled source.
* Preserve immutable ownership fields.
* Preserve historical synchronization references.

## Active Source Conflict

A persistence conflict must map to:

```text
ENABLED_PLAYBOOK_SOURCE_CONFLICT
```

## Source Lookup by External Root

Candidate operation:

```text
findByExternalRoot(
  workspaceId,
  playbookId,
  sourceType,
  canonicalExternalRoot
)
```

Use only when required to prevent duplicate source registration.

The external-root comparison logic must use canonical source values produced by the relevant adapter or validated application input.

---

# SynchronizationRunRepository

## Purpose

Persist Synchronization Run Aggregates and support operational history.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, synchronizationRunId)
```

### Insert Pending Run

```text
insert(run)
```

Requirements:

* Fail on duplicate run identifier.
* Enforce one active run per source.
* Persist CommandId or idempotency reference when approved.

### Update Lifecycle State

```text
update(run, expectedRevision)
```

Requirements:

* Enforce optimistic concurrency.
* Preserve terminal state.
* Persist timestamps, progress and failure metadata safely.

### Find Active Run by Source

```text
findActiveBySourceId(workspaceId, playbookSourceId)
```

Active means:

* Pending.
* Running.

Returns at most one run.

### List Runs

```text
listBySourceId(workspaceId, playbookSourceId, filter, pagination)
```

Candidate filters:

* Status.
* Created date range.
* Retry lineage.

### Find Previous Successful Run

```text
findLatestCompletedBySourceId(workspaceId, playbookSourceId)
```

Used for:

* Snapshot checksum comparison.
* Detecting unchanged content.
* Source success metadata.

### Find Stale Running Runs

Operational recovery query:

```text
findStaleRunning(workspaceId, olderThan, pagination)
```

May later support system-wide recovery through a separate administrative scope.

## Active Run Constraint

The database must protect the invariant:

```text
At most one Pending or Running Synchronization Run per Playbook Source.
```

Application pre-checks improve error messages but do not replace the constraint.

## Terminal History

Repository updates must never:

* Reset Failed to Pending.
* Reset Completed to Running.
* Replace a run during retry.
* Remove failure history.

Retries create new SynchronizationRun records.

---

# SynchronizationSnapshotRepository

## Purpose

Persist immutable Snapshot metadata.

The payload itself is handled through SnapshotStorage.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, snapshotId)
```

### Find by Run Identifier

```text
findBySynchronizationRunId(workspaceId, synchronizationRunId)
```

There is at most one authoritative Snapshot per completed run.

### Insert

```text
insert(snapshot)
```

Requirements:

* Fail on duplicate SnapshotId.
* Fail when the run already has a Snapshot.
* Preserve immutable metadata.
* Store canonical checksum and StorageReference.

### Find Latest by Source

```text
findLatestBySourceId(workspaceId, playbookSourceId)
```

### Find by Checksum

Optional optimization:

```text
findLatestByChecksum(
  workspaceId,
  playbookSourceId,
  contentChecksum
)
```

Used for diagnostics and payload deduplication coordination.

It must not replace the rule that every successful run receives its own Snapshot metadata record.

## Prohibited Operations

No general update method.

A controlled storage migration may update StorageReference through a separate administrative contract later.

No delete method in version 1.

---

# PlaybookVersionRepository

## Purpose

Persist Playbook Version Aggregates and their bounded lifecycle state.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, playbookVersionId)
```

### Find by Sequence

```text
findBySequence(workspaceId, playbookId, versionSequence)
```

### Find Latest Version

```text
findLatestByPlaybookId(workspaceId, playbookId)
```

Latest means highest VersionSequence, not most recently published.

### Find Latest Version by Processing Identity

Candidate operation:

```text
findByProcessingIdentity(
  workspaceId,
  playbookId,
  snapshotChecksum,
  parserVersion,
  normalizationSchemaVersion
)
```

Used to prevent duplicate version creation.

The final processing identity fields will be fixed during application-contract design.

### Insert Draft

```text
insert(version)
```

Requirements:

* Enforce unique PlaybookId plus VersionSequence.
* Enforce duplicate-processing rules where approved.
* Fail on duplicate PlaybookVersionId.

### Update Lifecycle

```text
update(version, expectedRevision)
```

Requirements:

* Enforce optimistic concurrency.
* Persist only valid lifecycle transitions.
* Preserve immutable ownership and source lineage.
* Persist ValidationSummary atomically when validation completes.
* Preserve publication and archive timestamps.

### List Versions

```text
listByPlaybookId(workspaceId, playbookId, filter, pagination)
```

Candidate filters:

* Status.
* Sequence range.
* Published date range.
* Snapshot identifier.

## Execution Eligibility Query

Version 1 does not execute workflows, but activation requires checking Published status.

The Aggregate loaded through `findById` remains authoritative.

A read-model-only status query must not be used to bypass Aggregate validation in state-changing use cases.

---

# VersionSequenceAllocator

## Classification

This is a persistence coordination contract, not a normal Aggregate repository.

## Purpose

Allocate a unique positive VersionSequence for one Playbook.

## Conceptual Operation

```text
allocateNext(workspaceId, playbookId)
```

## Rules

* Monotonically increases.
* Never reuses committed or reserved sequences.
* May produce gaps.
* Must be concurrency-safe.
* Must participate in the same transaction as Draft version creation when possible.

## Error

Allocation conflict or failure must be distinguishable from:

* Playbook not found.
* Generic database failure.
* Duplicate idempotent request.

---

# NormalizationAttemptRepository

## Purpose

Persist normalization attempt history.

Normalization attempts are immutable after reaching Completed or Failed.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, normalizationAttemptId)
```

### Find Latest by Version

```text
findLatestByPlaybookVersionId(workspaceId, playbookVersionId)
```

### List Attempts

```text
listByPlaybookVersionId(workspaceId, playbookVersionId)
```

Ordered by attempt sequence or creation time deterministically.

### Insert Pending Attempt

```text
insert(attempt)
```

### Update Active Attempt

```text
update(attempt, expectedRevision)
```

Allowed only while:

* Pending.
* Running.

Terminal attempts are immutable.

## Active Attempt Rule

At most one Pending or Running normalization attempt may exist per Playbook Version.

The database must enforce this rule.

---

# KnowledgeItemRepository

## Purpose

Persist and retrieve Knowledge Items for a Playbook Version.

Knowledge Items are built during normalization and become immutable after validation finalization.

## Write Operations

### Replace Draft Normalization Set

The preferred initial contract is not one-item-at-a-time mutation.

Conceptual operation:

```text
storeNormalizedItems(
  workspaceId,
  playbookVersionId,
  normalizationAttemptId,
  items
)
```

Requirements:

* Version remains Draft.
* Attempt is active.
* All items belong to the same Workspace, Playbook and Version.
* SourceStableKey is unique within the version.
* KnowledgeItemId matches deterministic identity policy.
* Type-specific attributes are valid.
* Operation participates in a transaction.

## Alternative Batch Operations

If payload size requires batching:

```text
insertBatch(...)
finalizeNormalizationSet(...)
```

The contract must prevent a partial batch set from being treated as completed normalization.

## Read Operations

### Find Item by Identifier

```text
findById(workspaceId, playbookVersionId, knowledgeItemId)
```

### Find by Source Stable Key

```text
findBySourceStableKey(
  workspaceId,
  playbookVersionId,
  sourceStableKey
)
```

### List by Version

```text
listByVersion(workspaceId, playbookVersionId, filter, pagination)
```

Candidate filters:

* KnowledgeType.
* Parent KnowledgeItemId.
* Title.
* SourceStableKey.

### Count by Version

```text
countByVersion(workspaceId, playbookVersionId)
```

### Search

Search belongs to a read/query contract rather than the Aggregate-write repository.

## Immutability Rule

After the version leaves Validating and becomes:

* Validated.
* Invalid.
* Published.
* Archived.

Knowledge Items cannot be updated.

The repository implementation must not expose a generic update operation.

## Draft Retry Rule

A failed normalization retry may replace an incomplete Draft set only through a controlled transaction.

Historical successful normalization output must not be overwritten after validation starts.

---

# KnowledgeRelationshipRepository

## Purpose

Persist immutable directed relationships between Knowledge Items.

## Required Operations

### Store Relationship Set

Conceptual operation:

```text
storeRelationships(
  workspaceId,
  playbookVersionId,
  normalizationAttemptId,
  relationships
)
```

Requirements:

* All items belong to the same version.
* Relationship identities follow deterministic rules.
* Invalid structural cycles are rejected before finalization.
* Duplicate relationships are rejected or deterministically collapsed according to policy.

### List by Source Item

```text
listBySourceItem(
  workspaceId,
  playbookVersionId,
  sourceKnowledgeItemId
)
```

### List by Target Item

```text
listByTargetItem(
  workspaceId,
  playbookVersionId,
  targetKnowledgeItemId
)
```

### List by Version

```text
listByVersion(workspaceId, playbookVersionId, filter, pagination)
```

## Immutability

The same finalization rules as Knowledge Items apply.

No general update operation is exposed.

---

# ValidationFindingRepository

## Purpose

Persist immutable findings associated with one ValidationAttempt.

## Required Operations

### Insert Finalized Finding Set

Conceptual operation:

```text
insertFindings(
  workspaceId,
  playbookVersionId,
  validationAttemptId,
  findings
)
```

Requirements:

* Every finding belongs to the same Workspace and version.
* KnowledgeItem references belong to the same version.
* Validation codes are present.
* Findings are immutable after insertion.
* The operation participates in the same transaction that updates PlaybookVersion ValidationSummary and lifecycle status.

### List by Version

```text
listByPlaybookVersionId(
  workspaceId,
  playbookVersionId,
  filter,
  pagination
)
```

Candidate filters:

* Severity.
* Blocking.
* ValidationStage.
* ValidationCode.
* KnowledgeItemId.

### List by Attempt

```text
listByValidationAttemptId(
  workspaceId,
  validationAttemptId,
  pagination
)
```

### Count Summary

A query may return counts, but the authoritative ValidationSummary remains on PlaybookVersion.

Repository implementations must not recalculate a different summary silently for lifecycle decisions.

## Prohibited Operations

* Update finding.
* Delete finding.
* Reassign finding to another version.
* Change severity after finalization.

---

# ValidationAttemptRepository

## Purpose

Preserve validation-attempt metadata and lifecycle when modeled separately from PlaybookVersion.

## Required Operations

### Find by Identifier

```text
findById(workspaceId, validationAttemptId)
```

### Find by Version

```text
findByPlaybookVersionId(workspaceId, playbookVersionId)
```

Version 1 permits at most one finalized validation attempt per Playbook Version.

### Insert

```text
insert(attempt)
```

### Update Active Attempt

```text
update(attempt, expectedRevision)
```

After completion, the attempt becomes immutable.

## Relationship to PlaybookVersion

PlaybookVersion owns lifecycle status and ValidationSummary.

ValidationAttempt preserves process metadata.

Validation completion must persist:

* Attempt terminal state.
* Findings.
* ValidationSummary.
* PlaybookVersion transition.

in one transaction.

---

# Query Contracts

Query contracts return purpose-built read models.

They may live close to their application module.

They must remain separate from write repositories when query needs diverge.

---

# PlaybookQueries

Candidate operations:

```text
listPlaybooks(workspaceId, filter, pagination)
getPlaybookDetails(workspaceId, playbookId)
resolvePlaybookByName(workspaceId, normalizedName, includeArchived)
```

Read model may include:

* PlaybookId.
* Name.
* Status.
* Active version summary.
* Source summary.
* Created and updated timestamps.

It must not expose:

* Persistence revision unless required for a state-changing command contract.
* ORM internals.
* Credentials.

---

# SynchronizationQueries

Candidate operations:

```text
listSynchronizationRuns(...)
getSynchronizationRunDetails(...)
getSynchronizationHistorySummary(...)
```

Read model may include:

* Status.
* Source.
* Counts.
* Checksum.
* Unchanged indicator.
* Previous run reference.
* Failure summary.
* Retry eligibility.

---

# PlaybookVersionQueries

Candidate operations:

```text
listPlaybookVersions(...)
getPlaybookVersionDetails(...)
getValidationSummary(...)
```

Read model may include:

* VersionSequence.
* Status.
* Normalization status.
* Snapshot reference.
* ValidationSummary.
* Active indicator.
* Publication and archive timestamps.

---

# KnowledgeQueries

## Purpose

Support version 1 knowledge browsing and search.

## Candidate Operations

```text
listKnowledgeItems(
  workspaceId,
  playbookVersionId,
  filter,
  pagination
)

getKnowledgeItem(
  workspaceId,
  playbookVersionId,
  knowledgeItemId
)

searchKnowledge(
  workspaceId,
  playbookVersionId,
  searchInput,
  pagination
)

listKnowledgeRelationships(
  workspaceId,
  playbookVersionId,
  knowledgeItemId
)
```

## Search Input

Candidate fields:

* Text.
* KnowledgeType.
* Parent identifier.
* Title-only flag.
* SourceStableKey.
* Tag when supported.

## Search Rules

Version 1 search is deterministic.

The contract must not imply:

* Embeddings.
* Semantic vector search.
* AI ranking.
* Fuzzy behavior not explicitly defined.

## Search Result

Candidate fields:

* KnowledgeItemId.
* KnowledgeType.
* Title.
* Matched text excerpt.
* SourceStableKey.
* Parent summary.
* Source traceability summary.
* Stable relevance or ordering metadata.

---

# CurrentWorkspaceProvider

## Classification

Application context contract.

It is not a domain repository.

## Purpose

Resolve the current Workspace in personal mode.

## Conceptual Operation

```text
getCurrentWorkspaceId()
```

## Rules

* Does not return a hard-coded identifier from multiple locations.
* Does not create a Workspace.
* Does not bypass WorkspaceRepository existence checks.
* Infrastructure or composition owns the concrete configuration-based implementation.
* Future API and Worker implementations may resolve Workspace differently.

---

# TransactionManager

## Purpose

Allow Application use cases to define atomic work across multiple repositories.

## Conceptual Operation

```text
execute(transactionalWork)
```

The exact TypeScript shape will be defined during implementation design.

## Rules

* Application owns the abstraction.
* Infrastructure owns the implementation.
* Repositories used inside the transaction must share the same transaction context.
* Application code must not receive a vendor-specific database client.
* Nested transactions require explicit semantics.
* External API calls must not normally execute inside a database transaction.
* Long-running Notion retrieval must not keep a database transaction open.

## Example: Successful Synchronization Completion

Recommended sequence:

1. Retrieve and build payload outside transaction.
2. Write payload to SnapshotStorage.
3. Begin database transaction.
4. Insert Snapshot metadata.
5. Complete SynchronizationRun.
6. Update PlaybookSource success metadata.
7. Commit transaction.
8. If database commit fails, preserve or clean orphaned storage through recovery policy.

The exact compensation strategy will be defined in storage contracts.

## Example: Validation Completion

Inside one transaction:

1. Insert finalized Validation Findings.
2. Update ValidationAttempt.
3. Update PlaybookVersion ValidationSummary.
4. Transition version to Validated or Invalid.
5. Commit.

---

# UnitOfWork Decision

## Decision

Version 1 will not expose a generic domain-wide UnitOfWork abstraction unless implementation proves it necessary.

Preferred direction:

* Application-level TransactionManager.
* Explicit repositories.
* Transaction-scoped repository implementations or context.

Avoid:

```text
unitOfWork.repository("playbook")
unitOfWork.commit()
```

when typed repository contracts provide stronger boundaries.

---

# Repository Error Contract

Repositories return or throw only persistence-neutral errors defined through Application-facing port contracts.

Expected repository outcomes include:

* Record found.
* Explicit absence.
* Inserted.
* Updated.
* Concurrency conflict.
* Known uniqueness conflict.
* Infrastructure failure.

## Known Conflict Translation

Repository implementations must translate known constraints.

Examples:

| Constraint meaning             | Application-facing error              |
| ------------------------------ | ------------------------------------- |
| Active Playbook name duplicate | `PLAYBOOK_NAME_CONFLICT`              |
| More than one Enabled source   | `ENABLED_PLAYBOOK_SOURCE_CONFLICT`    |
| More than one active sync run  | `ACTIVE_SYNCHRONIZATION_RUN_CONFLICT` |
| Duplicate version sequence     | `VERSION_SEQUENCE_CONFLICT`           |
| Duplicate SourceStableKey      | `DUPLICATE_SOURCE_STABLE_KEY`         |
| Revision mismatch              | `APPLICATION_STATE_CONFLICT`          |

## Unknown Persistence Failure

Unknown database errors become:

```text
PERSISTENCE_OPERATION_FAILED
```

with the original cause preserved internally.

---

# Repository Method Naming

Use domain and application language.

Preferred:

```text
findEnabledByPlaybookId
findLatestCompletedBySourceId
listByPlaybookVersionId
allocateNextVersionSequence
```

Avoid:

```text
getRows
selectByForeignKey
queryAll
upsertEntity
deleteRecord
```

Method names should express intent, not SQL mechanics.

---

# Batch Persistence

Knowledge normalization may produce many items and relationships.

Repository contracts must support bounded batch persistence.

## Requirements

* Configurable batch size in Infrastructure.
* Transactional finalization.
* No partial set considered complete.
* Duplicate detection.
* Stable item ordering where needed.
* Failure preserves attempt history.
* Retrying must not create duplicate final records.

## Large Payload Rule

Repository methods should not require loading unbounded content into one Aggregate.

Knowledge records are version-owned but may be persisted and queried independently.

---

# Read Consistency

## State-Changing Use Cases

Must load authoritative Aggregate state.

They must not rely only on eventually consistent read models.

Examples:

* Publish version.
* Activate version.
* Enable source.
* Rename Playbook.
* Complete SynchronizationRun.

## Query Use Cases

May use optimized read models.

Version 1 may initially query normalized tables directly if this does not leak Infrastructure types.

Separate projections are not required until justified.

---

# Workspace Isolation

## Repository Contract Rule

WorkspaceId appears explicitly in all tenant-owned repository and query methods.

## Persistence Rule

Infrastructure must apply Workspace filters to every tenant-owned query.

## Cross-Workspace References

When persisting relationships, Infrastructure must verify or constrain that referenced records belong to the same Workspace.

Examples:

* PlaybookSource → Playbook.
* SynchronizationRun → PlaybookSource.
* Snapshot → SynchronizationRun.
* PlaybookVersion → Playbook.
* KnowledgeItem → PlaybookVersion.
* ValidationFinding → PlaybookVersion.

## Information Disclosure Rule

A lookup with:

* Correct resource ID.
* Wrong WorkspaceId.

must behave as not found.

It must not return a specific cross-Workspace error to untrusted delivery layers.

---

# Archive Semantics

Repositories preserve Archived records.

Default list queries may exclude Archived records only when the query contract says so.

Identifier-based historical lookup should be able to retrieve Archived records when the use case permits it.

Archival is domain state, not a persistence delete flag added independently.

---

# Repository Contract Placement

Recommended Application structure:

```text
packages/application/src/
├── workspace/
│   └── ports/
│       └── workspace-repository.ts
├── playbooks/
│   └── ports/
│       └── playbook-repository.ts
├── sources/
│   └── ports/
│       └── playbook-source-repository.ts
├── synchronization/
│   └── ports/
│       └── synchronization-run-repository.ts
├── snapshots/
│   └── ports/
│       └── synchronization-snapshot-repository.ts
├── versions/
│   └── ports/
│       ├── playbook-version-repository.ts
│       └── version-sequence-allocator.ts
├── knowledge/
│   └── ports/
│       ├── knowledge-item-repository.ts
│       ├── knowledge-relationship-repository.ts
│       └── knowledge-queries.ts
├── validation/
│   └── ports/
│       ├── validation-attempt-repository.ts
│       └── validation-finding-repository.ts
└── transactions/
    └── transaction-manager.ts
```

Exact file names may change.

Module ownership must remain clear.

---

# Public Contract Rules

Repository interfaces are public Application contracts.

They must:

* Use Core domain types.
* Use Application-neutral pagination and result types.
* Avoid Infrastructure implementation types.
* Avoid Notion types.
* Avoid CLI output models.
* Use type-only imports where applicable.
* Remain minimal.
* Avoid generic catch-all methods.

Not every repository contract must be exported from the package root.

Module subpath exports may expose only approved ports.

---

# In-Memory Repositories

In-memory implementations may be used for:

* Unit tests.
* Application tests.
* Early domain integration tests.

They belong in:

```text
packages/testing
```

or test-only files inside Application.

## Rules

In-memory repositories must reproduce important contract behavior:

* Workspace filtering.
* Uniqueness conflicts.
* Optimistic concurrency.
* Stable ordering.
* Explicit absence.
* Immutability rules where applicable.

A simplistic array implementation that ignores these behaviors is not a valid contract fake.

---

# Contract Tests

Repository contracts should have reusable contract-test suites.

Each concrete implementation must pass the same behavioral tests.

Candidate contract tests:

* Insert and retrieve.
* Missing record.
* Workspace isolation.
* Duplicate identifier.
* Known uniqueness conflict.
* Optimistic concurrency.
* Stable list ordering.
* Pagination.
* Archive query behavior.
* Active-source constraint.
* Active-sync constraint.
* Version sequence uniqueness.
* Knowledge SourceStableKey uniqueness.
* Terminal-record immutability.

Contract-test utilities belong in Testing.

---

# Initial Implementation Order

Repository contracts should be introduced incrementally.

Recommended order:

1. WorkspaceRepository.
2. PlaybookRepository.
3. PlaybookSourceRepository.
4. SynchronizationRunRepository.
5. SynchronizationSnapshotRepository.
6. VersionSequenceAllocator.
7. PlaybookVersionRepository.
8. NormalizationAttemptRepository.
9. KnowledgeItemRepository.
10. KnowledgeRelationshipRepository.
11. ValidationAttemptRepository.
12. ValidationFindingRepository.
13. Query contracts.
14. TransactionManager.

Do not create all interfaces speculatively in the first code task.

Each contract should accompany the use case or Aggregate that needs it.

---

# Prohibited Repository Practices

Version 1 must not:

* Put repository interfaces in Core.
* Put repository interfaces only in Infrastructure.
* Expose ORM entities.
* Expose raw SQL.
* Use one generic repository for all Aggregates.
* Use automatic upsert by default.
* Omit Workspace scope.
* Infer Workspace from global mutable state.
* Return records from another Workspace.
* Hard-delete historical records.
* Reset terminal lifecycle records.
* Recalculate domain state silently during persistence.
* Accept partial Knowledge sets as completed normalization.
* Load unbounded child collections into Aggregates.
* Use read models to bypass Aggregate validation.
* Translate every database error into a conflict.
* Hide concurrency conflicts through last-write-wins behavior.

---

# Approved Version 1 Direction

Version 1 will use:

* Application-owned repository interfaces.
* Infrastructure-owned implementations.
* Explicit Workspace scoping.
* Aggregate-specific repositories.
* Separate query contracts where useful.
* Explicit insert and update semantics.
* Optimistic concurrency for mutable Aggregates.
* Immutable repositories for finalized records.
* TransactionManager for atomic cross-repository operations.
* Concurrency-safe VersionSequence allocation.
* Persistence-level uniqueness protection.
* Contract tests shared across implementations.
* No hard deletion of authoritative records.
* No ORM or SQL leakage across package boundaries.

---

# Completion Criteria

Repository contracts are ready for implementation when:

* Every version 1 Aggregate has a clear persistence owner.
* Immutable records are distinguished from mutable Aggregates.
* Workspace scope is explicit.
* Known uniqueness constraints have stable outcomes.
* Optimistic concurrency behavior is defined.
* Transaction boundaries can be expressed without vendor types.
* Query contracts do not become authoritative state.
* Knowledge batch persistence preserves normalization integrity.
* Validation Summary and Findings can be persisted atomically.
* In-memory and PostgreSQL implementations can share contract tests.
