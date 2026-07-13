# AI Playbook Engine — Domain Implementation Patterns

## Purpose

This document defines the approved TypeScript implementation patterns for the version 1 domain model of AI Playbook Engine.

It establishes:

* How typed identifiers are represented.
* How Value Objects are created.
* How Aggregate Roots encapsulate state.
* How entities are restored from persistence.
* How lifecycle transitions return Results.
* How domain events are collected.
* How immutable historical records are represented.
* How persistence mappings interact with Core.
* How tests construct and inspect domain objects.

This document translates the approved domain and technical design into coding conventions.

It does not define:

* Database tables.
* Repository implementations.
* Application handlers.
* Notion mappings.
* CLI commands.
* ORM selection.
* Dependency-injection framework.
* Final file names for every type.

---

# Implementation Principles

## Valid State by Construction

Public domain APIs must make invalid state difficult or impossible to create.

Domain objects must not expose constructors or setters that allow callers to bypass:

* Required values.
* Lifecycle rules.
* Ownership.
* Timestamp ordering.
* Immutability.
* Type-specific attributes.

## Explicit Creation and Restoration

Creating a new domain object and restoring an existing persisted object are different operations.

Creation:

* Applies creation rules.
* Generates initial events when required.
* Sets initial lifecycle state.
* Validates user or Application input.

Restoration:

* Reconstructs authoritative historical state.
* Does not create new domain events.
* Does not silently repair invalid records.
* Validates persistence shape and internal consistency.

These paths must not be conflated.

## Core Remains Framework-Free

Core must not depend on:

* ORM decorators.
* Dependency-injection decorators.
* Serialization decorators.
* Validation frameworks tied to transport.
* Notion SDK.
* Database libraries.
* Logging frameworks.
* Environment configuration.

## Expected Failures Use Result

Public domain creation and transition operations use the approved Result pattern for expected rejection.

Unexpected impossible-state failures may throw an internal exception.

---

# File Organization

Domain code should be organized by capability.

Example:

```text
packages/core/src/playbook/
├── playbook.ts
├── playbook-id.ts
├── playbook-name.ts
├── playbook-status.ts
├── playbook-errors.ts
├── playbook-events.ts
├── playbook-state.ts
├── playbook.test.ts
└── index.ts
```

Not every module requires every file.

Avoid generic package-wide folders such as:

```text
entities/
value-objects/
enums/
interfaces/
utils/
```

when they separate closely related concepts.

---

# Typed Identifiers

## Decision

Version 1 should represent domain identifiers as branded immutable strings.

Conceptual pattern:

```typescript
declare const workspaceIdBrand: unique symbol;

export type WorkspaceId = string & {
  readonly [workspaceIdBrand]: true;
};
```

Construction happens through a focused parser or factory.

Conceptual API:

```typescript
parseWorkspaceId(rawValue: string): Result<WorkspaceId, IdentifierError>;
```

Random creation happens through injected generators outside the identifier type.

## Rationale

Branded strings provide:

* Compile-time separation.
* Canonical string serialization.
* Low runtime overhead.
* Simple persistence mapping.
* Straightforward JSON output.
* No class-instance leakage across package boundaries.

## Rules

* Raw string casting outside the owning factory is prohibited.
* Identifier constructors are not exported as unsafe assertions.
* Test helpers may use approved fixture factories.
* Identifiers remain opaque.
* Domain code does not inspect UUID timestamp or ordering.
* Canonical values are lowercase.

## Unsafe Internal Construction

A narrowly scoped internal function may create a branded ID after a trusted generator or deterministic algorithm returns a validated canonical value.

It must remain private or explicitly marked internal.

Do not export:

```typescript
asWorkspaceId(rawValue)
```

as an unrestricted public function.

---

# Domain Value Objects

## Definition

A Value Object represents a domain concept identified by its value rather than an independent identity.

Version 1 examples:

* WorkspaceName.
* PlaybookName.
* SourceStableKey.
* VersionSequence.
* ContentChecksum.
* StorageReference.
* KnowledgeTitle.
* ValidationCode.

## Recommended Representation

Use a small immutable class when the concept requires:

* Validation.
* Normalization.
* Equality.
* Behavior.
* Protected construction.
* Several coordinated fields.

Conceptual example:

```typescript
export class PlaybookName {
  readonly #value: string;
  readonly #normalizedValue: string;

  private constructor(value: string, normalizedValue: string) {
    this.#value = value;
    this.#normalizedValue = normalizedValue;
  }

  static create(rawValue: string): Result<PlaybookName, PlaybookNameError> {
    // validate and normalize
  }

  get value(): string {
    return this.#value;
  }

  get normalizedValue(): string {
    return this.#normalizedValue;
  }

  equals(other: PlaybookName): boolean {
    return this.#normalizedValue === other.#normalizedValue;
  }
}
```

## When a Branded Primitive Is Enough

Use a branded primitive when the concept:

* Has simple validation.
* Has no meaningful behavior.
* Needs easy serialization.
* Does not coordinate several values.

Example:

* A canonical ValidationCode may be a branded string.

## Rules

Value Objects must:

* Be immutable.
* Validate at creation.
* Expose read-only values.
* Provide equality when meaningful.
* Preserve canonical representation.
* Avoid technical dependencies.
* Avoid public mutation.
* Avoid relying on JavaScript object identity for equality.

## Input Normalization

Normalization occurs before validation when safe.

Examples:

* Trim names.
* Normalize UUID casing.
* Normalize approved whitespace.
* Normalize case for uniqueness comparison.

The original display value may be preserved separately from normalized comparison value.

---

# Value Object Restoration

Persistence restoration should use the same invariant-aware factory when possible.

If a Value Object has a historical value that is valid under the recorded schema, restoration uses:

```text
create
```

or an explicitly named:

```text
restore
```

only when creation and restoration rules genuinely differ.

## Rule

Do not add `restore` merely to bypass validation.

A persisted invalid Value Object is a corruption problem.

It should not be silently accepted through an unsafe constructor.

---

# Aggregate Root Representation

## Recommended Shape

Use an encapsulated mutable class with private state.

Conceptual pattern:

```typescript
type PlaybookState = {
  readonly playbookId: PlaybookId;
  readonly workspaceId: WorkspaceId;
  name: PlaybookName;
  description: string | null;
  status: PlaybookStatus;
  activeVersionId: PlaybookVersionId | null;
  createdAt: Instant;
  updatedAt: Instant;
  archivedAt: Instant | null;
};

export class Playbook {
  readonly #state: PlaybookState;
  readonly #domainEvents: DomainEvent[];

  private constructor(state: PlaybookState) {
    this.#state = state;
    this.#domainEvents = [];
  }
}
```

## Why Encapsulated Mutation

Controlled internal mutation:

* Keeps lifecycle code readable.
* Avoids recreating large object graphs.
* Supports Aggregate methods naturally.
* Preserves invariants when fields remain private.
* Works well with repository restoration.

## Rules

* State fields remain private.
* Public access uses read-only getters.
* No generic setters.
* No public state object reference.
* Collections are copied or exposed as read-only snapshots.
* Mutation occurs only through named domain methods.
* Rejected transitions leave state unchanged.

---

# Aggregate Creation

## Static Factory

New Aggregates use an explicit static factory.

Conceptual example:

```typescript
static create(
  input: CreatePlaybookInput,
): Result<Playbook, PlaybookCreationError>;
```

## Creation Input

Creation input contains already typed or validated values where appropriate.

Example:

```text
CreatePlaybookInput
- playbookId
- workspaceId
- name
- description
- createdAt
```

## Factory Responsibilities

The factory:

* Validates creation invariants.
* Assigns initial status.
* Sets timestamps.
* Initializes optional state.
* Creates initial Domain Events when approved.
* Returns Result for expected failure.

## ID and Time Generation

Core factories do not generate random IDs or current time themselves.

Application supplies:

* Identifier.
* Timestamp.
* Required context.

This keeps Core deterministic.

---

# Aggregate Restoration

## Static Restore Method

Persisted Aggregates use:

```typescript
static restore(
  state: RestoredPlaybookState,
): Result<Playbook, RestorationError>;
```

or may throw an internal corruption exception when persistence is expected to be trusted and invalid state is impossible to handle normally.

## Approved Direction

Use Result for recoverable or classifiable persisted-state problems.

Use an unexpected `InvariantViolationError` for impossible internal corruption after infrastructure mapping has already validated primitive fields.

## Restoration Responsibilities

Restoration validates:

* Required fields.
* Identifier types.
* State combinations.
* Timestamp consistency.
* Lifecycle-specific required values.
* Ownership.
* Validation Summary consistency when applicable.

Restoration must not:

* Emit creation events.
* Change timestamps.
* Normalize historical state into a different meaning.
* Auto-correct missing values.
* Apply current creation defaults.
* Increment persistence revision.

## Persistence Revision

Persistence revision is not ordinary domain behavior.

Recommended direction:

* Repository returns Aggregate plus revision metadata, or
* Aggregate holds a read-only concurrency revision separate from domain state.

The exact approach will be fixed during first repository implementation.

Core methods must not increment persistence revision themselves.

---

# Domain State Types

Private state types should be:

* Explicit.
* Module-local where possible.
* Independent from ORM records.
* Independent from delivery DTOs.
* Readable enough for restoration and testing.

Avoid exposing private state types through the package root.

## Snapshot Method

An Aggregate may expose a safe state snapshot for persistence mapping.

Conceptual:

```typescript
toSnapshot(): PlaybookSnapshot
```

## Snapshot Rules

A domain snapshot:

* Contains canonical domain values.
* Is immutable.
* Does not contain behavior.
* Does not contain ORM types.
* Does not contain Domain Events.
* Does not contain secrets.
* Is designed for persistence mapping, not general external delivery.

## Alternative

Infrastructure may map through public getters.

Use a snapshot method when many fields or consistent serialization justify it.

---

# Aggregate Transition Methods

## Naming

Use domain verbs:

```text
rename
archive
restore
activateVersion
clearActiveVersion
start
complete
fail
beginValidation
completeValidation
publish
```

Avoid:

```text
setStatus
updateData
applyChanges
process
```

## Signature

A transition receives all required explicit data.

Example:

```typescript
archive(input: {
  archivedAt: Instant;
}): Result<void, PlaybookTransitionError>;
```

## Timestamp Input

Lifecycle timestamps come from Application through Clock.

Core does not call current time directly.

## State Mutation Order

A transition should:

1. Validate every precondition.
2. Build any required event payload.
3. Mutate state.
4. Record Domain Event.
5. Return success.

Do not mutate partially before validation finishes.

## Rejected Transition

When a transition returns err:

* State is unchanged.
* No Domain Event is added.
* Timestamps are unchanged.
* Collections are unchanged.

Tests must verify this.

---

# Returning Aggregate from Transitions

## Decision

Transition methods on encapsulated mutable Aggregates return:

```text
Result<void, DomainError>
```

rather than returning the same Aggregate.

## Rationale

The caller already owns the Aggregate instance.

Returning it adds no meaningful information.

Outputs specific to a transition may be returned when needed.

Example:

```text
Result<ActivationChange, PlaybookError>
```

where ActivationChange contains the previous active version identifier.

## Rule

Do not return internal mutable state.

---

# Domain Events

## Internal Collection

Aggregates may collect produced Domain Events internally.

Conceptual API:

```typescript
pullDomainEvents(): readonly DomainEvent[];
```

## Pull Semantics

`pullDomainEvents`:

* Returns events in creation order.
* Clears the internal pending collection.
* Does not recreate events on repeated calls.
* Returns an immutable array or copy.
* Is used by Application after successful persistence.

## Alternative Peek

A read-only `domainEvents` getter may support tests, but production flow should avoid dispatching the same events twice.

## Restoration

Restored Aggregates start with no pending events.

Historical transitions are not replayed into pending Domain Events.

## Event Failure

Creating a Domain Event must not fail after state mutation.

Event payload construction should use already validated values.

---

# Event Envelope Boundary

Core Domain Events should contain domain facts.

Application or Infrastructure adds operational envelope fields such as:

* EventId.
* CorrelationId.
* Aggregate revision.
* CausationId.
* Application version.

Core should not require CorrelationId to perform a state transition.

---

# Entity Representation

## Definition

An Entity has identity inside an Aggregate or version-owned boundary.

Version 1 examples:

* KnowledgeItem.
* KnowledgeRelationship.
* ValidationFinding as an immutable version-owned record.

## Representation

Use immutable classes or validated immutable records.

For KnowledgeItem, a class is appropriate because it coordinates:

* Identity.
* Type discriminant.
* Common state.
* Type-specific attributes.
* Source reference.
* Validation.

## Rules

* Identity is explicit.
* Ownership identifiers are immutable.
* No independent lifecycle unless documented.
* No generic setters.
* Finalized entities are immutable.
* Equality by identity where entity equality is needed.

---

# Discriminated Knowledge Attributes

## Decision

KnowledgeItem uses a discriminated union.

Conceptual pattern:

```typescript
type KnowledgeAttributes =
  | {
      readonly type: 'section';
      readonly value: SectionKnowledgeAttributes;
    }
  | {
      readonly type: 'methodology';
      readonly value: MethodologyKnowledgeAttributes;
    }
  | {
      readonly type: 'workflow';
      readonly value: WorkflowKnowledgeAttributes;
    };
```

The discriminant must agree with KnowledgeType.

## Preferred Simplification

Use one discriminant rather than duplicating type fields unnecessarily.

Conceptual:

```typescript
type KnowledgeItemInput =
  | SectionKnowledgeItemInput
  | MethodologyKnowledgeItemInput
  | WorkflowKnowledgeItemInput;
```

## Rules

* Exhaustive handling is mandatory.
* Notion-specific fields are prohibited.
* Unknown types fail normalization or construction.
* Type-specific required fields are validated.
* Common fields remain outside attributes.
* Attributes are deeply immutable.

---

# Immutable Historical Records

## SynchronizationSnapshot

SynchronizationSnapshot is represented as an immutable record or class.

It exposes:

* Read-only fields.
* Validation at creation or restoration.
* No normal update methods.

## ValidationFinding

ValidationFinding is immutable after creation.

It has no methods such as:

* changeSeverity.
* updateMessage.
* moveToVersion.

## NormalizationAttempt

An active attempt may be a small Aggregate or controlled mutable entity while Pending or Running.

After Completed or Failed, it becomes terminal and immutable.

## Rule

A record that should never change must not expose a generic update method merely because the persistence layer supports updates.

---

# Enums and Literal Unions

## Decision

Prefer literal unions or constant objects over TypeScript numeric enums.

Conceptual:

```typescript
export const playbookStatuses = [
  'active',
  'archived',
] as const;

export type PlaybookStatus =
  (typeof playbookStatuses)[number];
```

## Reasons

* Stable serialization.
* No reverse mapping.
* Clear runtime values.
* Better JSON compatibility.
* Easy exhaustive checks.

## Rules

* Machine values use lowercase snake case where multiple words occur.
* Human labels remain outside the domain serialized value.
* Unknown persisted values fail restoration.
* Do not accept arbitrary strings.

---

# Date and Time Representation

## Decision

Core uses an immutable UTC instant representation.

Initial TypeScript direction:

* Native `Date` may be used only through controlled copying and serialization, or
* A branded ISO timestamp string may be used.

## Recommended Direction

Use immutable ISO 8601 UTC strings as a branded `Instant` Value Object.

Benefits:

* Stable serialization.
* No mutable Date instance.
* Easy persistence and testing.
* Explicit UTC requirement.

Conceptual API:

```text
Instant.parse
Instant.fromDate
Instant.toString
Instant.compare
```

## Rules

* Canonical UTC representation.
* Millisecond precision policy is consistent.
* Invalid dates are rejected.
* Lifecycle ordering uses explicit comparison.
* Core does not call current time.

---

# Description and Optional Text

Avoid creating a universal Description Value Object until validation rules are truly shared.

Use concept-specific types when limits differ.

Optional text representation:

```text
string | null
```

Use null for explicit absence in domain state.

Avoid mixing null and undefined for the same stored concept.

At input boundaries:

* undefined may mean omitted.
* Application resolves it into explicit domain state.

---

# Collections

## Internal Collections

Collections must not be exposed as mutable arrays.

Return:

* `readonly` arrays.
* Copies.
* Read-only iterables when justified.

## Aggregate Collections

Avoid unbounded collections inside Aggregate state.

Version 1 examples:

* Playbook does not contain all versions.
* SynchronizationRun does not contain full payload.
* PlaybookVersion does not contain all Knowledge Items or Findings.

## Small Bounded Collections

May live inside Value Objects or entities.

Examples:

* Workflow step definitions inside Workflow attributes when bounded.
* Prompt variables.
* Validation Summary counts are scalar, not finding collection.

---

# Domain Services

Use a Domain Service when behavior:

* Is domain-relevant.
* Does not naturally belong to one Aggregate or Value Object.
* Is deterministic.
* Does not perform technical I/O directly.

Version 1 examples:

* Knowledge identity input policy.
* Relationship cycle validation.
* Playbook deterministic validator.
* Validation Summary construction.
* Canonical source-key policy.

## Domain Service Representation

Prefer stateless functions or small stateless classes.

Avoid injecting repositories into Core Domain Services.

When persistence is required, orchestration belongs to Application.

---

# Policy Objects

A Policy encapsulates a domain decision that may vary within an approved set.

Examples:

* Publication eligibility policy.
* Required knowledge section policy.
* Optional reference resolution policy.

Version 1 should not create policy interfaces for every conditional.

Introduce one only when:

* More than one valid implementation exists.
* Tests require explicit substitution.
* The behavior is domain-significant.
* Configuration is allowed to select among approved policies.

---

# Error Records

Expected domain errors should be immutable plain records.

Conceptual:

```typescript
type PlaybookNameRequiredError = {
  readonly code: 'PLAYBOOK_NAME_REQUIRED';
  readonly message: string;
  readonly details: {
    readonly minimumLength: number;
  };
};
```

## Factory Functions

Create errors through focused factories.

Do not duplicate message and details in every method.

## Class Use

Use an Error subclass only for unexpected exceptions such as:

```text
InvariantViolationError
```

Expected domain errors are not thrown Error subclasses.

---

# Result Usage in Factories

Example conceptual factory:

```typescript
static create(
  input: CreateWorkspaceInput,
): Result<Workspace, WorkspaceCreationError> {
  const nameResult = WorkspaceName.create(input.name);

  if (!nameResult.success) {
    return err(nameResult.error);
  }

  const workspace = new Workspace({
    workspaceId: input.workspaceId,
    name: nameResult.value,
    status: 'active',
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    archivedAt: null,
  });

  workspace.recordEvent(...);

  return ok(workspace);
}
```

## Rule

Do not throw an expected Value Object error from the Aggregate factory.

---

# Restoration Mapping

## Infrastructure Responsibility

Infrastructure maps persistence records into restoration inputs.

Steps:

1. Read database row.
2. Validate primitive database representation.
3. Parse typed identifiers.
4. Parse Value Objects.
5. Build restoration state.
6. Call Aggregate.restore.
7. Translate restoration failure into mapping or integrity error.

## Core Responsibility

Core validates internal domain consistency.

## Prohibited Pattern

Infrastructure must not instantiate Aggregate private state through:

* Reflection.
* Object mutation.
* Type assertions.
* JSON deserialization into class instances.

---

# Serialization

Core classes must not assume that `JSON.stringify` produces the approved representation.

Use explicit mapping:

```text
Aggregate
  ↓
domain snapshot
  ↓
Infrastructure persistence record
```

Delivery output uses:

```text
Application output
  ↓
CLI serializer
```

Do not serialize private class fields automatically.

---

# Cloning and Defensive Copies

For arrays and nested attributes:

* Copy input values during creation.
* Freeze or deeply copy when necessary.
* Return read-only copies.

Do not trust a caller-owned array after construction.

Example risk:

```typescript
const steps = input.steps;
```

Caller mutation could change the entity.

Preferred:

```text
copy validated steps into private immutable state
```

---

# Runtime Immutability

TypeScript `readonly` provides compile-time protection but not complete runtime immutability.

Version 1 direction:

* Use private fields.
* Copy arrays and objects.
* Avoid exporting internal references.
* Use `Object.freeze` selectively for small immutable records when it improves safety.
* Do not recursively freeze large graphs by default without measured need.

---

# Domain Invariant Checks

## Public Path

Expected invalid operations return Result.

## Internal Assertion

Private methods may assert conditions already guaranteed by public validation.

Unexpected violation throws `InvariantViolationError`.

## Rule

Do not use internal assertion as a shortcut for validating user-controlled input.

---

# Validation Summary Construction

ValidationSummary should be created through one factory or domain service.

Input:

* ValidationAttemptId.
* Validator version.
* Findings.
* Validated checksum.
* Completion time.

It calculates:

* Total.
* Error count.
* Warning count.
* Information count.
* Blocking count.
* Publication eligibility.

Callers must not construct inconsistent counts manually.

---

# Lifecycle Status and Required Fields

Restoration and transition code must enforce state-dependent fields.

## SynchronizationRun

### Pending

* No startedAt.
* No completedAt.
* No snapshotId.
* No failure.

### Running

* startedAt exists.
* completedAt absent.
* snapshotId absent.
* failure absent.

### Completed

* startedAt exists.
* completedAt exists.
* snapshotId exists.
* failure absent.

### Failed

* startedAt exists.
* completedAt exists.
* snapshotId absent.
* failure exists.

## PlaybookVersion

### Draft

* No validation completion.
* No publication timestamp.
* Normalization may be Pending, Running, Completed or Failed.

### Validating

* Normalization Completed.
* Validation started.
* No finalized ValidationSummary.

### Validated

* Final ValidationSummary.
* Zero blocking findings.
* No publication timestamp.

### Invalid

* Final ValidationSummary.
* At least one blocking finding.
* No publication timestamp.

### Published

* Previously Validated.
* Publication timestamp exists.
* Zero blocking findings.

### Archived

* Archive timestamp exists.
* Previous finalized lineage remains inferable.

The implementation may preserve a previous-status field or derive validity from timestamps and summaries only if explicitly designed.

Do not lose whether an Archived version was previously Invalid, Validated or Published when that distinction matters historically.

---

# Archived Playbook Version Decision

Because `Archived` collapses several prior states, persistence must preserve historical finalization metadata.

At minimum:

* ValidationSummary remains.
* Publication timestamp remains when previously Published.
* Archive timestamp exists.

Thus:

* Archived with publication timestamp means previously Published.
* Archived with eligible ValidationSummary and no publication timestamp means previously Validated.
* Archived with blocking findings means previously Invalid.

No separate previous-status field is required initially.

---

# Normalization State

Normalization process state must remain separate from PlaybookVersionStatus.

Recommended representation on PlaybookVersion:

* Current normalization status.
* Latest normalization attempt identifier.
* Successful normalization summary when Completed.

Attempt history remains outside the Aggregate in immutable records.

## Transition Responsibility

Application coordinates NormalizationAttempt and PlaybookVersion.

PlaybookVersion may expose bounded methods such as:

* markNormalizationStarted.
* markNormalizationCompleted.
* markNormalizationFailed.

These methods must not contain attempt history collections.

## Alternative

Normalization status may be owned entirely by NormalizationAttempt plus a summary reference on PlaybookVersion.

The first implementation should choose the smallest model that enforces:

* Validation requires successful completion.
* No normalization after validation begins.
* Current state is queryable.

---

# Persistence Revision Pattern

## Decision to Resolve in Implementation

Two patterns remain viable:

### Repository Wrapper

```text
Persisted<TAggregate>
- aggregate
- revision
```

### Aggregate Metadata

Aggregate contains private read-only revision metadata restored by repository.

## Recommendation

Use a repository wrapper or separate loaded-record structure.

Reasons:

* Revision is technical concurrency state.
* Core behavior does not need it.
* Aggregate snapshots remain domain-focused.
* Application passes expected revision to update.

Conceptual:

```typescript
const persisted = await repository.findById(...);

persisted.aggregate.rename(...);

await repository.update(
  persisted.aggregate,
  persisted.revision,
);
```

This is the recommended implementation direction.

---

# Test Construction

## Production Factories First

Tests should create domain objects through public factories.

Use builders to reduce repetition, not to bypass invariants.

## Fixture IDs

Testing package may provide validated fixed identifiers.

Example:

```text
workspaceIdFixture('00000000-...')
```

The helper must call the approved parser or trusted test-only internal utility.

## Restoration Tests

Specific tests may call `restore` to verify:

* Valid persisted state.
* Invalid status combinations.
* Missing timestamps.
* Checksum mismatch.
* Corrupted state rejection.

## Private State

Tests must not inspect private fields through type casts.

Assert through:

* Public getters.
* State snapshot.
* Produced events.
* Results.

---

# Aggregate Getters

Expose only meaningful read access.

Example:

```text
playbook.id
playbook.workspaceId
playbook.name
playbook.status
playbook.activeVersionId
```

Avoid getters for internal caches or technical metadata.

Getter return values must not allow external mutation.

---

# Domain Snapshot Naming

Use names such as:

```text
WorkspaceSnapshot
PlaybookSnapshot
SynchronizationRunSnapshot
PlaybookVersionSnapshot
```

Do not call them:

* DTO.
* ORM entity.
* Database model.
* API response.

These snapshots represent domain state for technical mapping.

They should remain internal or exposed only to approved Infrastructure consumers.

---

# Public Package Exports

Each domain module exports intentionally:

* Aggregate Root.
* Public Value Objects.
* Identifier types and parsers.
* Domain errors.
* Public state enums or literal unions.
* Domain events when implemented.
* Approved snapshot contract when Infrastructure requires it.

Do not export:

* Private state types.
* Internal error factories unnecessarily.
* Unsafe branded-string assertions.
* Internal event collection helpers.
* Test-only factories.

---

# Module Cross-Dependencies

A module may import another module's identifiers or approved public Value Objects.

Avoid importing another Aggregate implementation solely to inspect its state.

Application proves cross-Aggregate conditions and passes the verified fact.

Example:

```text
Playbook.activateVersion(
  playbookVersionId,
  activatedAt
)
```

after Application has verified that the version is Published and belongs to the same Playbook.

Core Playbook does not receive the entire PlaybookVersion Aggregate.

---

# Boolean Parameters

Avoid ambiguous boolean parameters in domain methods.

Incorrect:

```text
source.setEnabled(true)
```

Preferred:

```text
source.enable(...)
source.disable(...)
```

Incorrect:

```text
completeValidation(true)
```

Preferred:

```text
markValidated(...)
markInvalid(...)
```

Use explicit domain verbs and result types.

---

# Primitive Obsession

Do not create a Value Object for every scalar.

Create one when it protects:

* Validation.
* Normalization.
* Equality.
* Unit.
* Identity.
* Domain meaning.

Good candidates:

* PlaybookName.
* VersionSequence.
* SourceStableKey.
* ContentChecksum.

Probably unnecessary initially:

* Retrieval count when a non-negative integer check can live in a summary factory.
* Every optional description.
* Simple boolean indicators without independent meaning.

---

# Constructors and Accessibility

## Aggregate Roots

* Private constructor.
* Public static create.
* Public static restore.

## Value Objects

* Private constructor.
* Public static create or parse.

## Immutable Records

May use:

* Validating factory plus private constructor.
* Frozen plain object returned by a factory when behavior is minimal.

## Domain Errors

Plain immutable records created by factory functions.

---

# Method Purity

Value Object methods and Domain Services should be pure when practical.

Aggregate transitions intentionally mutate controlled state.

Methods must not perform:

* Database access.
* File access.
* Network access.
* Logging.
* Environment reads.
* Random generation.
* Current-time retrieval.

---

# First Core Implementation Scope

The first OpenCode implementation task should include only foundational shared and Core primitives.

Recommended first slice:

## Shared

* Result type.
* `ok`.
* `err`.
* Minimal Result helpers.
* `InvariantViolationError` or generic exhaustive helper only if required.

## Core Common

* Identifier validation primitive.
* WorkspaceId.
* PlaybookId.
* Canonical identifier parsing.
* Instant Value Object or approved time primitive.

## Workspace Domain

* WorkspaceName.
* WorkspaceStatus.
* Workspace Aggregate.
* Workspace domain errors.
* Workspace lifecycle events only when approved for the task.
* Unit tests.

Do not include:

* Playbook.
* Repositories.
* Application handlers.
* PostgreSQL.
* Config.
* Notion.
* CLI.
* Event dispatcher.
* Logging implementation.

---

# OpenCode Implementation Rules

OpenCode must:

* Follow private constructor plus factory patterns.
* Use Result for expected rejection.
* Keep Core framework-free.
* Add focused tests.
* Keep identifiers typed.
* Supply time and IDs explicitly.
* Preserve state after failed transitions.
* Avoid public setters.
* Avoid unsafe casts.
* Avoid speculative generic base classes.
* Avoid a universal Entity or Aggregate base class unless explicitly approved.
* Avoid dependency-injection decorators.
* Avoid adding libraries without permission.
* Export only intentional public symbols.

## Base Classes

Version 1 should not begin with generic classes such as:

```text
Entity<TId>
AggregateRoot<TId>
ValueObject<T>
BaseDomainEvent
```

unless repeated implementation proves their value.

Composition and small focused primitives are preferred.

Generic base classes often hide:

* Equality rules.
* Event behavior.
* State ownership.
* Type complexity.

Introduce them only through a later refactoring decision.

---

# Prohibited Implementation Patterns

Version 1 Core must not:

* Use ORM decorators.
* Use public mutable properties.
* Use public constructors that accept invalid data.
* Generate current time internally.
* Generate random IDs internally.
* Throw expected domain errors.
* Return null for invalid transitions.
* Use one generic string ID type.
* Use numeric TypeScript enums.
* Expose mutable arrays.
* Accept complete external SDK objects.
* Include repository interfaces.
* Include logging.
* Include configuration.
* Include CLI formatting.
* Use inheritance-heavy domain hierarchies.
* Rehydrate by mutating private fields after construction.
* Emit historical events during restoration.
* Silently repair persisted corruption.
* Use `any` in domain state or errors.

---

# Testing Requirements

## Factory Tests

For each factory:

* Valid input returns ok.
* Invalid input returns stable err.
* Normalization is correct.
* Canonical state is exposed.
* Input mutation after creation does not affect state.

## Transition Tests

For each transition:

* Valid state changes.
* Required timestamp recorded.
* Event produced when applicable.
* Invalid state returns err.
* State remains unchanged after err.
* No event produced after err.
* Repeated transitions behave according to policy.

## Restoration Tests

* Valid state restores.
* No events are produced.
* Invalid state combination fails.
* Invalid identifier fails.
* Timestamp inconsistency fails.
* Historical immutable fields remain unchanged.

## Snapshot Tests

* Snapshot reflects current state.
* Snapshot is immutable.
* Modifying returned data does not modify Aggregate.
* No technical fields leak.

## Knowledge Union Tests

When implemented:

* Every type accepts matching attributes.
* Mismatched attributes fail.
* Exhaustive handling.
* Nested arrays are defensively copied.
* Notion fields are absent.

## Compile-Time Tests

Where useful:

* Identifier types cannot mix.
* Private constructors cannot be called.
* State setters do not exist.
* Read-only output cannot be mutated.

---

# Deferred Decisions

The following remain deferred until their first implementation task:

* Exact `Instant` internal representation.
* Exact Result helper set.
* Aggregate revision wrapper type.
* Domain Event collection API.
* Whether Workspace emits Domain Events in the first code slice.
* Exact normalized-content class shape.
* Deep-freezing policy.
* Whether immutable records use classes or frozen objects.
* Subpath exports for Core modules.

These decisions must remain compatible with the patterns in this document.

---

# Approved Version 1 Direction

Version 1 Core will use:

* Branded string identifiers.
* Canonical parsers.
* Small immutable Value Object classes.
* Private constructors.
* Static create and restore methods.
* Encapsulated mutable Aggregate Roots.
* Result-returning expected transitions.
* Explicit IDs and timestamps supplied by Application.
* No generic domain base-class framework initially.
* Literal union state values.
* Defensive copying.
* Domain snapshots for persistence mapping when useful.
* Pending Domain Event collections only when real events are implemented.
* No events during restoration.
* Immutable finalized historical records.
* Framework-free Core.

---

# Completion Criteria

Domain implementation patterns are ready when:

* Identifier representation is selected.
* Value Object construction is consistent.
* Aggregate creation and restoration are distinct.
* Transition behavior is explicit.
* Failed transitions preserve state.
* Persistence can restore without ORM leakage.
* Domain Events can be collected without a global bus.
* Immutable records have no mutation path.
* Knowledge attributes can use exhaustive discriminated unions.
* Tests can construct and inspect objects through public APIs.
* The first OpenCode code task can be scoped without unresolved architectural choices.
