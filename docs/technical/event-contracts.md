# AI Playbook Engine — Internal Event Contracts

## Purpose

This document defines the internal event model for AI Playbook Engine version 1.

It establishes:

* The distinction between Domain Events, Application Events and Integration Events.
* Event ownership.
* Event structure.
* Event naming.
* Event metadata.
* Workspace and correlation context.
* Publication timing.
* Transactional consistency.
* Idempotent event handling.
* Failure and retry behavior.
* Versioning rules.
* Testing requirements.
* Situations where events must not be used.

The objective is to support traceable and decoupled internal workflows without introducing premature event-driven architecture, message brokers or distributed systems.

Version 1 remains a modular monolith.

This document does not define:

* A message broker.
* Kafka, RabbitMQ or cloud queues.
* Distributed event streaming.
* Public webhook contracts.
* Event sourcing.
* Cross-service delivery guarantees.
* Long-running background workers.
* External customer-facing events.

---

# Event Principles

## Events Describe Facts

An event describes something that already happened.

Event names must use past tense.

Examples:

```text
WorkspaceCreated
PlaybookRegistered
SynchronizationRunCompleted
PlaybookVersionValidated
PlaybookVersionPublished
```

Avoid command-like names:

```text
CreateWorkspace
PublishVersion
StartSynchronization
```

Commands request behavior.

Events describe completed facts.

## Events Must Not Replace Direct Behavior

An Aggregate must enforce its own invariants directly.

Incorrect:

```text
PublishPlaybookVersion command
    ↓
emit VersionShouldBePublished
    ↓
unknown handler changes status
```

Preferred:

```text
PublishPlaybookVersion handler
    ↓
PlaybookVersion.publish(...)
    ↓
persist Published state
    ↓
emit PlaybookVersionPublished
```

The event records the completed transition.

It does not perform the transition indirectly.

## Events Are Not the Default Communication Mechanism

Use a direct Application call when:

* The caller requires an immediate result.
* The operation is part of the same use-case transaction.
* Failure must prevent the initiating operation from completing.
* The dependency is explicit and stable.
* Eventual consistency provides no real benefit.

Use an event when:

* The fact may have zero or more independent consumers.
* The initiating operation must not depend on every downstream reaction.
* The reaction may occur after the originating transaction.
* Historical traceability benefits from a stable fact.
* A future asynchronous implementation is plausible.

## Version 1 Must Remain Simple

Version 1 should not create an event for every method call.

Events are justified only for meaningful state changes or cross-module reactions.

---

# Event Categories

Version 1 recognizes three conceptual event categories:

1. Domain Events.
2. Application Events.
3. Integration Events.

Only Domain Events and selected Application Events are expected initially.

Integration Events are reserved for future external boundaries.

---

# Domain Events

## Definition

A Domain Event represents a meaningful fact produced by domain behavior.

It belongs to:

```text
packages/core
```

Examples:

* WorkspaceCreated.
* WorkspaceArchived.
* PlaybookRegistered.
* PlaybookArchived.
* PlaybookVersionActivated.
* SynchronizationRunStarted.
* SynchronizationRunCompleted.
* SynchronizationRunFailed.
* PlaybookVersionValidationStarted.
* PlaybookVersionValidated.
* PlaybookVersionMarkedInvalid.
* PlaybookVersionPublished.
* PlaybookVersionArchived.

## Characteristics

A Domain Event:

* Uses ubiquitous language.
* Refers to one Aggregate transition.
* Contains domain-safe data.
* Does not reference infrastructure.
* Does not reference CLI or HTTP.
* Does not contain Notion SDK types.
* Does not contain database records.
* Does not contain secrets.
* Is immutable.

## Aggregate Ownership

The Aggregate that completes the transition is responsible for creating the Domain Event.

Example:

```text
PlaybookVersion.publish(...)
    ↓
PlaybookVersionPublished
```

The Application layer persists and dispatches the event.

## Domain Event Generation

The Aggregate may expose newly produced events through one approved pattern.

Candidate approaches:

### Internal Event Collection

The Aggregate records events internally and exposes them for collection after persistence.

### Returned Transition Result

The domain operation returns:

```text
updated Aggregate state
produced Domain Events
```

### Explicit Event Factory

The domain behavior returns a specific event alongside the state transition.

The exact TypeScript approach will be selected before implementation.

OpenCode must not mix different event-generation patterns arbitrarily.

---

# Application Events

## Definition

An Application Event represents a completed Application-level operation or orchestration fact that does not belong to one Aggregate alone.

It belongs to:

```text
packages/application
```

Examples:

* SynchronizationSnapshotStored.
* KnowledgeNormalizationCompleted.
* KnowledgeValidationCompleted.
* PlaybookIngestionStageCompleted.
* PlaybookIngestionFailed.
* StaleSynchronizationRecovered.

## When Application Events Are Appropriate

Use an Application Event when:

* The fact spans several repositories or ports.
* No single Aggregate owns the complete meaning.
* A downstream action should react after the Application operation commits.
* The event must reference Application-level output.

## Example

A Synchronization Run Aggregate owns:

```text
SynchronizationRunCompleted
```

The broader Application operation may produce:

```text
SynchronizationSnapshotStored
```

only after:

* Payload was written.
* Snapshot metadata was persisted.
* Synchronization Run was completed.
* Database transaction committed.

## Restrictions

Application Events must not:

* Recreate Domain Events with different names unnecessarily.
* Contain raw external responses.
* Contain repository implementations.
* Become a substitute for clear use-case outputs.
* Be emitted before the operation is authoritative.

---

# Integration Events

## Definition

An Integration Event is a stable event intended to cross an application or deployment boundary.

Examples in future versions:

* PlaybookVersionPublished externally.
* AuditCompleted.
* ExecutionCompleted.
* WorkspaceUsageThresholdReached.

## Version 1 Status

No external Integration Event transport is implemented in version 1.

The system must not add:

* Message broker dependencies.
* Public event schemas.
* Webhook delivery.
* Distributed consumers.
* External retry infrastructure.

## Future Rule

A Domain Event must not automatically become an Integration Event.

A translation step is required.

This allows the external contract to:

* Hide internal details.
* Use independent versioning.
* Preserve compatibility.
* Apply security rules.
* Reduce payload size.

---

# Event Naming

## Domain Event Names

Use PascalCase in TypeScript concepts:

```text
PlaybookRegistered
SynchronizationRunCompleted
PlaybookVersionPublished
```

Use lowercase dot-separated names in serialized or operational representations:

```text
playbook.registered
synchronization.run_completed
playbook_version.published
```

The exact serialized naming style must remain consistent.

## Naming Rules

Event names must:

* Use past tense.
* Express one meaningful fact.
* Avoid transport terminology.
* Avoid implementation class names.
* Avoid ambiguous words such as `Updated` when a more precise transition exists.
* Remain stable after consumers depend on them.

Preferred:

```text
PlaybookVersionActivated
```

Avoid:

```text
PlaybookChanged
PlaybookUpdated
VersionProcessed
```

---

# Common Event Envelope

Every dispatched internal event should use a common conceptual envelope.

```text
EventEnvelope<TPayload>
- eventId
- eventName
- eventVersion
- occurredAt
- workspaceId
- aggregateType
- aggregateId
- aggregateRevision
- correlationId
- causationId
- payload
- metadata
```

Not every field applies to every event, but omission rules must be explicit.

---

# EventId

## Purpose

Uniquely identifies one emitted event occurrence.

## Strategy

Use a random opaque identifier.

Recommended direction:

* UUIDv7 when practical.
* UUIDv4 fallback.

## Rules

* EventId is globally unique.
* It is not Aggregate identity.
* Retrying delivery of the same event preserves EventId.
* Recreating a logically new event uses a new EventId.
* Event consumers use EventId for deduplication when necessary.

---

# EventName

Stable machine-readable event type.

Examples:

```text
workspace.created
playbook.registered
synchronization.run_completed
playbook_version.validated
```

Rules:

* Must not be dynamically generated from class names.
* Must be documented.
* Must remain stable within one event version.
* Consumers must not parse human-readable messages.

---

# EventVersion

## Purpose

Version the event payload contract.

Initial value:

```text
1
```

or:

```text
v1
```

The implementation must select one consistent representation.

## Rules

Increase the event version when:

* Removing a field.
* Renaming a field.
* Changing field meaning.
* Changing identifier representation.
* Changing requiredness incompatibly.

A new version may not be required when:

* Adding an optional field with safe default meaning.
* Changing internal implementation.
* Changing logging text.

## Internal Version 1 Scope

Internal events may evolve before stable release, but the version field should still exist when events are persisted or processed asynchronously.

---

# OccurredAt

Represents when the fact became true.

Rules:

* Uses UTC.
* Comes from the injected Clock.
* Is immutable.
* Must not be replaced with dispatch time.
* Must satisfy relevant Aggregate lifecycle ordering.

Example:

`SynchronizationRunCompleted.occurredAt` is the completion instant, not the time a handler later processed the event.

---

# WorkspaceId

All tenant-owned events must include WorkspaceId.

Rules:

* Must match the Aggregate or Application operation.
* Must not be inferred by the consumer from global state.
* Must be preserved across dispatch and retries.
* Enables future tenant-aware processing.
* Must not be omitted because version 1 has one personal Workspace.

Global system events may omit WorkspaceId only when explicitly classified as global.

---

# Aggregate Metadata

Domain Events should include:

* Aggregate type.
* Aggregate identifier.
* Aggregate revision when available.

Example:

```text
aggregateType: playbook_version
aggregateId: ...
aggregateRevision: 4
```

## Purpose

Supports:

* Traceability.
* Ordering diagnostics.
* Idempotency.
* Consumer validation.
* Future outbox processing.

## Rules

Aggregate revision is persistence coordination metadata.

It does not replace EventVersion.

---

# CorrelationId

Connects events to the originating logical operation.

Example:

```text
CLI playbook ingest
    ↓
SynchronizationRunCompleted
    ↓
PlaybookVersionDraftCreated
    ↓
KnowledgeNormalizationCompleted
```

These may share one CorrelationId.

Rules:

* Preserve the originating CorrelationId.
* Do not generate a new one for each internal event.
* A consumer starting a completely independent later workflow may create a new CorrelationId while retaining causation metadata.

---

# CausationId

## Purpose

Identifies the immediate event or command that caused the current event.

Candidate values:

* CommandId.
* EventId.
* Application operation identifier.

Example:

```text
CommandId: start-sync-123
    causes
EventId: synchronization-started-456

EventId: synchronization-completed-789
    causes
EventId: draft-version-created-999
```

## Version 1 Decision

CausationId is optional until event-driven orchestration is introduced.

CorrelationId is required for operational traceability.

Do not add causation infrastructure speculatively to simple synchronous flows.

---

# Event Payload

## Principles

Payloads must contain the minimum data required to describe the fact and support approved consumers.

They must not contain complete Aggregate snapshots by default.

## Good Payload Example

```text
PlaybookVersionPublishedPayload
- playbookVersionId
- playbookId
- versionSequence
- publishedAt
- publicationOrigin
```

## Excessive Payload Example

```text
PlaybookVersionPublishedPayload
- complete PlaybookVersion Aggregate
- all Knowledge Items
- all Validation Findings
- repository revision internals
```

## Payload Rules

Payloads must:

* Use canonical identifiers.
* Use stable enum values.
* Use UTC timestamps.
* Be immutable.
* Be JSON-compatible when persistence is required.
* Avoid private content.
* Avoid large collections.
* Reference large records by identifier.
* Avoid vendor types.
* Avoid raw Error objects.
* Avoid credentials.

---

# Event Metadata

Optional metadata may contain safe operational information.

Candidate fields:

* Invocation origin.
* CommandId.
* Parser version.
* Normalization schema version.
* Publication origin.
* Retry sequence.
* Application version.

Metadata must not contain:

* Secrets.
* Full configuration.
* Raw source payload.
* Database records.
* Arbitrary unbounded objects.

Business facts belong in the payload, not hidden inside metadata.

---

# Publication Timing

## Rule

Events must be dispatched only after the authoritative state transition succeeds.

For persisted Aggregate transitions:

1. Load Aggregate.
2. Apply domain behavior.
3. Persist Aggregate.
4. Commit transaction.
5. Dispatch committed events.

Dispatching before commit may expose facts that later roll back.

## In-Transaction Recording

Events may be recorded in an outbox within the same transaction.

The external dispatch occurs after commit.

## Version 1 Synchronous Direction

For initial synchronous internal handling:

* Persist state.
* Commit.
* Invoke in-process event handlers.
* Report downstream failure separately.

The completed originating transition must not be rolled back after commit merely because a non-critical event handler failed.

---

# Transactional Outbox

## Purpose

A transactional outbox persists events in the same database transaction as authoritative state.

It solves the failure window between:

```text
database commit
and
event dispatch
```

## Version 1 Decision

Do not implement a full outbox until an asynchronous or required post-commit consumer exists.

Initial events may remain:

* Aggregate-produced internal records consumed by the initiating Application handler.
* Synchronously dispatched after commit for non-critical reactions.
* Logged and tested without durable delivery.

## Trigger for Introducing Outbox

Implement an outbox when at least one of these becomes true:

* Worker processes events asynchronously.
* Delivery must survive process termination.
* More than one module requires reliable post-commit reactions.
* External Integration Events are introduced.
* Event retry and deduplication become operational requirements.

Introducing the outbox will require:

* Persistence design.
* Event status lifecycle.
* Dispatcher.
* Retry policy.
* Cleanup policy.
* Monitoring.

---

# In-Process Event Dispatcher

## Purpose

Deliver internal events to registered handlers inside the same process.

## Ownership

The dispatcher contract belongs in Application or a small approved technical boundary.

The implementation belongs in Infrastructure or the composition root.

## Conceptual Operations

```text
publish(eventEnvelope)
publishAll(eventEnvelopes)
```

## Rules

* Handlers register explicitly.
* Dispatch order must not be assumed unless documented.
* One handler must not mutate the original event.
* Handlers receive immutable event data.
* Handler failures are reported.
* No global hidden event bus.
* Core does not import the dispatcher.

## Sequential Versus Parallel

Version 1 should dispatch handlers sequentially unless measured need justifies parallelism.

Advantages:

* Simpler failure semantics.
* Deterministic tests.
* Easier logging.
* Avoids concurrency surprises.

---

# Event Handlers

## Purpose

React to one event.

Conceptual contract:

```text
EventHandler<TEvent>
- handle(event)
```

## Responsibilities

An event handler may:

* Invoke an Application use case.
* Update a read model.
* Write an operational record.
* Trigger non-critical follow-up behavior.
* Produce another event after completing its own authoritative work.

## Restrictions

An event handler must not:

* Bypass use cases to mutate unrelated Aggregates.
* Import concrete repositories when an Application use case exists.
* Assume exactly-once delivery.
* Modify the incoming event.
* Depend on handler execution order unless explicitly designed.
* Perform unbounded work synchronously.
* Hide failures.

---

# Idempotent Event Handling

## Delivery Assumption

Consumers must assume an event may be delivered more than once.

Even if version 1 dispatch is in-process, future reliable delivery will likely be at-least-once.

## Idempotency Key

Use:

```text
consumerName
eventId
```

or another explicit equivalent.

## Rules

* Reprocessing the same EventId must not duplicate authoritative effects.
* Deduplication records belong to the consumer boundary.
* EventId remains stable during retry.
* Consumers must not derive deduplication only from timestamp.
* Consumers must not use event-name plus AggregateId when several valid events of the same type may occur.

## Naturally Idempotent Handler

A handler may already be idempotent.

Example:

* Rebuild a read model row from authoritative state.

## Explicit Idempotency Store

Required when a duplicate could:

* Create duplicate records.
* Trigger repeated external calls.
* Increment counts.
* Re-run costly processing.
* Produce duplicate downstream events.

---

# Event Failure Semantics

## Critical Reaction

A reaction is critical when the initiating use case must not be considered successful without it.

Critical reactions should normally remain direct calls inside the Application transaction or orchestration.

Do not model critical work as a post-commit event merely for decoupling.

Example:

Completing validation requires:

* Persisting Validation Findings.
* Updating Validation Summary.
* Transitioning version state.

These remain one transaction, not separate event handlers.

## Non-Critical Reaction

A reaction is non-critical when failure does not invalidate the originating fact.

Examples:

* Update a derived read model.
* Emit an operational notification.
* Generate a non-authoritative report.
* Record analytics.

These may use post-commit events.

## Handler Failure

When a synchronous post-commit handler fails:

* The originating state remains committed.
* The failure is logged.
* The event is marked or reported as not fully handled when tracking exists.
* The caller receives partial-progress information only when the downstream reaction is part of the requested orchestration.
* Retrying must be explicit.

## No Silent Failure

The dispatcher must not catch and ignore handler failures.

---

# Retry Behavior

## Version 1

No generic event retry engine is required.

A failed in-process handler may be:

* Returned as an Application orchestration failure.
* Logged and surfaced for manual retry.
* Re-invoked through a specific use case.

## Future Durable Retry

When an outbox and Worker exist, retry policy must define:

* Maximum attempts.
* Backoff.
* Retryable errors.
* Dead-letter behavior.
* Idempotency.
* Event age limits.
* Monitoring.

Do not add a retry counter to every event before a durable dispatcher exists.

---

# Event Ordering

## Aggregate Ordering

Events from one Aggregate should preserve their creation order.

Example:

```text
SynchronizationRunStarted
before
SynchronizationRunCompleted
```

## Cross-Aggregate Ordering

No global ordering guarantee exists.

Consumers must not assume that events from unrelated Aggregates arrive in timestamp order.

## Concurrent Updates

Aggregate revision may help detect:

* Duplicate events.
* Missing prior events.
* Out-of-order delivery.

Version 1 does not implement event-stream reconstruction.

---

# Domain Event Storage

## Version 1 Decision

Domain Events are not the source of truth.

Version 1 is not event-sourced.

The authoritative state is stored in relational records and immutable historical records.

Events may be:

* Collected transiently.
* Logged.
* Dispatched in-process.
* Persisted later through an outbox.

## Prohibited Assumption

The system must not require replaying Domain Events to rebuild Aggregate state in version 1.

---

# Event Sourcing

Event sourcing is explicitly excluded from version 1.

The system will not:

* Store every Aggregate change only as events.
* Rehydrate Aggregates from event streams.
* Use event streams as the primary database.
* Introduce snapshots of event streams.
* Require event replay for normal startup.

Future adoption would require a major ADR and migration strategy.

---

# Initial Domain Event Candidates

Only implement events when a real consumer or traceability requirement exists.

## Workspace

```text
WorkspaceCreated
WorkspaceArchived
WorkspaceRestored
```

## Playbook

```text
PlaybookRegistered
PlaybookRenamed
PlaybookArchived
PlaybookRestored
PlaybookVersionActivated
PlaybookActiveVersionCleared
```

## Playbook Source

```text
PlaybookSourceRegistered
PlaybookSourceEnabled
PlaybookSourceDisabled
PlaybookSourceUpdated
```

## Synchronization

```text
SynchronizationRunCreated
SynchronizationRunStarted
SynchronizationRunCompleted
SynchronizationRunFailed
```

## Playbook Version

```text
PlaybookVersionDraftCreated
PlaybookVersionValidationStarted
PlaybookVersionValidated
PlaybookVersionMarkedInvalid
PlaybookVersionPublished
PlaybookVersionArchived
```

## Rule

The existence of this candidate list does not require implementing every event in the first Core task.

Add an event alongside:

* The behavior that produces it.
* A clear consumer or traceability need.
* Tests.
* Serialization rules when dispatched or persisted.

---

# Initial Application Event Candidates

## Synchronization Snapshot

```text
SynchronizationSnapshotStored
SynchronizationContentUnchanged
```

## Normalization

```text
KnowledgeNormalizationCompleted
KnowledgeNormalizationFailed
```

## Validation

```text
KnowledgeValidationCompleted
```

## Ingestion

```text
PlaybookIngestionStageCompleted
PlaybookIngestionFailed
PlaybookIngestionCompleted
```

These should not duplicate existing Domain Events without adding real Application-level meaning.

---

# Example Event Contracts

## WorkspaceCreated

Conceptual payload:

```text
workspaceId
name
createdAt
```

Envelope includes:

```text
eventId
eventName
eventVersion
workspaceId
aggregateType
aggregateId
aggregateRevision
correlationId
```

## SynchronizationRunCompleted

Conceptual payload:

```text
synchronizationRunId
playbookSourceId
synchronizationSnapshotId
startedAt
completedAt
contentUnchanged
retrievalSummary
```

Do not include the complete Snapshot payload.

## PlaybookVersionValidated

Conceptual payload:

```text
playbookVersionId
playbookId
validationAttemptId
validatedContentChecksum
validationSummary
validatedAt
```

## PlaybookVersionPublished

Conceptual payload:

```text
playbookVersionId
playbookId
versionSequence
publishedAt
publicationOrigin
```

## PlaybookVersionActivated

Conceptual payload:

```text
playbookId
playbookVersionId
previousActivePlaybookVersionId
activatedAt
```

---

# Event Payload Privacy

## Private Content

Events must not contain:

* Complete prompts.
* Full methodology content.
* Raw Notion blocks.
* Snapshot payload.
* Database URLs.
* Tokens.
* Credentials.
* Full Validation Finding collections.
* Full Knowledge Item collections.

## Safe References

Prefer:

* Identifiers.
* Counts.
* Checksums.
* Schema versions.
* Status.
* Safe summaries.

## Titles

Knowledge or Playbook titles may be private.

Include them only when a consumer genuinely requires them.

Identifiers should be preferred for internal events.

---

# Event Serialization

## Requirements

Events that cross package boundaries or are persisted must be serializable.

Use:

* Canonical lowercase identifier strings.
* ISO 8601 UTC timestamps.
* Stable lowercase machine enum values.
* JSON-safe objects.
* Explicit schema version.

## Unsupported Values

Do not serialize:

* Class instances with hidden state.
* `Map`.
* `Set`.
* Functions.
* Symbols.
* Raw Error objects.
* BigInt without explicit conversion.
* Circular structures.
* ORM objects.
* SDK objects.

## Undefined and Null

The project must choose a consistent rule.

Recommended:

* Omit optional undefined fields.
* Use null only when null has explicit domain meaning.

---

# Event Deserialization

When persisted or received, an event must be validated before handling.

Validation includes:

* Event name.
* Event version.
* EventId.
* WorkspaceId.
* Required payload fields.
* Identifier formats.
* Timestamp formats.
* Supported enum values.

Invalid serialized events must not reach handlers as trusted data.

Candidate error:

```text
EVENT_PAYLOAD_INVALID
```

---

# Event Error Codes

Candidate codes:

```text
EVENT_PAYLOAD_INVALID
EVENT_VERSION_UNSUPPORTED
EVENT_HANDLER_FAILED
EVENT_HANDLER_NOT_FOUND
EVENT_DUPLICATE
EVENT_DISPATCH_FAILED
EVENT_IDEMPOTENCY_CONFLICT
EVENT_OUT_OF_ORDER
```

Only introduce codes required by implemented event behavior.

---

# Event Handler Registration

## Explicit Registration

The composition root registers event handlers.

Conceptual example:

```text
dispatcher.register(
  PlaybookVersionPublished,
  updatePlaybookVersionReadModelHandler
)
```

## Prohibited Discovery

Avoid hidden runtime discovery based on:

* Folder scanning.
* Decorators.
* Global mutable registries.
* Class-name reflection.

Explicit registration is easier to review and test.

---

# Module Communication

## Direct Application Calls

Preferred for version 1 critical workflows.

Example:

```text
SynchronizePlaybook
    ↓
SnapshotStorage
    ↓
SnapshotRepository
    ↓
SynchronizationRunRepository
```

## Events

Use for optional follow-up behavior.

Example future flow:

```text
PlaybookVersionPublished
    ↓
Update reporting projection
```

## Rule

One module must not subscribe to another module's internal implementation details.

It subscribes only to approved public event contracts.

---

# Read Model Updates

Read-model projection is a suitable future event consumer.

Rules:

* Read model is derived.
* Projection handler is idempotent.
* Failure does not rewrite authoritative state.
* Projection can be rebuilt from authoritative records if needed.
* Version 1 may query normalized tables directly before projections are justified.

---

# Logging Events

Domain Events and log events are different.

## Domain Event

Represents a business fact:

```text
PlaybookVersionPublished
```

## Log Event Name

Represents an operational record:

```text
version.published
```

The logger may record a Domain Event, but logging it does not count as reliable event dispatch.

Do not use the logger as an event bus.

---

# Event Testing

## Domain Event Tests

Test:

* Correct event produced after valid transition.
* No event produced after rejected transition.
* Event uses correct Aggregate identity.
* WorkspaceId is present.
* OccurredAt uses injected time.
* Payload contains no secret or technical type.
* Events preserve transition order.

## Application Event Tests

Test:

* Event emitted only after successful operation.
* No event emitted after transaction rollback.
* Correct correlation context.
* Correct stage information.
* Partial failures produce the appropriate event or explicit absence.

## Dispatcher Tests

Test:

* Registered handler receives event.
* Multiple handlers execute deterministically.
* Unregistered event behavior.
* Handler failure reporting.
* Event immutability.
* Context propagation.
* Duplicate handling when idempotency is enabled.

## Serialization Tests

Test:

* Round-trip.
* Stable event name.
* Supported version.
* Invalid payload rejection.
* Canonical identifiers.
* UTC timestamp.
* Optional-field behavior.
* No raw class instances.

## Idempotency Tests

Test:

* Same EventId handled twice does not duplicate effects.
* Different EventIds with similar payload are distinct.
* Consumer-specific idempotency scope.
* Failed first attempt may retry safely.
* Conflicting deduplication state is reported.

## Privacy Tests

Verify that events do not contain:

* Notion token.
* Database password.
* Raw Snapshot payload.
* Full Knowledge content.
* Raw SDK objects.
* ORM objects.

---

# Architecture Tests

Architecture checks should eventually verify:

* Core events do not import Application.
* Core events do not import Infrastructure.
* Application events do not import Notion SDK.
* Event payloads do not expose ORM types.
* Event dispatcher is not imported by Core.
* Delivery applications do not become event contract owners.
* Production event code does not import Testing.
* No external broker SDK is added in version 1.

---

# OpenCode Rules

When implementing event-related code, OpenCode must:

* Implement only approved events required by the current task.
* Use past-tense names.
* Keep payloads minimal.
* Include WorkspaceId for tenant-owned events.
* Preserve CorrelationId at dispatch.
* Add tests.
* Avoid adding broker dependencies.
* Avoid implementing an outbox without explicit instruction.
* Avoid implementing event sourcing.
* Avoid global hidden event registries.
* Report any unclear event consumer before inventing one.

OpenCode must not generate the entire candidate event catalog speculatively.

---

# When Not to Use an Event

Do not use an event when:

* A direct call is clearer.
* The caller requires the immediate result.
* The operation must be atomic.
* Failure must roll back the initiating transaction.
* There is exactly one required consumer.
* The event would only hide a circular dependency.
* The payload would need the complete Aggregate.
* No consumer exists.
* The only purpose is logging.
* The agent suggests events as a general best practice without a concrete need.

---

# Version 1 Initial Use

The first implementation may use Domain Events for:

* Workspace creation and lifecycle.
* Playbook lifecycle.
* Synchronization Run lifecycle.
* Playbook Version lifecycle.

However, event dispatch infrastructure should be introduced only when a real Application consumer exists.

Until then, Aggregates may expose produced events for:

* Unit testing.
* Future dispatch.
* Operational mapping.

Do not add an event bus merely because events exist conceptually.

---

# Deferred Decisions

The following remain deferred:

* Exact EventEnvelope TypeScript implementation.
* Domain Event collection pattern.
* In-process dispatcher library or custom implementation.
* Transactional outbox schema.
* Worker-based dispatch.
* Retry scheduler.
* Dead-letter handling.
* Integration Event contracts.
* Public webhooks.
* Event retention.
* Event replay.
* Projection rebuild system.
* Cross-process ordering.
* Event encryption.
* External schema registry.

---

# Approved Version 1 Direction

Version 1 will use:

* Past-tense immutable event concepts.
* Domain Events for meaningful Aggregate transitions.
* Application Events only for genuine cross-Aggregate facts.
* Minimal event payloads.
* Explicit Workspace and correlation context.
* Post-commit dispatch.
* Direct calls for critical atomic workflows.
* No event sourcing.
* No broker.
* No required outbox until durable asynchronous delivery is needed.
* Explicit handler registration.
* Idempotent consumer design.
* Stable event names and versions.
* Strict privacy and serialization rules.
* Incremental implementation only when a consumer exists.

---

# Completion Criteria

Event contracts are ready for implementation when:

* Commands and events remain distinct.
* Domain and Application event ownership is clear.
* Critical work remains direct and transactional.
* Event envelopes preserve identity and traceability.
* Payloads are minimal and safe.
* Dispatch occurs only after authoritative commit.
* Consumers can be idempotent.
* Duplicate and failed handling behavior is understood.
* Version 1 remains free from brokers and event sourcing.
* OpenCode can implement events without inventing asynchronous architecture.
