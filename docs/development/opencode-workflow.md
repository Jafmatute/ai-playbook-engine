# AI Playbook Engine — OpenCode Development Workflow

## Purpose

This document defines how AI coding agents, including OpenCode, are used during the development of AI Playbook Engine.

The objective is to use AI to increase implementation speed without allowing the coding agent to redefine:

* Architecture.
* Domain behavior.
* Package boundaries.
* Product scope.
* Technical standards.
* Security rules.
* Version 1 priorities.

The coding agent acts as an implementation assistant.

It is not the architectural authority of the project.

## Roles

### Product Owner

The project owner is responsible for:

* Approving product scope.
* Prioritizing capabilities.
* Accepting or rejecting changes.
* Running the project locally.
* Reviewing visible behavior.
* Authorizing commits and releases.

### Architecture and Domain Design

Architecture and domain design are responsible for:

* Architectural decisions.
* Domain definitions.
* Aggregate boundaries.
* Lifecycle rules.
* Application use cases.
* Technical contracts.
* Data model decisions.
* API and CLI design.
* Acceptance criteria.
* Reviewing architectural compliance.

These decisions must be documented before implementation when they materially affect the system.

### OpenCode

OpenCode is responsible for:

* Implementing approved tasks.
* Creating and editing code.
* Adding automated tests.
* Performing bounded refactorings.
* Running validation commands.
* Reporting deviations and failures.
* Preserving existing architecture and domain rules.

OpenCode must not independently redefine the project.

## Authority Order

When instructions conflict, the following order applies:

1. Current task specification.
2. Approved domain decisions.
3. Architectural Decision Records.
4. Domain documentation.
5. Technical design documentation.
6. Development standards.
7. Existing code conventions.
8. Agent-generated assumptions.

An agent-generated assumption must never override an approved documented decision.

When two approved documents appear to conflict, the agent must stop that part of the implementation and report the conflict.

It must not choose a new architecture silently.

## Required Reading

Before implementing a task, OpenCode must inspect the documents relevant to that task.

The minimum general context includes:

* `docs/architecture/system-overview.md`
* `docs/architecture/context-map.md`
* `docs/architecture/module-catalog.md`
* `docs/adr/ADR-001-architecture-style.md`
* `docs/adr/ADR-002-package-dependency-rules.md`
* `docs/domain/version-1-scope.md`
* `docs/domain/version-1-domain-decisions.md`

Additional documents must be reviewed depending on the task.

Examples:

### Domain implementation

Review:

* `docs/domain/ubiquitous-language.md`
* `docs/domain/aggregate-boundaries.md`
* `docs/domain/lifecycle-state-machines.md`
* `docs/domain/version-1-conceptual-model.md`

### Application use case implementation

Review:

* `docs/domain/application-use-cases.md`
* Relevant Aggregate and lifecycle documentation.
* Repository and application contracts when available.

### Notion integration

Review:

* Version 1 Notion scope.
* Package dependency rules.
* Source and synchronization domain definitions.
* Security and configuration documentation.

### Persistence implementation

Review:

* Data model documentation.
* Repository contracts.
* Workspace isolation rules.
* Transaction requirements.
* Migration conventions.

## Task Size

AI implementation tasks must remain small and reviewable.

A task should normally affect:

* One package.
* One module.
* One Aggregate or related group of Value Objects.
* One use case and its tests.
* One infrastructure adapter.
* One focused refactoring.

Large requests such as the following are prohibited:

```text
Implement the complete Engine.
Build all domain modules.
Create the database, API, CLI and Notion integration.
Refactor the entire architecture.
```

Large features must be decomposed into sequential tasks.

## Standard Task Structure

Every implementation prompt should contain:

1. Context.
2. Objective.
3. Documents that must be reviewed.
4. Files or packages allowed to change.
5. Files or areas that must not change.
6. Required behavior.
7. Domain invariants.
8. Technical constraints.
9. Tests required.
10. Validation commands.
11. Expected final report.
12. Explicit instruction not to commit.

## Change Boundaries

Each task must define its allowed change boundary.

OpenCode may modify only:

* Files explicitly listed.
* Files clearly required inside the approved package or module.
* Test files directly associated with the task.
* Package metadata when the task explicitly authorizes it.

OpenCode must not modify unrelated files for cleanup, formatting or personal preference.

If an unrelated issue blocks the task, it must report it rather than expanding scope silently.

## Dependency Rules

OpenCode must not add a dependency unless the task explicitly permits it.

Before adding a dependency, the task must establish:

* Why the dependency is required.
* Which package owns it.
* Whether it is a runtime or development dependency.
* Whether an existing dependency already solves the problem.
* Whether it introduces framework coupling.
* Whether it affects security or bundle/runtime size.

Dependencies must be installed in the workspace that uses them.

Shared development tools may be installed at the workspace root with:

```bash
pnpm add -Dw <package>
```

Application or package-specific dependencies must not be installed at the root merely for convenience.

## Architecture Protection

OpenCode must preserve these rules:

* Core does not import infrastructure.
* Core does not import Notion SDK types.
* Core does not read environment variables.
* Domain behavior does not live in API, CLI or worker entry points.
* External systems are accessed through ports or adapters.
* ORM models do not become domain entities.
* Notion objects are translated before entering normalized domain knowledge.
* Workspace ownership remains explicit.
* Historical immutable records are not rewritten.
* Retries preserve prior attempts.
* Publication and activation remain separate.
* Version 1 scope exclusions remain excluded.

## Domain Implementation Rules

When implementing domain code, OpenCode must:

* Use the ubiquitous language.
* Represent unrelated identifiers with different types.
* Keep Aggregate invariants inside Aggregate behavior.
* Avoid public setters that bypass invariants.
* Avoid anemic state mutation.
* Make invalid states difficult or impossible to construct.
* Preserve immutable historical values.
* Keep external and technical concerns outside the domain.
* Avoid creating abstractions without a documented need.

OpenCode must not:

* Generate entities directly from future database tables.
* Create one Aggregate Root per Knowledge Type.
* Add users, organizations or permissions.
* Add AI provider integrations during the version 1 ingestion slice.
* Add execution or audit behavior before its approved phase.

## Testing Rules

Every implementation task must include appropriate tests.

### Domain tests

Must test:

* Valid construction.
* Invalid construction.
* Allowed lifecycle transitions.
* Rejected lifecycle transitions.
* Invariants.
* Immutability.
* Workspace ownership rules.
* Idempotent behavior where applicable.

### Application tests

Must test:

* Orchestration.
* Repository interactions.
* Not-found behavior.
* Workspace mismatches.
* State conflicts.
* External port failures.
* Successful outcomes.

### Infrastructure tests

Must test:

* Mapping.
* Persistence.
* Constraints.
* Error translation.
* Secret handling.
* Integration behavior.

Tests must verify behavior, not implementation details.

Snapshot testing must not replace meaningful assertions.

## Validation Commands

Unless the task specifies otherwise, OpenCode must execute:

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If architecture tests exist, they must also run.

OpenCode must report the result of every command.

It must not:

* Disable failing tests.
* Weaken lint rules.
* Add ignore directives without justification.
* Change TypeScript strictness.
* Remove validation scripts.
* Update dependencies merely to hide an unrelated failure.

## Failure Handling

When implementation cannot be completed, OpenCode must report:

* What was completed.
* What remains incomplete.
* The exact blocker.
* Whether the blocker comes from the task or existing repository state.
* The smallest recommended next action.

OpenCode must not claim success when:

* Tests fail.
* Type checking fails.
* Required behavior is missing.
* Scope was changed.
* An invariant was skipped.
* Validation commands were not executed.

## Agent Assumptions

OpenCode may make low-risk implementation assumptions only when they:

* Do not alter domain meaning.
* Do not introduce new dependencies.
* Do not expand the feature.
* Do not change a public contract.
* Are easy to reverse.
* Follow existing repository conventions.

Examples of acceptable assumptions:

* Local private helper function name.
* Test variable name.
* Internal file ordering.
* Equivalent formatting choice allowed by project standards.

Examples of prohibited assumptions:

* Adding a new lifecycle state.
* Changing identifier strategy.
* Selecting a database library.
* Publishing automatically after validation.
* Adding authentication.
* Merging modules.
* Exposing new API operations.
* Choosing how Notion content maps to Knowledge Types without a mapping specification.

## Generated Code Review

Generated code must be reviewed like human-written code.

The reviewer must inspect:

* `git status`.
* `git diff --stat`.
* `git diff`.
* New dependencies.
* Public exports.
* Package boundaries.
* Test coverage.
* Error handling.
* Secret exposure.
* Unrequested changes.

Useful commands include:

```bash
git status
git diff --stat
git diff
pnpm why <dependency>
pnpm list --depth 0
```

## Acceptance Checklist

Before accepting an OpenCode task, verify:

* The requested behavior exists.
* Only approved files changed.
* No unrelated refactoring was introduced.
* Domain terms match documentation.
* Invariants are implemented.
* Tests include failure cases.
* No dependency was added without approval.
* No secrets or environment values are exposed.
* Public exports are intentional.
* Validation commands pass.
* OpenCode did not commit or push.

## Commit Responsibility

OpenCode must not commit or push unless the project owner explicitly requests it for that task.

The default workflow is:

1. OpenCode implements the task.
2. OpenCode runs validations.
3. The project owner reviews the diff.
4. Architectural review is performed when necessary.
5. The project owner creates the commit.
6. The project owner pushes the branch.

## Commit Scope

Each accepted implementation task should normally produce one focused commit.

Examples:

```text
feat(core): add workspace domain model
feat(core): add playbook aggregate
test(core): add playbook lifecycle coverage
feat(config): validate application environment
feat(notion): add source connection verification
```

Documentation alignment may be committed separately from implementation.

## Refactoring Policy

OpenCode may refactor code only when:

* The task explicitly requests it.
* It is required to implement the approved behavior safely.
* Existing tests protect the behavior.
* The refactoring remains inside the task boundary.

Refactoring must not silently:

* Change public contracts.
* Rename domain concepts.
* Merge Aggregate boundaries.
* Move business logic into infrastructure.
* Introduce a new architectural pattern.

## Bug Fix Policy

A bug-fix task must include:

* Reproduction or failing test.
* Expected behavior.
* Relevant domain or technical rule.
* Minimal correction scope.
* Regression test.

The preferred flow is:

1. Add or demonstrate a failing test.
2. Implement the correction.
3. Verify the regression test.
4. Run the full validation suite.

## Documentation Updates During Coding

OpenCode should update documentation only when the task explicitly requests it.

Implementation agents must not reinterpret architectural documentation based on generated code.

When implementation reveals a missing decision:

1. Report the missing decision.
2. Do not invent it.
3. Update the design first.
4. Resume implementation with a new approved task.

## Security Rules

OpenCode must never:

* Commit secrets.
* Display secret values in its final report.
* Log Notion tokens.
* Persist raw credentials.
* Add real credentials to fixtures.
* Disable certificate validation.
* Use unsafe command execution without justification.
* Trust file paths without validation.
* Return stack traces to normal CLI output by default.

Test credentials must be clearly fake.

## Version 1 Scope Protection

During version 1, OpenCode must not implement:

* Runtime workflow execution.
* AI provider invocation.
* Audits.
* Decisions.
* Projects.
* Scheduled automation.
* Production HTTP API.
* Web interface.
* Authentication.
* Authorization.
* Organizations.
* Billing.
* Vector search.
* Embeddings.
* Notion write-back.

References to these future capabilities may exist in documentation and interfaces only when explicitly approved.

## First Implementation Sequence

The initial implementation sequence is:

1. Shared identifier and error primitives.
2. Workspace domain model.
3. Playbook domain model.
4. Playbook Source domain model.
5. Synchronization Run domain model.
6. Playbook Version and normalization lifecycle.
7. Knowledge Item and relationship model.
8. Validation Result and findings.
9. Repository contracts.
10. Application use cases.
11. Persistence adapters.
12. Notion adapter.
13. CLI commands.
14. End-to-end ingestion flow.

Each step requires its own task and review.

## Final Principle

AI-generated code is accepted only when it is:

* Architecturally compliant.
* Domain-correct.
* Tested.
* Reviewable.
* Traceable to an approved task.
* Within version 1 scope.

Productivity is measured by reliable accepted changes, not by the volume of generated code.
