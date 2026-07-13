# AI Playbook Engine — Result and Exception Pattern

## Purpose

This document defines how AI Playbook Engine version 1 represents:

- Successful operations.
- Expected failures.
- Domain validation failures.
- Application errors.
- Technical adapter failures.
- Unexpected programming errors.
- Exceptions crossing package boundaries.

The objective is to establish one consistent TypeScript error-handling model before domain and Application implementation begins.

This document refines:

- `docs/technical/error-model.md`
- `docs/technical/application-contracts.md`
- `docs/technical/repository-contracts.md`
- `docs/technical/storage-contracts.md`

This document does not define:

- The final implementation of every error code.
- CLI exit codes.
- HTTP status codes.
- Logging-library behavior.
- Stack-trace formatting.
- A third-party functional programming library.

---

# Decision Summary

Version 1 will use a controlled hybrid model.

## Expected Outcomes

Expected success and failure paths use an explicit `Result` type.

Examples:

- Invalid domain input.
- Rejected lifecycle transition.
- Missing Aggregate.
- Name conflict.
- Disabled source.
- Blocking validation findings.
- Notion rate limit.
- Snapshot storage failure.
- Database concurrency conflict.

## Unexpected Failures

Unexpected programming and impossible-state failures use exceptions.

Examples:

- A supposedly exhaustive branch receives an unsupported internal value.
- Dependency wiring is invalid.
- A persistence mapper encounters structurally corrupted data.
- A programmer violates an internal invariant that public constructors prevent.
- A third-party library throws an unknown exception that an adapter cannot classify.

## Boundary Rule

Raw exceptions must not cross public package boundaries as expected outcomes.

Adapters and handlers must translate known technical exceptions into explicit errors.

Unexpected exceptions may propagate to the outer delivery boundary, where they are:

- Logged safely.
- Assigned a CorrelationId.
- Converted into a generic public `INTERNAL_ERROR`.
- Hidden from normal CLI output.

---

# Why This Pattern

A Result-only model for every internal function would create unnecessary ceremony for:

- Pure internal helpers.
- Impossible states.
- Programming defects.
- Exhaustive checks.

An exception-only model would make expected failures:

- Harder to understand from type signatures.
- Easier to forget.
- More difficult to test explicitly.
- More likely to leak framework and vendor exceptions.

The approved hybrid preserves explicit business behavior while allowing unexpected defects to fail loudly.

---

# Core Result Type

## Conceptual Shape

```text
Result<TSuccess, TError>
  = Success<TSuccess>
  | Failure<TError>
```

A successful Result contains only success data.

A failed Result contains only an expected typed error.

## Required Operations

The shared Result primitive should support only a small set of well-justified operations.

Candidate operations:

- Create success.
- Create failure.
- Check success.
- Check failure.
- Access success through narrowing.
- Access failure through narrowing.
- Map successful value.
- Map error value.
- Chain another Result-producing operation.
- Recover or provide fallback only when explicitly requested.

## Avoid Framework Construction

The project must not build a large custom functional-programming framework.

Do not add speculative operations such as:

- Do notation.
- Complex validation applicatives.
- Lazy task monads.
- Generic dependency effects.
- Implicit exception capture.
- Automatic asynchronous retry.

Introduce only behavior required by real use cases.

---

# Conceptual TypeScript Direction

The implementation should prefer a discriminated union.

Conceptual example:

```typescript
export type Result<TValue, TError> =
  | {
      readonly success: true;
      readonly value: TValue;
    }
  | {
      readonly success: false;
      readonly error: TError;
    };
```

Candidate constructors:

```typescript
export function ok<TValue>(value: TValue): Result<TValue, never>;

export function err<TError>(error: TError): Result<never, TError>;
```

The exact names may be:

- `ok` and `err`.
- `success` and `failure`.

One convention must be selected and applied consistently.

## Approved Recommendation

Use:

```text
Result
ok
err
```

Reasons:

- Concise.
- Familiar.
- Clear in handler code.
- Easy to narrow.
- Does not imply exceptions.

---

# Result Ownership

## Shared

`packages/shared` owns the generic Result primitive.

It may contain:

- `Result<TValue, TError>`.
- `ok`.
- `err`.
- Minimal generic mapping helpers.
- Exhaustive assertion utility when genuinely generic.

Shared must not contain:

- Domain error codes.
- Application error categories.
- Notion error mappings.
- Repository conflict codes.

## Core

Core uses Result for expected domain construction and transition failures.

Examples:

```text
PlaybookName.create
WorkspaceName.create
Playbook.rename
SynchronizationRun.start
PlaybookVersion.publish
KnowledgeItem.create
```

## Application

Application uses Result for Handler outcomes.

Conceptual form:

```text
Result<UseCaseOutput, ApplicationError>
```

## Infrastructure and Integrations

Infrastructure and Notion may use internal Results for normalized technical outcomes.

Public port methods must expose only approved Application-facing or adapter-neutral failures.

## CLI

CLI consumes Application Results.

It does not use exceptions to detect expected user-facing failure.

---

# Domain Factories

## Decision

Value Objects and Aggregate creation factories return Result for expected invalid input.

Examples:

```text
PlaybookName.create(rawName)
WorkspaceName.create(rawName)
VersionSequence.create(rawValue)
SourceStableKey.create(rawValue)
ContentChecksum.create(...)
```

Conceptual result:

```text
Result<PlaybookName, PlaybookNameError>
```

## Rationale

Invalid external or reconstructed values are expected possibilities.

Their failure must be visible in the type signature.

## Public Constructors

Public constructors that permit invalid state are prohibited.

Preferred:

```text
PlaybookName.create(rawValue)
```

Avoid:

```text
new PlaybookName(rawValue)
```

when the constructor cannot guarantee validity.

A private constructor may receive already validated values.

---

# Aggregate Creation

Aggregate factories return Result when creation can fail because of domain input.

Conceptual example:

```text
Playbook.create({
  playbookId,
  workspaceId,
  name,
  description,
  createdAt,
})
```

Possible result:

```text
Result<Playbook, PlaybookCreationError>
```

If all supplied parameters are already valid Value Objects and the operation cannot fail, creation may return the Aggregate directly.

## Rule

Do not return Result merely because every function theoretically could fail.

Use Result when a documented expected failure exists.

---

# Aggregate Transitions

## Decision

Domain transitions that can be rejected return Result.

Examples:

```text
workspace.archive(...)
playbook.rename(...)
playbook.activateVersion(...)
source.enable(...)
synchronizationRun.start(...)
synchronizationRun.complete(...)
playbookVersion.beginValidation(...)
playbookVersion.publish(...)
```

Conceptual form:

```text
Result<UpdatedAggregate, DomainError>
```

or:

```text
Result<void, DomainError>
```

depending on the selected Aggregate mutability pattern.

## Aggregate Mutability

The Result pattern does not decide whether Aggregates are:

- Internally mutable through controlled methods.
- Immutable and returned as new instances.

That choice must remain consistent within Core.

## Recommended Direction

Use encapsulated mutable Aggregate instances with:

- Private state.
- Read-only public accessors.
- Controlled methods.
- Result-returning transitions.
- Revision handled outside domain state where appropriate.

This reduces excessive object copying while preserving invariants.

---

# Domain Error Types

Domain Result failures must use explicit typed errors.

Preferred conceptual shape:

```text
DomainError
- code
- message
- safe details
```

Errors may be organized as discriminated unions by module.

Example:

```text
PlaybookTransitionError
  = PlaybookAlreadyArchivedError
  | PlaybookNameInvalidError
  | ActiveVersionInvalidError
```

## Avoid One Class per Trivial Error

The project must balance type safety with maintainability.

A dedicated class is justified when an error has:

- Distinct behavior.
- Specialized structured data.
- Independent handling.
- Meaning beyond a code and message.

Otherwise, a typed immutable error record is sufficient.

## Approved Direction

Use immutable error objects with:

- Stable literal code.
- Safe message.
- Typed details when necessary.

Do not create a deep exception inheritance tree for expected domain errors.

---

# Application Handler Results

Every Command and Query Handler returns:

```text
Promise<Result<TOutput, ApplicationError>>
```

or a synchronous Result when no asynchronous dependency exists.

## Consistency Rule

Application Handler interfaces should normally remain asynchronous.

Conceptual form:

```typescript
interface CommandHandler<TCommand, TOutput> {
  execute(
    command: TCommand,
    context: ApplicationContext,
  ): Promise<Result<TOutput, ApplicationError>>;
}
```

Reasons:

- Most handlers access persistence.
- External ports are asynchronous.
- A common interface simplifies delivery integration.
- Synchronous Core behavior remains internal.

## Naming

Use one primary execution method:

```text
execute
```

Avoid inconsistent combinations:

- `handle`.
- `run`.
- `process`.
- `invoke`.

Event handlers may use `handle` to distinguish them from use-case execution.

---

# Query Results

Queries use the same Result pattern.

Examples:

```text
Result<PlaybookDetails, ApplicationError>
Result<Page<PlaybookSummary>, ApplicationError>
Result<KnowledgeSearchOutput, ApplicationError>
```

An empty list is normally successful.

It is not a not-found failure.

Example:

```text
ListPlaybooks
```

returns:

```text
ok(empty page)
```

A specific identifier lookup may return:

```text
err(PLAYBOOK_NOT_FOUND)
```

---

# Explicit Absence

## Repository Lookups

Repositories represent expected absence using:

```text
T | null
```

or a small Option type.

## Decision

Version 1 will use:

```text
T | null
```

for repository lookup absence.

## Rationale

Introducing both Result and Option immediately would increase conceptual overhead.

Repository absence is simple and expected.

Example:

```typescript
findById(...): Promise<Playbook | null>;
```

The Application Handler translates null into:

```text
PLAYBOOK_NOT_FOUND
```

## Restrictions

Use null only for explicit absence in narrow contracts.

Do not use null for:

- Failed persistence.
- Invalid domain state.
- Concurrency conflict.
- External failure.
- Unknown error.

Those require Result errors or translated exceptions.

Undefined should normally represent an omitted optional field, not repository absence.

---

# Repository Write Outcomes

Repository writes may fail with expected persistence-neutral errors.

Conceptual form:

```text
Promise<Result<WriteOutcome, RepositoryError>>
```

Candidate expected repository errors:

- Conflict.
- Concurrency conflict.
- Record missing during update.
- Known uniqueness violation.

Unexpected driver failures may be:

1. Caught by Infrastructure.
2. Translated into a known Infrastructure or Repository error when possible.
3. Re-thrown as an unexpected Infrastructure exception when unclassifiable.

## Approved Direction

Repository contracts should return Result for failures that the Application is expected to handle.

Examples:

```text
PLAYBOOK_NAME_CONFLICT
APPLICATION_STATE_CONFLICT
ENABLED_PLAYBOOK_SOURCE_CONFLICT
```

Unknown database failures become an explicit generic persistence failure when safe translation is possible.

The raw driver exception remains the internal cause.

---

# External Port Outcomes

External ports return Result for known operational outcomes.

Example:

```text
PlaybookSourceGateway.verifyConnection
```

returns:

```text
Result<ConnectionVerification, PlaybookSourceGatewayError>
```

Known failures:

- Authentication failed.
- Access denied.
- Root not found.
- Rate limited.
- Timeout.
- Invalid response.
- Service unavailable.

Unknown SDK exceptions are caught by the adapter and translated to:

```text
NOTION_UNEXPECTED_ERROR
```

with the raw exception preserved internally as cause.

## Rule

A Notion SDK exception must not reach Application Handler code directly.

---

# Snapshot Storage Outcomes

SnapshotStorage operations return Result.

Examples:

```text
writeSnapshotPayload
readSnapshotPayload
verifySnapshotPayload
```

Known failures:

- Invalid reference.
- Write failed.
- Read failed.
- Missing payload.
- Conflict.
- Checksum mismatch.
- Unsupported schema.
- Payload too large.

The Application coordinates these errors explicitly.

---

# Configuration Outcomes

Configuration loading and validation return Result.

Conceptual form:

```text
Result<ValidatedConfiguration, ConfigurationErrorCollection>
```

## Multiple Validation Errors

Configuration validation may return several independent issues at once.

This is a justified case for an error collection.

Example:

```text
ConfigurationValidationErrors
- missing database URL
- invalid log level
- invalid snapshot size
```

## Rule

Do not fail on the first independent configuration issue when all can be reported safely in one validation pass.

This does not require a general validation-applicative framework.

A focused configuration-validation collection is sufficient.

---

# Validation Findings Are Not Result Errors

Playbook content validation produces persisted Validation Findings.

Conceptual validation execution result:

```text
Result<ValidationResult, ApplicationError>
```

Where `ValidationResult` contains:

- Findings.
- Summary.
- Publication eligibility.

## Important Distinction

A version containing blocking Findings may still represent a successfully completed validation operation.

Example:

```text
validation process completed successfully
version became Invalid
```

Therefore:

```text
ok(ValidationResult with blocking findings)
```

not:

```text
err(WORKFLOW_STEP_REQUIRED)
```

Use Result failure only when the validation operation itself cannot complete.

Examples:

- Knowledge records cannot be loaded.
- Validator configuration is unsupported.
- Database transaction fails.
- Snapshot content is corrupted.

---

# No-Change Results

A valid idempotent operation may produce no state change.

## Decision

No-change outcomes remain successful.

Conceptual output may include:

```text
changed: false
```

or a specific outcome value.

Examples:

- Activating the already active version.
- Replaying an already completed equivalent CommandId.
- Writing the same Snapshot payload again.

Do not represent a valid no-change result as an error.

---

# Partial Progress

Multi-stage orchestration may complete earlier stages before a later failure.

## Decision

Partial progress must be explicit in the Application error or orchestration output.

Conceptual shape:

```text
ApplicationError
- code
- category
- failedStage
- completedStages
- producedResourceIds
```

or a dedicated orchestration result.

## Example

Synchronization and Snapshot succeed, but Draft version creation fails.

The result must expose:

- SynchronizationRunId.
- SynchronizationSnapshotId.
- Failed stage.
- Error.

It must not claim full success.

## Rule

Do not use exceptions to hide partial progress.

---

# Exceptions

## Expected Exceptions from Libraries

Libraries may throw expected technical exceptions.

Adapters must catch them at the technical boundary.

Examples:

- PostgreSQL driver.
- Notion SDK.
- Node file system.
- Configuration parser.
- UUID library.

The adapter classifies and translates them.

## Unexpected Exceptions

Unexpected exceptions may propagate after context is added safely.

Examples:

- Unknown third-party failure.
- Programmer defect.
- Exhaustiveness violation.
- Corrupted object that cannot be restored safely.

The outer delivery boundary catches them.

## Plain Error Objects

Thrown values must extend or be instances of JavaScript `Error`.

Do not throw:

- Strings.
- Numbers.
- Plain object literals.
- Result errors.

Incorrect:

```typescript
throw 'database failed';
```

Correct:

```typescript
throw new Error('Unexpected database adapter failure');
```

Expected database failure should normally be returned as a translated Result error instead.

---

# Internal Invariant Exceptions

## Purpose

Represent impossible states caused by a programming defect or corrupted reconstruction.

Candidate internal exception:

```text
InvariantViolationError
```

Use cases:

- An exhaustive switch receives an unsupported internal discriminant.
- A supposedly finalized Validation Summary has inconsistent counts after trusted reconstruction.
- An Aggregate restoration path receives state that could never be created through public behavior.

## Rules

- This is not an expected domain Result failure.
- It should not be used for normal invalid user input.
- It reaches the unexpected-error boundary.
- It is logged with diagnostics.
- The user receives `INTERNAL_ERROR`.
- It should trigger a regression test and correction.

---

# Exhaustiveness

Discriminated unions must use exhaustive handling.

A generic helper may conceptually provide:

```typescript
function assertNever(value: never): never;
```

Calling it represents an unexpected programming failure.

## Rule

Do not add a default branch that silently ignores a future enum member.

Incorrect:

```typescript
default:
  return undefined;
```

Preferred:

```typescript
default:
  return assertNever(value);
```

---

# Promise Rejections

Asynchronous expected failures should resolve to a failed Result.

They should not reject the Promise.

Conceptual rule:

```text
Expected failure:
Promise resolves to err(...)

Unexpected failure:
Promise rejects with Error
```

This distinction must remain consistent.

## Example

Repository name conflict:

```text
resolve err(PLAYBOOK_NAME_CONFLICT)
```

Unknown database-driver crash:

```text
reject unexpected Error
```

The Infrastructure adapter should translate known driver cases before rejection.

---

# Try-Catch Placement

## Adapter Boundaries

Use try-catch around:

- Notion SDK calls.
- Database driver calls.
- File-system calls.
- Serialization libraries.
- Configuration file loading.

Purpose:

- Recognize known technical failures.
- Redact sensitive data.
- Translate to typed errors.
- Preserve unknown causes.

## Application Handlers

Application Handlers should not wrap their entire body in a broad try-catch merely to return `UNEXPECTED_APPLICATION_ERROR`.

Unexpected failures should normally reach the delivery boundary.

A handler may catch exceptions when:

- Adding context.
- Performing required compensation.
- Translating a clearly owned boundary.
- Ensuring transaction rollback through the transaction abstraction.

## Core

Core should not use broad try-catch.

It has no technical dependencies to normalize.

---

# Error Causes

Translated technical errors may preserve a non-public cause.

Conceptual internal structure:

```text
code
category
message
details
retryable
cause
```

## Rules

- Cause is excluded from normal serialization.
- Cause may be logged after redaction.
- Cause must not affect stable public behavior.
- Cause chains should remain bounded.
- Avoid wrapping the same error repeatedly without adding context.

---

# Result Mapping

## Map Success

Transforms success while preserving the same error.

Conceptual:

```text
Result<A, E> → Result<B, E>
```

## Map Error

Transforms an error while preserving success.

Conceptual:

```text
Result<A, E1> → Result<A, E2>
```

## Chain

Invokes another Result-producing operation after success.

Conceptual:

```text
Result<A, E1>
and A → Result<B, E2>
produce Result<B, E1 | E2>
```

## Rules

- Helpers must preserve type narrowing.
- Helpers must not catch unexpected exceptions automatically.
- Helpers must not hide asynchronous boundaries.
- Deep functional pipelines should not reduce readability.

Simple explicit branching is acceptable and often preferred in orchestration code.

---

# Handler Style

Preferred explicit style:

```typescript
const playbook = await repository.findById(workspaceId, playbookId);

if (playbook === null) {
  return err(playbookNotFound(playbookId));
}

const renameResult = playbook.rename(name, now);

if (!renameResult.success) {
  return err(mapDomainError(renameResult.error));
}

const updateResult = await repository.update(playbook, playbook.revision);

if (!updateResult.success) {
  return err(mapRepositoryError(updateResult.error));
}

return ok(toRenamePlaybookOutput(playbook));
```

Avoid deeply nested abstractions that hide:

- Repository reads.
- Domain transitions.
- Persistence.
- Error translation.

The code should remain understandable to a normal TypeScript developer.

---

# Error Translation

## Domain to Application

Application explicitly maps expected domain errors where needed.

Example:

```text
PLAYBOOK_ALREADY_ARCHIVED
```

may remain the same code when appropriate.

Another domain error may map to:

```text
PLAYBOOK_VERSION_NOT_ELIGIBLE
```

when the use-case contract requires broader meaning.

## Repository to Application

Known repository errors map explicitly.

Example:

```text
Repository:
UNIQUE_NAME_VIOLATION
```

to:

```text
Application:
PLAYBOOK_NAME_CONFLICT
```

Repository contracts should preferably already expose persistence-neutral codes so Application never sees database constraint names.

## Integration to Application

Example:

```text
NOTION_RATE_LIMITED
```

to:

```text
PLAYBOOK_SOURCE_RATE_LIMITED
```

The Application may preserve adapter-specific diagnostic data internally.

---

# Error Union Scope

## Avoid Universal Error Union

Do not define one enormous ApplicationError union containing every future code in every Handler signature.

Each Handler should expose the errors relevant to its contract when practical.

Conceptual:

```text
CreatePlaybookError
  = WorkspaceNotFound
  | WorkspaceNotActive
  | PlaybookNameConflict
  | PersistenceFailure
```

## Public Application Error

A common ApplicationError shape may still provide:

- Code.
- Category.
- Message.
- Details.
- Retryability.

## Approved Direction

Use one common serializable ApplicationError structure with stable codes.

Handlers may narrow their possible codes through type aliases when useful.

This balances:

- Delivery simplicity.
- Type documentation.
- Maintainability.

---

# Error Code Construction

Expected errors should be created through focused factory functions.

Examples:

```text
playbookNotFound(playbookId)
playbookNameConflict(normalizedName)
playbookVersionNotEligible(versionId, currentStatus)
```

Benefits:

- Stable message.
- Stable category.
- Safe details.
- Centralized retryability.
- Less duplicated object construction.

## Placement

Factories live with their owning module.

Avoid one giant global error-factory file.

---

# Result Serialization

The Result wrapper itself should not be exposed automatically in CLI output.

## Application Internal

```text
Result<TOutput, ApplicationError>
```

## CLI Success

```json
{
  "success": true,
  "data": {}
}
```

or another approved delivery contract.

## CLI Failure

```json
{
  "success": false,
  "error": {}
}
```

The CLI owns this serialization.

Application does not return CLI-specific wrappers.

---

# Transaction Behavior

A failed Result inside transactional work must cause rollback when it represents a failure of the atomic operation.

The TransactionManager contract must clearly distinguish:

- Successful callback Result.
- Failed callback Result.
- Unexpected thrown exception.

Conceptual behavior:

```text
callback returns ok
  → commit

callback returns err
  → rollback and return err

callback throws
  → rollback and rethrow
```

## Rule

Transaction implementations must not commit merely because the callback Promise resolved if it resolved to `err`.

---

# Event Handler Results

Internal Event Handlers should conceptually return:

```text
Promise<Result<void, EventHandlingError>>
```

for expected handler failures.

Unexpected defects reject.

## Version 1

Do not create event-specific Result infrastructure until event dispatch is implemented.

The pattern must remain compatible with this document.

---

# Logging Results

## Expected Failure

Log structured fields from ApplicationError.

Do not log the whole Result object automatically.

## Unexpected Exception

Log normalized Error data.

## Successful Result

Log bounded summary fields.

Avoid serializing large Application outputs into logs.

---

# Testing Requirements

## Shared Result Tests

Test:

- `ok` creation.
- `err` creation.
- Narrowing.
- Map success.
- Map error.
- Chain.
- Helpers do not swallow thrown exceptions.
- Immutability.

## Core Tests

Test:

- Invalid Value Object creation returns err.
- Valid creation returns ok.
- Invalid lifecycle transition returns err.
- Aggregate remains unchanged after rejected transition.
- Valid transition returns ok.
- No exception is thrown for expected domain rejection.

## Application Tests

Test:

- Expected repository absence becomes Application err.
- Domain err maps correctly.
- Repository conflict maps correctly.
- External failure maps correctly.
- Success output returned through ok.
- No-change is successful.
- Unexpected dependency exception rejects and reaches outer boundary in integration tests.

## Adapter Tests

Test:

- Known library exception becomes expected typed error.
- Unknown library exception preserves cause and remains unexpected or generic adapter error according to contract.
- Secret values are removed.
- Promise resolves to err for expected failure.
- Promise rejects only for unexpected failure.

## Transaction Tests

Test:

- `ok` commits.
- `err` rolls back.
- Thrown exception rolls back and rethrows.
- Result failure remains unchanged after rollback.
- Unexpected cause is preserved.

## CLI Tests

Test:

- Application err becomes user-facing error.
- Application ok becomes success output.
- Unexpected exception becomes `INTERNAL_ERROR`.
- Stack trace hidden normally.
- CorrelationId preserved.
- JSON output does not expose internal Result implementation.

---

# Compile-Time Tests

Where practical, type tests should verify:

- WorkspaceId cannot be passed as PlaybookId.
- Result success requires handling before accessing error.
- Result failure requires handling before accessing value.
- Handler result exposes ApplicationError.
- Repository null absence is explicit.

Compile-time tests must not require complex tooling unless justified.

TypeScript test files with `@ts-expect-error` may be sufficient.

---

# OpenCode Rules

When implementing this pattern, OpenCode must:

- Create a minimal Result primitive.
- Avoid adding a functional-programming dependency without approval.
- Use Result for expected failures.
- Use exceptions only for unexpected failures.
- Not throw Domain error objects for normal control flow.
- Not catch every exception globally inside Handlers.
- Preserve error causes internally.
- Add tests for success and failure.
- Keep error translation explicit.
- Avoid one universal generic error with no stable code.
- Avoid returning null for technical failures.
- Avoid mixing `undefined`, null, Result and exceptions for the same meaning.

---

# Prohibited Patterns

Version 1 must not:

- Throw strings.
- Throw expected domain errors as normal Application control flow.
- Return raw Error objects in Application Results.
- Use exceptions for repository not-found.
- Return null for persistence failure.
- Catch unknown exceptions and pretend they are validation errors.
- Resolve a Promise with a thrown-error wrapper.
- Swallow exceptions inside Result helpers.
- Build a large custom monadic framework.
- Add a third-party Result library without explicit approval.
- Return success and error simultaneously.
- Treat validation Findings as Handler failures when validation completed normally.
- Expose Result implementation details through CLI JSON.
- Use broad `catch (error) { return err(INTERNAL_ERROR); }` in every Handler.
- Continue transaction commit after a failed Result.
- Use `any` for error details.

---

# Initial Implementation Scope

The first code implementation should introduce only:

- Generic Result type.
- `ok`.
- `err`.
- Minimal safe helpers required by the first domain slice.
- Initial typed identifier parsing Results.
- Initial domain error records.
- Tests.

Do not implement:

- Async Result wrappers.
- Task abstractions.
- Validation accumulation framework.
- Event Result framework.
- Retry combinators.
- Generic exception-to-Result conversion.
- Full Application error catalog.

---

# Deferred Decisions

The following remain deferred:

- Exact immutable Aggregate implementation style.
- Whether some internal pure constructors can return values directly.
- Advanced Result helper set.
- Error localization.
- Batch Result aggregation outside configuration.
- Public API compatibility requirements.
- Event-handler Result implementation.
- Generic cancellation representation.
- Result telemetry instrumentation.

These decisions must preserve the expected-versus-unexpected failure boundary.

---

# Approved Version 1 Direction

Version 1 will use:

- A minimal discriminated-union `Result`.
- `ok` and `err` constructors.
- Results for expected domain, Application and adapter failures.
- `T | null` for repository lookup absence.
- Promises that resolve to Result for expected asynchronous outcomes.
- Exceptions for unexpected programming and unclassifiable internal failures.
- Explicit adapter-level exception translation.
- An outer CLI unexpected-error boundary.
- Typed immutable expected errors.
- Explicit error mapping between layers.
- Transaction rollback on failed Result.
- Successful validation Results even when content becomes Invalid.
- No third-party Result framework initially.

---

# Completion Criteria

The Result pattern is ready for implementation when:

- Expected and unexpected failures are clearly separated.
- Domain factories and transitions have consistent behavior.
- Handler signatures are predictable.
- Repository absence has one representation.
- Adapter exceptions cannot leak directly.
- Transactions understand failed Results.
- Validation Findings remain separate from operational failure.
- CLI can distinguish Application errors from unexpected exceptions.
- The initial Result implementation can remain small.
- OpenCode can implement the pattern without inventing a new error architecture.
