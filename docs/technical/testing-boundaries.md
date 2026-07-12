# AI Playbook Engine — Testing Boundaries

## Purpose

This document defines the testing strategy and boundaries for AI Playbook Engine version 1.

It establishes:

* Which tests belong to each package.
* The difference between unit, integration, contract, architecture and end-to-end tests.
* How fakes, fixtures and test builders should be used.
* Which behaviors require reusable contract tests.
* How external integrations are isolated.
* Which validations must run in CI.
* How generated code from OpenCode is accepted.

The objective is to create a test suite that protects:

* Domain invariants.
* Application orchestration.
* Package boundaries.
* Persistence behavior.
* Snapshot storage integrity.
* Notion integration behavior.
* CLI contracts.
* The complete Notion-to-knowledge vertical slice.

This document does not define:

* The final CI workflow file.
* Coverage percentage thresholds.
* A specific test-database container library.
* Live Notion test credentials.
* Performance-testing infrastructure.
* Production monitoring.

---

# Testing Principles

## Test Behavior, Not Implementation

Tests must verify observable behavior and approved contracts.

Prefer:

```text
A Published Playbook Version cannot return to Draft.
```

Avoid:

```text
The private status property was assigned exactly once.
```

Tests should remain valid through internal refactoring when behavior does not change.

## Every Boundary Has a Test Responsibility

Each package owns tests for the behavior it implements.

Examples:

* Core tests domain invariants.
* Application tests orchestration.
* Infrastructure tests persistence and storage adapters.
* Notion tests external mapping and error translation.
* CLI tests command parsing and rendering.
* Architecture tests package dependency rules.

## Fast Tests First

The suite should have a broad base of fast deterministic tests.

Conceptual pyramid:

```text
            End-to-end
          Integration
     Contract and architecture
             Unit
```

End-to-end tests are valuable but must not replace focused lower-level tests.

## Deterministic Tests

Tests must not depend unintentionally on:

* Current local time.
* Random production identifiers.
* Developer environment variables.
* Network access.
* File ordering.
* Database default ordering.
* Live Notion content.
* Machine-specific absolute paths.

Use controlled clocks, generators, fixtures and temporary resources.

## Failures Must Be Reproducible

A failing test must provide enough context to reproduce the behavior locally.

Tests should use:

* Stable fixture names.
* Explicit input data.
* Clear assertion messages where useful.
* Controlled external responses.
* Canonical timestamps and identifiers.

---

# Test Categories

Version 1 uses these categories:

1. Unit tests.
2. Application tests.
3. Contract tests.
4. Integration tests.
5. Architecture tests.
6. End-to-end tests.
7. Optional live integration tests.

---

# Unit Tests

## Definition

Unit tests exercise one bounded unit without real external infrastructure.

Typical subjects:

* Value Objects.
* Aggregate Roots.
* Domain services.
* Pure mapping functions.
* Canonical serialization.
* Error translation functions.
* Configuration schemas.
* CLI formatting helpers.

## Characteristics

Unit tests should be:

* Fast.
* Deterministic.
* Isolated.
* Easy to understand.
* Free from network and real database access.
* Independent from test execution order.

## Mocking Rule

Mock only real boundaries.

Good candidates:

* Clock.
* Identifier generator.
* Repository port.
* Snapshot storage port.
* Notion source gateway.
* Secret resolver.

Avoid mocking:

* Value Objects.
* Aggregate behavior.
* Simple pure functions.
* Internal private methods.

---

# Core Package Tests

## Location

Preferred colocated structure:

```text
packages/core/src/playbook/playbook.ts
packages/core/src/playbook/playbook.test.ts
```

or a parallel test folder when consistency requires it.

The repository should choose one convention and apply it consistently.

## Required Coverage Areas

### Identifier Types

Test:

* Valid parsing.
* Invalid parsing.
* Equality.
* Canonical serialization.
* Type separation where compile-time tests are practical.

### Value Objects

Test:

* Valid construction.
* Trimming and normalization.
* Boundary lengths.
* Invalid values.
* Immutability.
* Equality where applicable.

### Workspace

Test:

* Creation.
* Rename.
* Archive.
* Restore.
* Repeated invalid transitions.
* Timestamp consistency.

### Playbook

Test:

* Creation.
* Name validation.
* Activation preconditions supplied to Aggregate behavior.
* Clearing active version.
* Archive and restore.
* Restrictions while Archived.

### Playbook Source

Test:

* Registration.
* Enable and disable.
* Immutable ownership.
* Root-reference validation.
* Recording synchronization metadata.
* Repeated state transitions.

### Synchronization Run

Test:

* Pending creation.
* Pending to Running.
* Running to Completed.
* Running to Failed.
* Invalid transitions.
* Terminal-state immutability.
* Snapshot required on completion.
* Failure required on failure.
* Timestamp ordering.
* Retry lineage rules.

### Playbook Version

Test:

* Draft creation.
* Normalization status independence.
* Draft to Validating.
* Validating to Validated.
* Validating to Invalid.
* Validated to Published.
* Validated, Invalid and Published to Archived.
* Rejected direct publication.
* Blocking-finding behavior.
* Checksum consistency.
* Immutability after validation finalization.

### Knowledge

Test:

* KnowledgeType and attributes compatibility.
* Required title.
* SourceStableKey.
* Deterministic identity input.
* Parent ownership.
* Relationship validity.
* Contains-cycle detection.
* Immutability after finalization.

### Validation

Test:

* Finding construction.
* Stable codes.
* Severity and blocking consistency.
* Summary counts.
* Publication eligibility.
* Deterministic validator results.

## Prohibited Core Test Dependencies

Core tests must not require:

* PostgreSQL.
* Notion SDK.
* File system.
* Config package.
* CLI.
* Infrastructure.

---

# Shared Package Tests

Test only genuine generic primitives.

Candidate areas:

* Result behavior.
* Generic branded-string helper.
* Generic safe metadata.
* Generic pagination validation if owned by Shared.

Shared tests must not introduce domain examples as permanent Shared responsibilities.

---

# Application Tests

## Purpose

Verify use-case orchestration using test doubles for ports.

## Location

Inside:

```text
packages/application
```

or supported through reusable fakes from `packages/testing`.

## Required Test Doubles

Candidate fakes:

* InMemoryWorkspaceRepository.
* InMemoryPlaybookRepository.
* InMemoryPlaybookSourceRepository.
* InMemorySynchronizationRunRepository.
* FakeCurrentWorkspaceProvider.
* FakeClock.
* FakeRandomIdGenerator.
* FakeVersionSequenceAllocator.
* FakePlaybookSourceGateway.
* FakeSnapshotStorage.
* FakeTransactionManager.

## Fake Behavior

Fakes must reproduce important contract semantics.

For example, an in-memory PlaybookRepository must enforce:

* Workspace scope.
* Name uniqueness.
* Optimistic concurrency.
* Archived-name behavior.
* Stable ordering.

A fake that merely stores objects in an array without these rules may create false confidence.

## Handler Test Pattern

Each handler should normally include:

### Success case

The intended operation completes and persists expected state.

### Not found

A required resource is missing.

### Workspace isolation

The resource exists in another Workspace but behaves as not found.

### Domain conflict

The Aggregate rejects the requested transition.

### Repository conflict

A known uniqueness or concurrency rule fails.

### External failure

A port returns a normalized failure.

### Persistence behavior

No state is persisted when preconditions fail.

### Context propagation

Correlation and Workspace context are preserved where observable.

## Example: CreatePlaybookHandler

Test:

* Creates valid Playbook.
* Uses current Workspace.
* Rejects missing Workspace.
* Rejects Archived Workspace.
* Rejects normalized name conflict.
* Uses injected ID and Clock.
* Persists exactly one Playbook.
* Returns purpose-built output.
* Does not expose revision or internal record.

## Example: StartSynchronizationHandler

Test:

* Requires Enabled source.
* Rejects active-run conflict.
* Creates Pending run.
* Preserves source configuration snapshot.
* Uses new run identity.
* Returns correct status.
* Does not call Notion before the processing stage when creation and processing are separate.
* Preserves known repository failures.

---

# Contract Tests

## Purpose

Verify that multiple implementations honor the same port behavior.

Contract tests are especially important for:

* Repositories.
* SnapshotStorage.
* Identifier generators.
* External source gateway normalization.
* Secret resolver when multiple implementations exist.

## Ownership

Reusable contract-test suites belong in:

```text
packages/testing
```

Concrete adapter packages invoke those suites.

## Repository Contract Tests

Every concrete repository implementation should pass the relevant shared tests.

Common behaviors:

* Insert.
* Retrieve.
* Explicit absence.
* Workspace isolation.
* Duplicate identity.
* Known uniqueness conflicts.
* Optimistic concurrency.
* Stable ordering.
* Pagination.
* Archive filtering.
* Immutable terminal records.

Module-specific behaviors:

### PlaybookRepository

* Non-Archived normalized-name uniqueness.
* Archived name reuse.
* Restore conflict.

### PlaybookSourceRepository

* At most one Enabled source.
* Historical Disabled sources remain queryable.

### SynchronizationRunRepository

* At most one Pending or Running run per source.
* Terminal states preserved.
* Latest completed ordering.

### PlaybookVersionRepository

* Sequence uniqueness.
* Lifecycle persistence.
* ValidationSummary persistence.

### Knowledge repositories

* SourceStableKey uniqueness.
* Deterministic IDs.
* Immutable finalized records.
* Relationship uniqueness.

## SnapshotStorage Contract Tests

Every implementation must pass:

* Write.
* Read.
* Verify.
* Exists.
* Same identity and same payload.
* Same identity and different payload.
* Checksum mismatch.
* Missing payload.
* Invalid reference.
* Path isolation.
* Immutable committed content.

## Contract Suite Rule

A contract suite must not rely on implementation-specific setup beyond a small factory.

Conceptual form:

```text
runPlaybookRepositoryContract({
  createRepository,
  reset,
});
```

---

# Infrastructure Integration Tests

## Purpose

Test real technical behavior against controlled local infrastructure.

## PostgreSQL Tests

Use an isolated test database.

Test:

* Migrations apply from an empty database.
* Repository mappings.
* Foreign keys.
* Unique constraints.
* Partial or conditional uniqueness.
* Workspace isolation.
* Transactions.
* Optimistic concurrency.
* Batch persistence.
* Stable ordering.
* Known database-error translation.

## Isolation

Each test or test suite must isolate data through one approved strategy:

* Transaction rollback.
* Schema reset.
* Database truncation.
* Dedicated temporary database.

Tests must not depend on previous test data.

## Production Safety

Test tooling must prevent accidental use of a non-test database.

Recommended safeguards:

* Require environment value `test`.
* Validate database-name suffix.
* Refuse known production hosts.
* Require explicit opt-in for external databases.

## Local Snapshot Storage Tests

Use a temporary directory.

Test:

* Directory creation.
* Atomic write.
* File rename behavior.
* Checksum verification.
* Read-after-write.
* Concurrent write conflict.
* Temporary-file cleanup.
* Orphan scan.
* Traversal rejection.
* Symlink or junction escape where practical.

Tests must clean up temporary resources even after failure.

---

# Notion Package Tests

## Unit Tests

Test:

* Identifier canonicalization.
* Page and database mapping.
* Block mapping.
* Pagination-token handling.
* Retry classification.
* Rate-limit interpretation.
* Unsupported block representation.
* Safe error translation.
* SourceStableKey candidate generation.

## Mocked Integration Tests

Use mocked HTTP or an approved transport boundary.

Test:

* Root verification.
* Page retrieval.
* Database retrieval.
* Nested blocks.
* Pagination across multiple responses.
* Rate-limit retry.
* Timeout.
* Authentication failure.
* Access denied.
* Missing root.
* Invalid response.
* Unsupported block.
* Secret redaction.

## Fixture Strategy

Fixtures should represent:

* Minimal valid page.
* Nested child pages.
* Database with records.
* Rich text.
* Lists.
* Code blocks.
* Tables.
* Unsupported content.
* Broken or partial response.
* Internal references.

Fixtures must be:

* Sanitized.
* Stable.
* Small enough to understand.
* Free from real private Playbook content when committed publicly.

## Live Notion Tests

Live tests are optional and disabled by default.

They require:

* Explicit opt-in.
* Dedicated test integration.
* Dedicated test pages.
* No personal production Playbook mutation.
* Read-only behavior.
* Clear cost and rate-limit awareness.

CI must not depend on live Notion availability.

---

# Config Package Tests

Test:

* Source precedence.
* Required values.
* Defaults.
* Numeric and boolean parsing.
* Environment-specific rules.
* Capability-aware validation.
* Secret redaction.
* `.env` isolation.
* Unknown and deprecated keys.
* Cross-field validation.
* Safe configuration diagnostics.

Tests should construct raw input maps directly rather than mutating real process environment wherever possible.

When `process.env` must be tested:

* Save original state.
* Restore it after every test.
* Avoid parallel interference.
* Keep the scope minimal.

---

# CLI Tests

## Unit Tests

Test:

* Argument parsing.
* Output-mode selection.
* Exit-code mapping.
* Human-readable rendering.
* JSON rendering.
* Identifier input errors.
* Error redaction.
* Stack-trace suppression.
* Debug output behavior.

## Command Tests

Invoke commands with fake Application handlers or a controlled composition layer.

Test:

* Correct Command or Query mapping.
* Required arguments.
* Default values.
* JSON output stability.
* Non-interactive behavior.
* Correct exit code.
* CorrelationId creation.

## CLI Integration Tests

Use real Application and selected test adapters.

Examples:

* Workspace initialization with test database.
* Create and list Playbook.
* Register source using fake Notion gateway.
* Run synchronization with fixture payload.
* Create and publish version.
* Query knowledge.

## Process-Level Tests

For critical commands, spawn the built CLI as a process.

Test:

* Standard output.
* Standard error.
* Exit code.
* JSON validity.
* No secret leakage.
* Behavior from a clean environment.

Process-level tests are slower and should be selective.

---

# Architecture Tests

## Purpose

Automatically enforce documented dependency rules.

## Required Rules

Architecture tests must verify:

* Shared imports no internal package.
* Core imports only Shared among internal packages.
* Application imports only Core and Shared.
* Config does not import Core or Application.
* Infrastructure does not import Notion or applications.
* Notion does not import Infrastructure.
* Production packages do not import Testing.
* Core does not import Notion SDK.
* Application does not import ORM, database driver or Notion SDK.
* No deep imports bypass package exports.
* No circular package dependencies.
* Reserved V1 packages remain free from prohibited functionality.

## Possible Enforcement Mechanisms

* ESLint import restrictions.
* Dependency graph inspection.
* Architecture test library.
* Custom script over TypeScript imports.
* `package.json` dependency validation.

The exact tool will be selected later.

## Dual Protection

Use both:

* Static lint restrictions for immediate feedback.
* Architecture tests for graph-level verification.

## Failure Message

Architecture-test failures must identify:

* Consumer package.
* Imported package or library.
* File.
* Violated rule.
* Approved direction.

---

# End-to-End Tests

## Purpose

Validate the complete user-visible vertical slice.

## Successful V1 Scenario

At minimum:

```text
Initialize personal Workspace
    ↓
Create Playbook
    ↓
Register Notion source
    ↓
Verify source using controlled fixture gateway
    ↓
Start synchronization
    ↓
Retrieve fixture content
    ↓
Store immutable Snapshot payload
    ↓
Complete Synchronization Run
    ↓
Create Draft Playbook Version
    ↓
Normalize Knowledge
    ↓
Validate successfully
    ↓
Transition to Validated
    ↓
Publish explicitly
    ↓
Activate explicitly
    ↓
Search Knowledge through CLI
```

Assertions must verify:

* Persisted identities.
* Workspace ownership.
* Lifecycle states.
* Snapshot checksum.
* Version sequence.
* Knowledge count.
* Validation summary.
* Active version.
* CLI output.

## Invalid Content Scenario

At minimum:

```text
Synchronize incomplete fixture
    ↓
Create Draft Version
    ↓
Normalize
    ↓
Validation creates blocking findings
    ↓
Version becomes Invalid
    ↓
Publication fails
```

Assertions:

* Findings persisted.
* ValidationSummary matches findings.
* Version status Invalid.
* No publication timestamp.
* No activation.
* Historical Snapshot remains intact.

## Interrupted or Failed Synchronization Scenario

At minimum:

* Source gateway fails.
* Run becomes Failed.
* No Snapshot metadata exists.
* No final payload exists.
* Retry creates a new Run.
* Previous failure remains queryable.

## End-to-End Environment

Use:

* Test PostgreSQL.
* Temporary snapshot directory.
* Fake or fixture-backed PlaybookSourceGateway.
* Built CLI or direct application entry according to test level.

Do not use live Notion in required CI E2E tests.

---

# Test Builders

## Purpose

Create valid test objects with concise overrides.

Examples:

* WorkspaceBuilder.
* PlaybookBuilder.
* PlaybookSourceBuilder.
* SynchronizationRunBuilder.
* PlaybookVersionBuilder.
* KnowledgeItemBuilder.
* ValidationFindingBuilder.

## Rules

Builders must:

* Create valid defaults.
* Make overridden values explicit.
* Avoid hidden random data.
* Use stable test IDs and timestamps.
* Not bypass public domain construction unless testing deserialization or persistence restoration specifically.
* Not become production factories.

## Invalid Object Testing

To test invalid construction, use public factories or transition commands.

Do not use builders to construct impossible internal state unless testing persistence corruption handling.

---

# Fixtures

## Domain Fixtures

Use small named fixtures for:

* Valid names.
* Canonical IDs.
* Timestamps.
* Checksums.
* Source references.

## Snapshot Fixtures

Maintain representative source-aligned payloads.

Candidate fixture groups:

```text
fixtures/notion/minimal-valid/
fixtures/notion/full-supported-blocks/
fixtures/notion/unsupported-block/
fixtures/notion/invalid-workflow/
fixtures/notion/decision-matrix/
fixtures/notion/audit-definition/
```

## Fixture Versioning

Fixtures must record:

* Snapshot schema version.
* Parser compatibility version.
* Expected checksum.
* Expected Knowledge Items.
* Expected validation findings.

When parser behavior changes intentionally:

* Update fixture expectations explicitly.
* Do not regenerate all expected outputs blindly.
* Review semantic differences.

## Golden Files

Golden or snapshot files may be used for normalized payloads when:

* The output is structured and large.
* Review remains practical.
* Important assertions also verify semantics.

Golden files must not become the only assertion.

---

# Fakes, Stubs and Mocks

## Fake

A working simplified implementation.

Examples:

* In-memory repository.
* Fake clock.
* Fake ID generator.
* Fixture-backed source gateway.

Use when contract behavior matters.

## Stub

Returns predefined values.

Use for simple one-directional dependencies.

## Mock

Verifies interactions.

Use sparingly when call behavior is itself part of the contract.

## Preference

Prefer state and outcome assertions over brittle call-count assertions.

Interaction assertions are appropriate for:

* No persistence after failure.
* External gateway called with normalized input.
* Transaction invoked.
* Secret resolver not called unnecessarily.

---

# Time Testing

All time-sensitive behavior uses a fake Clock.

Test:

* Exact timestamps.
* Ordering.
* Stale-run detection.
* Archive timestamps.
* Validation and publication separation.

Tests must not use arbitrary sleeps.

---

# Identifier Testing

Use fixed deterministic identifiers.

Random generation tests may use the real generator only inside Infrastructure tests.

Application and Core tests should use:

* Sequence-based fake IDs.
* Explicit fixture IDs.
* Deterministic generators.

This keeps expected outputs stable.

---

# Error Testing

Every expected error path should assert:

* Stable code.
* Category where Application-facing.
* Retryability.
* Safe details.
* No secret leakage.

Avoid asserting full human-readable messages unless testing delivery rendering.

Message tests should focus on required safe information.

---

# Security Testing

Version 1 tests must include:

* Notion token redaction.
* Database password redaction.
* Storage path traversal.
* Workspace isolation.
* Cross-Workspace lookup behavior.
* Invalid identifier handling.
* Unsafe absolute StorageReference.
* Raw SDK and database errors not exposed to CLI.
* Snapshot payload not logged by default.

Security tests belong close to the boundary implementing the protection.

---

# Concurrency Testing

Required areas:

* Playbook name uniqueness.
* One Enabled source per Playbook.
* One active Synchronization Run per source.
* VersionSequence allocation.
* Optimistic concurrency updates.
* Same Snapshot identity concurrent write.
* Validation finalization.

Tests should create real concurrent attempts in PostgreSQL integration tests where practical.

In-memory fakes must also reproduce conflict outcomes, but real database tests remain authoritative for constraint behavior.

---

# Test Database Migrations

Integration tests must apply the same migrations used by local and future production environments.

Do not create test-only schema manually when it diverges from real migrations.

Tests should verify:

* Empty database migration.
* Current schema startup.
* Constraint behavior.
* Migration rollback or recovery strategy when supported.

---

# Test Package Responsibilities

## `packages/testing`

May contain:

* Stable fixture IDs.
* FakeClock.
* Fake ID generators.
* In-memory repositories.
* Fixture loaders.
* Contract-test suites.
* Temporary directory helpers.
* Test database lifecycle helpers.
* Sanitized Notion fixtures.

Must not contain:

* Production business logic.
* Runtime dependencies required by production.
* Real credentials.
* Hidden global mutable state.
* Overly broad test frameworks that obscure behavior.

## Production Package Test Utilities

Small package-specific test helpers may remain inside the package's test files.

Move a helper to Testing only when multiple packages genuinely reuse it.

---

# Test File Naming

Recommended convention:

```text
*.test.ts
```

Integration tests may use:

```text
*.integration.test.ts
```

Contract tests:

```text
*.contract.test.ts
```

End-to-end tests:

```text
*.e2e.test.ts
```

Architecture tests:

```text
*.architecture.test.ts
```

The test runner configuration may define projects or patterns for these categories.

---

# Vitest Organization

Version 1 uses Vitest.

Candidate script structure:

```json
{
  "test": "vitest run",
  "test:unit": "vitest run --project unit",
  "test:integration": "vitest run --project integration",
  "test:architecture": "vitest run --project architecture",
  "test:e2e": "vitest run --project e2e",
  "test:watch": "vitest"
}
```

The exact configuration should be introduced only when the corresponding test categories exist.

Do not create complex multi-project configuration prematurely.

---

# Coverage

## Direction

Coverage is a diagnostic tool, not the primary quality target.

The project should prioritize:

* Invariant coverage.
* State-transition coverage.
* Failure-path coverage.
* Contract coverage.
* Critical vertical-slice coverage.

## Deferred Threshold

A global percentage threshold is deferred until meaningful production code exists.

When introduced, thresholds should not encourage trivial tests or exclude difficult integration code without review.

## Critical Untested Code

Regardless of percentage, the following must not remain untested:

* Aggregate transitions.
* Workspace isolation.
* Repository uniqueness.
* Snapshot checksum and atomic write.
* Notion error translation.
* Publication eligibility.
* Secret redaction.

---

# CI Validation Stages

The initial CI pipeline should eventually run:

1. Dependency installation with lockfile enforcement.
2. Format check.
3. Lint.
4. Typecheck.
5. Unit tests.
6. Architecture tests.
7. Build.
8. Integration tests with PostgreSQL.
9. End-to-end vertical-slice tests.

Optional live Notion tests remain outside normal CI.

## Fast Feedback

Format, lint, typecheck and unit tests should run before slower integration tests.

## Failure Policy

No stage may be marked optional merely because generated code fails it.

A failed required stage blocks acceptance.

---

# Local Validation

Before accepting an OpenCode task, run at minimum:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

When the task affects persistence, storage, Notion or CLI integration, also run the corresponding integration suite.

## Changed-Scope Validation

A task may run targeted tests during development.

Before commit, the relevant full package tests must pass.

Before merge or release, the complete required suite must pass.

---

# OpenCode Testing Requirements

Every implementation prompt must specify:

* Tests to add.
* Test category.
* Required success cases.
* Required failure cases.
* Validation commands.

OpenCode must not:

* Mark tests skipped without approval.
* Remove failing assertions.
* Replace meaningful assertions with snapshots only.
* Mock the subject under test.
* Add broad `any` types to simplify tests.
* Disable strict TypeScript rules.
* Depend on live Notion for required tests.
* Modify architecture rules to make tests pass.
* Claim completion when required tests fail.

## Final OpenCode Report

Must include:

* Test files created or changed.
* Scenarios covered.
* Commands executed.
* Pass or fail result.
* Any untested limitation.
* Any fixture added.
* Any test infrastructure change.

---

# Flaky Test Policy

Flaky tests are defects.

When a test is flaky:

1. Identify the nondeterministic dependency.
2. Remove reliance on timing, ordering or external availability.
3. Improve isolation.
4. Do not simply add retries to hide the issue.

Test retries may be used only for known external live tests, which are optional and separately classified.

---

# Performance Tests

Performance tests are not required for the first implementation.

They may be introduced for measured risks such as:

* Large snapshot serialization.
* Knowledge batch insertion.
* Search performance.
* Deep Notion traversal.
* Large validation sets.

Performance assumptions must not replace correctness tests.

---

# Test Data Privacy

Committed fixtures must not contain:

* Real Notion tokens.
* Personal private content.
* Proprietary source material without approval.
* Real database credentials.
* Sensitive URLs with access parameters.

Representative content should be synthetic or sanitized.

---

# Test Review Checklist

Before accepting tests, verify:

* The test name describes behavior.
* The setup is understandable.
* The test would fail if the behavior broke.
* Failure paths are covered.
* Workspace scope is explicit.
* Time and IDs are deterministic.
* No real external resource is used unintentionally.
* No secret appears.
* Assertions do not depend on implementation details.
* Tests do not silently weaken a contract.

---

# Version 1 Minimum Test Deliverables

By the end of version 1, the project must include:

* Core unit tests for all implemented Aggregates and Value Objects.
* Application handler tests for every implemented Command and Query.
* Repository contract tests.
* PostgreSQL repository integration tests.
* SnapshotStorage contract and integration tests.
* Notion adapter mocked integration tests.
* Config parsing and redaction tests.
* CLI rendering and command tests.
* Architecture tests.
* Successful end-to-end ingestion test.
* Invalid-content end-to-end test.
* Failed-synchronization recovery test.

---

# Prohibited Testing Practices

Version 1 must not:

* Depend on developer machine state.
* Use one giant end-to-end test as the entire suite.
* Mock all domain behavior in Application tests.
* Use real Notion in normal CI.
* Share mutable test state across suites.
* Rely on test execution order.
* Use arbitrary sleeps.
* Ignore Workspace isolation.
* Skip failure-path testing.
* Use snapshots as the only semantic assertion.
* Expose real private Playbook content in fixtures.
* Let production packages depend on Testing.
* Disable failing architecture checks.
* Use a different schema from production migrations.

---

# Approved Version 1 Direction

Version 1 will use:

* Vitest.
* Colocated or consistently organized tests.
* Fast deterministic Core tests.
* Port-based Application tests.
* Reusable contract-test suites.
* PostgreSQL integration tests.
* Temporary-directory storage tests.
* Mocked Notion integration tests.
* Architecture dependency tests.
* CLI process tests for critical commands.
* Required end-to-end ingestion scenarios.
* Explicit security and concurrency tests.
* No required live external service tests.

---

# Completion Criteria

Testing boundaries are ready for implementation when:

* Each package has a clear test responsibility.
* Domain and Application tests remain infrastructure-independent.
* Adapter contracts can be verified consistently.
* PostgreSQL and local storage behavior are tested for real.
* Notion integration is reproducible without live access.
* Architecture violations are automatically detectable.
* The complete vertical slice has success and failure E2E coverage.
* CI can run all required tests without personal credentials.
* OpenCode tasks have enforceable testing expectations.
