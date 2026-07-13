# AI Playbook Engine — Application Contracts

## Purpose

This document defines the common contracts used by the Application layer of AI Playbook Engine version 1.

It establishes:

- Commands and queries.
- Use-case handlers.
- Execution context.
- Application results.
- Idempotency.
- Transaction boundaries.
- Pagination.
- Application DTOs.
- Port invocation.
- Error contracts.
- Delivery-layer interaction.
- Testing requirements.

The Application layer coordinates domain behavior and external capabilities.

It does not contain:

- Delivery-specific formatting.
- Database implementations.
- Notion SDK logic.
- Environment-variable access.
- ORM models.
- Domain invariant mutation outside Aggregate behavior.

This document does not define the complete input and output fields of every use case. Those contracts will be introduced incrementally alongside their implementation.

---

# Application Layer Responsibilities

The Application layer is responsible for:

- Receiving validated operation requests.
- Resolving the current Workspace when required.
- Loading Aggregate Roots.
- Verifying cross-Aggregate ownership.
- Invoking domain behavior.
- Calling external ports.
- Coordinating repositories.
- Defining transaction boundaries.
- Translating known lower-layer errors.
- Returning transport-independent outcomes.
- Preserving correlation and idempotency context.

The Application layer must not:

- Parse CLI arguments.
- Return CLI tables.
- Return HTTP responses.
- Query PostgreSQL directly.
- Use Notion SDK request or response types.
- Read `process.env`.
- Mutate database records directly.
- Bypass Aggregate methods.
- Expose raw external exceptions.
- Decide undocumented domain policies.

---

# Operation Types

Version 1 distinguishes two primary Application operation types:

1. Commands.
2. Queries.

---

# Commands

## Definition

A Command expresses an intention to change authoritative state or initiate a state-changing process.

Examples:

- Initialize Workspace.
- Register Playbook.
- Rename Playbook.
- Register Playbook Source.
- Enable Playbook Source.
- Start Synchronization.
- Create Draft Playbook Version.
- Start normalization.
- Validate Playbook Version.
- Publish Playbook Version.
- Activate Playbook Version.

## Command Characteristics

A Command:

- Uses imperative language.
- Contains all explicit input required by the operation.
- Must be transport-independent.
- Must not contain ORM entities.
- Must not contain Notion SDK objects.
- May include CommandId for idempotency.
- Must not contain secret values unless the use case explicitly requires a restricted secret input.
- Must not include data that should be resolved through a trusted Application context.

## Naming

Command names should follow:

```text
Verb + Domain Concept
```

Examples:

```text
CreatePlaybook
RenamePlaybook
RegisterPlaybookSource
StartSynchronization
PublishPlaybookVersion
ActivatePlaybookVersion
```

Avoid vague names:

```text
ProcessPlaybook
HandleSource
ExecuteAction
UpdateData
```

## Command Data

Command data should use:

- Canonical identifier strings or typed identifiers according to the boundary.
- Validated scalar values.
- Explicit optional values.
- Stable machine-readable enums.
- Application DTOs.

Commands must not accept complete Aggregate Roots from delivery applications.

Incorrect:

```text
RenamePlaybookCommand
- playbook: Playbook
```

Preferred:

```text
RenamePlaybookCommand
- playbookId
- newName
```

---

# Queries

## Definition

A Query requests information without changing authoritative state.

Examples:

- Get current Workspace.
- List Playbooks.
- Get Playbook details.
- List Synchronization Runs.
- Get Playbook Version.
- Search Knowledge.
- List Validation Findings.

## Query Characteristics

A Query:

- Must not mutate Aggregates.
- May use optimized read contracts.
- Must remain Workspace-aware.
- Must define stable ordering where listing data.
- Must use bounded pagination where needed.
- Returns purpose-built read models.
- Must not expose persistence implementation types.

## Naming

Query names should follow clear intent:

```text
GetPlaybook
ListPlaybooks
GetSynchronizationRun
ListPlaybookVersions
SearchKnowledge
```

Avoid:

```text
FetchData
GetAll
QueryThings
LoadInfo
```

## Query Side Effects

Queries must not:

- Publish events.
- Update last-viewed timestamps unless explicitly approved.
- Repair data silently.
- Trigger synchronization.
- Create missing records.
- Persist derived state.

Operational logging and metrics do not count as domain mutation.

---

# Use-Case Handlers

## Purpose

A Handler executes one Command or Query.

Conceptual forms:

```text
CommandHandler<Command, Output>
QueryHandler<Query, Output>
```

The exact TypeScript implementation will be selected during coding.

## Handler Responsibilities

A handler may:

1. Validate Application-level input.
2. Resolve Workspace context.
3. Check idempotency.
4. Load required records.
5. Verify ownership consistency.
6. Invoke domain behavior.
7. Call required ports.
8. Persist changes.
9. Commit a transaction.
10. Return an Application result.

## Handler Restrictions

A handler must not:

- Format terminal output.
- Import concrete PostgreSQL repositories.
- Import the Notion implementation.
- Read environment variables.
- Return raw domain objects when a stable output contract is required.
- Contain SQL.
- Construct physical storage paths.
- Catch every error and convert it into a generic failure.
- Hide partial progress in multi-stage operations.

## One Primary Use Case per Handler

A Handler should represent one clear Application operation.

Avoid handlers that implement several unrelated operations through flags:

```text
ManagePlaybookHandler
- action: create | rename | archive | restore
```

Prefer separate handlers:

```text
CreatePlaybookHandler
RenamePlaybookHandler
ArchivePlaybookHandler
RestorePlaybookHandler
```

---

# Application Execution Context

## Purpose

Application operations require contextual data that should not be repeated as arbitrary business input.

The common execution context may include:

- CorrelationId.
- CommandId where applicable.
- Invocation origin.
- Current timestamp access.
- Current Workspace resolution.
- Future actor identity.
- Debug or diagnostic context when safe.

## Conceptual Structure

```text
ApplicationContext
- correlationId
- invocationOrigin
- currentWorkspace
- clock
```

Command-specific idempotency information may remain in the Command envelope rather than the shared context.

## Rules

- Context is created at the delivery boundary or composition root.
- Context must not be global mutable state.
- Context must be passed explicitly or through a scoped Application mechanism.
- Workspace must not be inferred independently by each repository.
- CorrelationId remains stable throughout one logical operation.
- Context must not contain raw secrets.
- Domain entities must not depend on ApplicationContext.

---

# Invocation Origin

## Purpose

Record how an Application use case was invoked.

Initial candidate values:

- CLI.
- API.
- Worker.
- Automation.
- Test.
- Internal orchestration.

Version 1 primarily uses:

```text
cli
test
internal
```

## Rules

Invocation origin:

- Supports traceability.
- Must not change domain rules.
- Must not grant authorization.
- Must not be treated as user identity.
- May influence delivery or operational behavior only when documented.

Example:

A CLI invocation and future API invocation must enforce the same Playbook publication rules.

---

# Workspace Resolution

## Tenant-Owned Commands

Tenant-owned Commands and Queries must execute within an explicit Workspace.

Two approved patterns are possible:

### Explicit WorkspaceId

The operation input contains WorkspaceId.

Useful for:

- Future API.
- Worker jobs.
- Administrative tools.
- Tests.

### CurrentWorkspaceProvider

The handler resolves the configured Workspace in personal mode.

Useful for:

- Version 1 CLI.

## Approved Version 1 Direction

CLI-facing use cases may resolve the personal Workspace through `CurrentWorkspaceProvider`.

Internal repository calls must still receive the resolved WorkspaceId explicitly.

Conceptual flow:

```text
CLI command
    ↓
Application handler
    ↓
CurrentWorkspaceProvider
    ↓
WorkspaceRepository verification
    ↓
WorkspaceId passed to all repositories
```

## Rules

- A Command must not embed a magic default WorkspaceId.
- CurrentWorkspaceProvider must not replace WorkspaceRepository validation.
- Queries with an identifier from another Workspace behave as not found.
- Workspace ownership must be validated before cross-Aggregate coordination.

---

# Command Envelope

## Purpose

Provide common metadata for state-changing requests.

Conceptual structure:

```text
CommandEnvelope<TCommand>
- command
- commandId
- correlationId
- invocationOrigin
```

## Version 1 Direction

A formal envelope may be introduced when the first idempotent command is implemented.

Until then, handlers may accept:

- Command data.
- Explicit ApplicationContext.

The project should avoid duplicating command metadata across every Command DTO.

## Rules

- CommandId is required only for operations configured as idempotent.
- CorrelationId is always available at the delivery boundary.
- Command metadata is not part of the domain Aggregate state unless historically relevant.
- CommandEnvelope must remain transport-independent.

---

# Query Envelope

Queries normally require less metadata.

Conceptual structure:

```text
QueryEnvelope<TQuery>
- query
- correlationId
- invocationOrigin
```

Workspace resolution remains explicit or contextual.

Queries do not require CommandId.

---

# Application Result

## Purpose

Represent expected success or failure without coupling the caller to exceptions.

Conceptual form:

```text
Result<Success, ApplicationError>
```

## Success

A successful result contains the use-case-specific output.

Examples:

- WorkspaceCreatedOutput.
- PlaybookCreatedOutput.
- SynchronizationAcceptedOutput.
- PlaybookVersionPublishedOutput.
- KnowledgeSearchOutput.

## Failure

A failed result contains one ApplicationError following the approved error model.

## Rules

- Expected failures use Result.
- Unexpected exceptions may propagate to the outer unexpected-error boundary after safe logging.
- Handlers must not return both success data and a failure.
- Empty successful operations should use an explicit outcome such as `NoContent` or a meaningful state result.
- `null` must not represent every failure.

---

# Application Success Categories

Application outputs may describe:

## Completed

The operation completed synchronously.

Examples:

- Playbook renamed.
- Version published.
- Knowledge query returned results.

## Accepted

The operation was registered and processing will continue.

Example future behavior:

- Synchronization queued for a Worker.

Version 1 synchronous CLI synchronization may return Completed instead.

## No Change

The request was valid but authoritative state was already equivalent.

Examples:

- Activating an already active version.
- Enabling an already enabled source, when treated idempotently.
- Repeating an identical idempotent command.

## Partial Progress

A high-level orchestration completed some stages but a later stage failed.

This must be represented explicitly.

Example:

```text
Synchronization completed.
Snapshot created.
Draft version creation failed.
```

The caller must receive identifiers for completed stages where safe.

Partial progress is not full success.

---

# Application Output Contracts

## Purpose-Built Outputs

Handlers should return purpose-built outputs instead of complete Aggregates.

Example:

```text
CreatePlaybookOutput
- playbookId
- workspaceId
- name
- status
- createdAt
```

Avoid returning every internal field automatically.

## Output Rules

Application outputs must:

- Be transport-independent.
- Be serializable or easily mappable.
- Use stable field meanings.
- Exclude persistence revision unless required.
- Exclude raw credentials.
- Exclude ORM types.
- Exclude Notion SDK types.
- Exclude internal stack traces.
- Preserve identifiers and timestamps canonically.

## Domain Objects in Outputs

Small immutable Value Objects may appear in internal Application outputs when all consumers are internal TypeScript packages.

Delivery layers should still map them into delivery DTOs.

For public cross-package contracts, prefer explicit Application read models.

---

# Command Validation

## Delivery Validation

Delivery layers validate:

- Command syntax.
- Required flags.
- JSON shape.
- Basic transport constraints.

Example:

```text
--playbook-id must be provided
```

## Application Validation

Application validates:

- Identifier parsing.
- Required contextual values.
- Cross-field conditions.
- Pagination limits.
- Supported operation options.
- Referenced resource existence.
- Workspace ownership.

## Domain Validation

Core validates:

- Names.
- State transitions.
- Invariants.
- Domain Value Objects.
- Aggregate behavior.

## Rule

Validation must occur at the appropriate layer.

The CLI must not reproduce all Aggregate invariants.

Application must not trust CLI validation as sufficient.

---

# Idempotency Contract

## Purpose

Protect state-changing operations from duplicate invocation.

## Application Port

Application may define an `IdempotencyStore`.

Conceptual operations:

```text
find(workspaceId, operationName, commandId)
reserve(...)
complete(...)
fail(...)
```

The exact model will be defined when implemented.

## Idempotency Key

Conceptual key:

```text
WorkspaceId
OperationName
CommandId
```

## Canonical Input Hash

The record preserves a checksum of canonical Command input.

This detects conflicting reuse of CommandId.

## States

Candidate idempotency record states:

- In Progress.
- Completed.
- Failed.

The exact lifecycle remains deferred until the first implementation requiring it.

## Repeated Equivalent Command

When a completed record exists with equivalent input:

- Return the previous outcome reference.
- Do not recreate the Aggregate.
- Do not repeat external calls unnecessarily.

## Repeated Conflicting Command

When the same key exists with different canonical input:

- Return `IDEMPOTENCY_CONFLICT`.
- Do not execute the new request.

## In-Progress Duplicate

Version 1 may return a conflict indicating that the operation is already in progress.

It must not start concurrent duplicate work.

## Failure Behavior

Not every failed command must remain permanently blocked.

The idempotency policy must define whether a retry uses:

- The same CommandId.
- A new CommandId.
- The same record with an explicit retry state.

This will be decided per use case.

---

# Transactions

## Handler Transaction Ownership

The handler determines whether its state changes require a transaction.

Examples:

### Single Aggregate

Rename Playbook:

1. Load Playbook.
2. Rename.
3. Update with expected revision.

One repository update transaction may be sufficient.

### Multiple Records

Validation completion:

1. Insert Validation Findings.
2. Complete ValidationAttempt.
3. Update PlaybookVersion ValidationSummary.
4. Transition version to Validated or Invalid.

These operations require one database transaction.

## Transaction Rules

- External Notion requests do not run inside database transactions.
- File writes do not remain inside long database transactions.
- Domain logic runs before persistence where possible.
- Transaction callback must not expose a vendor-specific client to the handler.
- Known concurrency conflicts must be translated.
- Transaction retries must be bounded and safe.

---

# External Port Invocation

## Application Ports

Application defines ports for required external capabilities.

Version 1 candidates:

- CurrentWorkspaceProvider.
- PlaybookSourceGateway.
- SnapshotStorage.
- Clock.
- RandomIdGenerator.
- DeterministicIdGenerator.
- VersionSequenceAllocator.
- TransactionManager.
- Repositories.
- ChecksumService.
- SecretResolver.
- Logger abstraction only when Application-level logging requires one.

## Port Rules

Ports must:

- Use Application or Core types.
- Avoid vendor objects.
- Have bounded responsibilities.
- Return normalized outcomes.
- Define expected failures.
- Support test doubles.
- Avoid mixing several external systems into one interface.

## Port Example

Preferred:

```text
PlaybookSourceGateway
- verifyConnection
- retrieveSnapshot
```

Avoid:

```text
ExternalServices
- notion
- database
- storage
- logger
- clock
```

---

# Orchestration Contracts

## High-Level Ingestion

A convenience use case may coordinate:

1. Synchronization.
2. Snapshot creation.
3. Draft version creation.
4. Normalization.
5. Validation.
6. Publication.
7. Optional activation.

## Rule

The orchestrator must invoke the same lower-level Application services used by individual commands.

It must not duplicate their business logic.

## Stage Result

Each stage should produce an explicit result.

Conceptual structure:

```text
IngestionStageResult
- stage
- status
- resourceId
- startedAt
- completedAt
- error
```

## Failure Behavior

When a later stage fails:

- Prior completed stages remain authoritative.
- Their identifiers are returned.
- The orchestration does not roll back external completed work across independent transaction boundaries.
- The caller receives the failed stage.
- Automatic cleanup must not erase traceability.

---

# Commands for Version 1

The following are initial candidates.

They are not all implemented in the first coding task.

## Workspace

```text
InitializePersonalWorkspace
GetCurrentWorkspace
ArchiveWorkspace
RestoreWorkspace
```

## Playbooks

```text
CreatePlaybook
RenamePlaybook
ArchivePlaybook
RestorePlaybook
ActivatePlaybookVersion
ClearActivePlaybookVersion
```

## Sources

```text
RegisterPlaybookSource
UpdatePlaybookSource
EnablePlaybookSource
DisablePlaybookSource
VerifyPlaybookSource
```

## Synchronization

```text
StartSynchronization
RetrySynchronization
RecoverStaleSynchronizationRun
```

## Versions

```text
CreateDraftPlaybookVersion
StartNormalization
ValidatePlaybookVersion
PublishPlaybookVersion
ArchivePlaybookVersion
```

## Queries

```text
ListPlaybooks
GetPlaybook
ListPlaybookSources
GetPlaybookSource
ListSynchronizationRuns
GetSynchronizationRun
GetSynchronizationSnapshot
ListPlaybookVersions
GetPlaybookVersion
ListValidationFindings
ListKnowledgeItems
GetKnowledgeItem
SearchKnowledge
ListKnowledgeRelationships
```

---

# Handler Dependencies

## Constructor Injection

Handlers receive only dependencies they need.

Example conceptual handler:

```text
CreatePlaybookHandler
- CurrentWorkspaceProvider
- WorkspaceRepository
- PlaybookRepository
- RandomIdGenerator
- Clock
```

Avoid passing:

```text
ApplicationServices
Database
GlobalContainer
CompleteRuntimeConfig
```

## Rules

- Dependencies are immutable.
- No service locator.
- No hidden global repository registry.
- Tests can replace every external dependency.
- Handler constructors must not perform external I/O.

---

# Clock Contract

## Purpose

Provide deterministic timestamps.

Conceptual operation:

```text
now()
```

## Rules

- Application obtains current time from Clock.
- Core receives timestamps as explicit values where required.
- Tests use a fake Clock.
- Domain code must not call `Date.now()` directly when time affects behavior.
- Timestamps use UTC instants.

---

# Identifier Generation Contracts

## Random Identifiers

Handlers request new identifiers before Aggregate construction.

The implementation may use concept-specific generation helpers.

## Deterministic Identifiers

Normalization orchestration supplies:

- PlaybookVersionId.
- SourceStableKey.
- Strategy version.

The deterministic generator produces KnowledgeItemId.

## Rule

Delivery applications do not generate domain Aggregate identifiers unless explicitly acting as the approved Application boundary.

---

# Pagination Contracts

## Pagination Input

Conceptual input:

```text
PaginationRequest
- offset
- limit
```

Version 1 may use offset pagination.

## Rules

- Offset must be zero or positive.
- Limit must be positive.
- Limit must not exceed configured maximum.
- Default limit is defined centrally.
- Ordering is defined by each Query.
- Pagination must be deterministic.

## Pagination Output

Conceptual shape:

```text
Page<T>
- items
- offset
- limit
- hasMore
- totalCount optional
```

## Total Count

Total count is optional because it may require extra query cost.

Queries must state whether they provide it.

## Future Compatibility

Cursor pagination may be introduced later without exposing database-specific cursors in current repository contracts.

---

# Filtering and Sorting

## Filters

Filters must be explicit typed contracts.

Avoid generic maps such as:

```text
filters: Record<string, unknown>
```

Examples:

```text
PlaybookListFilter
- status
- namePrefix
- hasActiveVersion
```

## Sorting

Each query defines approved sort options.

Unknown sort fields are rejected.

Default sorting must be deterministic.

## Search Text

Search input must:

- Be trimmed.
- Have bounded length.
- Define case sensitivity.
- Avoid direct SQL expression input.
- Avoid promising semantic search in version 1.

---

# Application Errors

Handlers return the Application errors defined in the error model.

## Error Ownership

A handler may return:

- Validation errors.
- Not-found errors.
- Conflict errors.
- Precondition failures.
- External failures.
- Infrastructure failures.
- Timeout.
- Unexpected outer-boundary failure.

## Domain Error Translation

Handlers may preserve a domain error code when it is appropriate for delivery.

They may translate it when a use-case-level code is clearer.

## Error Context

Handlers should attach safe context:

- Resource identifier.
- Current status.
- Requested operation.
- Retryability.
- Failed stage.

They must not attach:

- Aggregate internals unnecessarily.
- Raw database errors.
- Raw SDK responses.
- Secrets.

---

# Query Read Models

## Purpose

Queries return stable read-focused structures.

Examples:

### PlaybookSummary

```text
playbookId
name
status
activeVersion
sourceStatus
createdAt
updatedAt
```

### SynchronizationRunSummary

```text
synchronizationRunId
playbookSourceId
status
startedAt
completedAt
retrievalCounts
snapshotId
failureSummary
```

### PlaybookVersionSummary

```text
playbookVersionId
versionSequence
status
normalizationStatus
validationSummary
publishedAt
isActive
```

### KnowledgeItemSummary

```text
knowledgeItemId
knowledgeType
title
sourceStableKey
parentId
displayOrder
```

## Rules

Read models:

- Are immutable outputs.
- Do not contain behavior.
- Do not become Core entities.
- May combine data from several records.
- Must remain Workspace-scoped.
- Must avoid secrets.
- Must define stable serialized semantics.

---

# Application Contract Versioning

## Initial Internal Status

Version 1 Application contracts are internal monorepo contracts.

They are not yet a public external API.

## Change Rules

A contract may change before the first stable release when:

- All internal consumers are updated.
- Tests are updated.
- Domain meaning remains correct.
- Documentation is aligned.

After a stable CLI JSON contract or HTTP API is published, compatibility rules will become stricter.

## Stable Fields

Do not expose speculative fields merely because they may be useful later.

Every public output field increases future compatibility obligations.

---

# Serialization Boundary

Application contracts should use values that can be mapped predictably to JSON.

Recommended serialized forms:

- Identifiers: canonical lowercase strings.
- Timestamps: ISO 8601 UTC.
- Enums: stable lowercase machine values.
- Checksums: algorithm plus value when ambiguity exists.
- Optional properties: omitted consistently.
- Large content: referenced or bounded.

Application contracts themselves do not need to be raw JSON objects internally.

Delivery layers perform final serialization.

---

# Logging and Tracing

## Handler Logging

Application handlers may log:

- Operation started.
- Operation completed.
- Operation failed.
- Duration.
- Resource identifiers.
- Outcome.
- Retry classification.

They should not log:

- Full Commands containing secrets.
- Raw Snapshot payload.
- Full Knowledge content.
- Database connection details.
- Raw Notion responses.

## Correlation

Every Handler execution must have a CorrelationId.

Nested orchestration preserves it.

## CommandId

When present, CommandId should be logged as a separate field.

---

# Cancellation

Synchronization cancellation is excluded from version 1.

Application contracts must not introduce:

- CancelSynchronization.
- CancellationToken-based domain behavior.
- Cancelled SynchronizationRun status.

Process-level interruption handling remains an operational concern.

Future Worker cancellation will require new contracts.

---

# Capability-Aware Composition

Each command declares the capabilities it requires.

Conceptual capabilities:

- Configuration only.
- Database.
- Current Workspace.
- Snapshot storage.
- Notion.
- Full ingestion pipeline.

## Examples

### `config validate`

Requires:

- Config.

### `workspace show`

Requires:

- Database.
- Current Workspace configuration.

### `knowledge list`

Requires:

- Database.
- Current Workspace.

### `source verify`

Requires:

- Database.
- Current Workspace.
- Notion credential and gateway.

### `sync start`

Requires:

- Database.
- Current Workspace.
- Snapshot storage.
- Notion.

## Rule

The CLI composition root should not initialize every external dependency for every command.

---

# Package Placement

Recommended structure:

```text
packages/application/src/
├── common/
│   ├── application-context.ts
│   ├── application-result.ts
│   ├── command-handler.ts
│   ├── query-handler.ts
│   ├── pagination.ts
│   └── index.ts
│
├── workspace/
├── playbooks/
├── sources/
├── synchronization/
├── snapshots/
├── versions/
├── knowledge/
├── validation/
├── ports/
├── transactions/
└── index.ts
```

The final structure may keep common contracts closer to their modules when that improves cohesion.

Do not create a large generic framework inside Application before real handlers exist.

---

# Testing Requirements

## Command Handler Tests

Test:

- Successful orchestration.
- Missing Workspace.
- Missing target Aggregate.
- Cross-Workspace mismatch.
- Domain transition failure.
- Known repository conflict.
- Concurrency conflict.
- External port failure.
- Transaction failure.
- Idempotent replay.
- Idempotency conflict.
- Correct persistence calls.
- No persistence after failed domain validation.

## Query Handler Tests

Test:

- Correct Workspace scoping.
- Explicit not found.
- Filtering.
- Stable sorting.
- Pagination.
- Empty results.
- Archived-record behavior.
- Read-model mapping.
- No state mutation.

## Context Tests

Test:

- CorrelationId propagation.
- Current Workspace resolution.
- Missing configured Workspace.
- Archived Workspace.
- Invocation origin preservation.

## Transaction Tests

Test:

- All required writes commit together.
- Failure rolls back database changes.
- External calls are not made inside long transactions where prohibited.
- Known constraints translate correctly.
- Partial file/database workflow is reported correctly.

## Output Tests

Test:

- Outputs exclude secrets.
- Identifiers serialize canonically.
- Timestamps are UTC.
- Stable enums are used.
- Optional properties follow the approved omission rule.

## Architecture Tests

Verify:

- Application does not import Config.
- Application does not import Infrastructure.
- Application does not import Notion SDK.
- Handlers depend on ports.
- Application outputs do not expose ORM or SDK types.

---

# Prohibited Application Practices

Version 1 must not:

- Create a generic CRUD service for all Aggregates.
- Use one universal Command with an action field.
- Use one global dependency container inside handlers.
- Import concrete adapters.
- Accept ORM records as Command input.
- Return ORM records as output.
- Return raw Aggregate state automatically.
- Read environment variables.
- Generate CLI output.
- Use HTTP status codes.
- Catch every exception as `INTERNAL_ERROR`.
- Ignore Workspace scope.
- Perform unbounded list queries.
- Add cancellation to Synchronization.
- Auto-publish after validation.
- Auto-activate after publication.
- Hide partial progress in ingestion.
- Duplicate lower-level use-case logic in orchestration handlers.
- Add speculative handlers for future AI, Audit, Project or Automation modules.

---

# Initial Implementation Sequence

Application contracts and handlers should be introduced incrementally.

Recommended order:

1. Common Result and ApplicationError contracts.
2. ApplicationContext and CorrelationId usage.
3. CurrentWorkspaceProvider.
4. InitializePersonalWorkspace.
5. GetCurrentWorkspace.
6. CreatePlaybook.
7. ListPlaybooks.
8. GetPlaybook.
9. RenamePlaybook.
10. Archive and Restore Playbook.
11. Playbook Source use cases.
12. Synchronization use cases.
13. Snapshot coordination.
14. Version creation and sequence allocation.
15. Normalization.
16. Validation.
17. Publication.
18. Activation.
19. Knowledge queries.
20. High-level ingestion orchestration.

Do not implement the full catalog in one task.

---

# Approved Version 1 Direction

Version 1 will use:

- Explicit Commands and Queries.
- One focused Handler per use case.
- ApplicationContext with CorrelationId and invocation origin.
- Centralized personal Workspace resolution.
- Result-based expected Application outcomes.
- Purpose-built output contracts.
- Application-owned ports.
- Constructor injection.
- Explicit transaction coordination.
- Bounded pagination.
- Stable query read models.
- Idempotency for selected state-changing operations.
- Explicit partial-progress reporting.
- Capability-aware CLI composition.
- No transport, ORM or Notion SDK leakage.

---

# Completion Criteria

Application contracts are ready for implementation when:

- Commands and Queries have distinct responsibilities.
- Handler orchestration boundaries are clear.
- Workspace and correlation context are explicit.
- Expected outcomes can be represented without raw exceptions.
- Application DTOs remain transport-independent.
- Idempotency can be added without redesigning Commands.
- Transaction requirements can be expressed through ports.
- Queries support deterministic pagination.
- External adapters remain behind Application contracts.
- CLI and future transports can invoke the same handlers.
