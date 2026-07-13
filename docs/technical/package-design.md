# AI Playbook Engine — Package Design

## Purpose

This document defines the physical package structure of AI Playbook Engine.

It establishes:

- The applications contained in the monorepo.
- The reusable internal packages.
- The responsibility of each package.
- The code that belongs in each package.
- The code that must not be placed in each package.
- The intended public surface of each package.
- The initial package evolution strategy.

This document does not define:

- Detailed dependency rules.
- Repository interfaces.
- Database models.
- Application use-case contracts.
- API endpoints.
- CLI command syntax.
- Infrastructure implementations.

Those concerns are documented separately.

---

# Repository Structure

The repository uses a pnpm workspace.

The approved top-level structure is:

```text
ai-playbook-engine/
├── apps/
│   ├── api/
│   ├── cli/
│   └── worker/
│
├── packages/
│   ├── shared/
│   ├── core/
│   ├── application/
│   ├── config/
│   ├── infrastructure/
│   ├── notion/
│   ├── ai-providers/
│   └── testing/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── domain/
│   ├── technical/
│   └── development/
│
├── scripts/
├── .github/
└── package.json
```

The repository remains a modular monolith.

The presence of several packages does not imply:

- Microservices.
- Independent deployment.
- Independent databases.
- Network communication between modules.
- Separate product ownership.

Packages exist to enforce boundaries and reuse.

---

# Applications

Applications are executable entry points.

They assemble internal packages and expose system capabilities through a delivery mechanism.

Applications must remain thin.

They must not become the location of domain or application logic.

---

## `apps/cli`

### Purpose

Primary user interface for version 1.

The CLI invokes application use cases and presents their results through terminal output.

### Responsibilities

- Parse command-line arguments.
- Validate command syntax.
- Resolve output mode.
- Create the application composition root.
- Invoke application use cases.
- Map application results to exit codes.
- Render human-readable output.
- Render structured JSON output.
- Redact sensitive values.
- Handle expected errors without exposing stack traces by default.

### Allowed Content

Examples:

```text
src/
├── commands/
├── output/
├── exit-codes/
├── composition/
├── errors/
└── main.ts
```

### Prohibited Content

The CLI must not contain:

- Aggregate business rules.
- Repository implementations.
- Direct database queries.
- Notion SDK calls.
- Environment-variable parsing scattered across commands.
- Knowledge normalization logic.
- Playbook validation logic.
- Lifecycle transitions implemented outside use cases.
- Raw persistence models.

### Version 1 Status

`apps/cli` is the primary delivery application.

It will expose the initial Notion-to-versioned-knowledge vertical slice.

---

## `apps/api`

### Purpose

Future HTTP delivery mechanism.

It may expose Engine functionality through a public or private API.

### Responsibilities

When implemented:

- Configure the HTTP server.
- Define routes.
- Validate transport input.
- Map HTTP requests to application commands and queries.
- Map application results to HTTP responses.
- Apply transport-level middleware.
- Expose health and readiness endpoints.
- Provide request correlation.

### Prohibited Content

The API must not contain:

- Domain logic.
- Database access directly from routes.
- Notion SDK operations.
- AI provider SDK operations.
- Workspace isolation implemented only through controllers.
- ORM models exposed as response contracts.

### Version 1 Status

A production API is outside the version 1 scope.

The package may remain empty or contain only minimal bootstrap and health-check wiring when required to validate the architecture.

---

## `apps/worker`

### Purpose

Future background-processing application.

It will run long-lived, scheduled or asynchronous tasks.

### Responsibilities

When implemented:

- Consume queued work.
- Invoke application use cases.
- Execute scheduled jobs.
- Manage worker lifecycle.
- Handle graceful shutdown.
- Apply operational retry and timeout policies.
- Preserve correlation and Workspace context.

### Prohibited Content

The Worker must not contain:

- Domain lifecycle rules.
- Business retry rules that belong to Aggregates or application policies.
- Direct repository manipulation that bypasses use cases.
- Notion-specific behavior outside the Notion adapter.
- AI-provider-specific behavior outside provider adapters.

### Version 1 Status

Durable background processing is outside version 1.

The package remains reserved for future use.

---

# Internal Packages

Internal packages contain reusable system capabilities.

They are not independently deployed in version 1.

---

## `packages/shared`

### Purpose

Provide small, stable and domain-independent technical primitives.

### Responsibilities

Candidate responsibilities include:

- Typed identifier primitives.
- Generic result types.
- Base error abstractions.
- Clock contracts.
- Generic pagination contracts.
- Safe serialization helpers.
- Common assertion utilities.
- Generic branded-type utilities.

### Allowed Characteristics

Code in `shared` must be:

- Domain-independent.
- Small.
- Stable.
- Reusable across several packages.
- Free from framework coupling.

### Prohibited Content

`shared` must not contain:

- Workspace.
- Playbook.
- Synchronization Run.
- Playbook Version.
- Knowledge Item.
- Domain policies.
- Repository contracts tied to a module.
- Notion-specific types.
- Database types.
- CLI-specific output.
- Application-specific configuration.

### Design Rule

A concept must not be placed in `shared` merely because several files use it.

It belongs in `shared` only when its meaning is genuinely generic.

### Public Surface

The package should expose only intentional primitives through:

```text
src/index.ts
```

Internal helpers must remain unexported.

---

## `packages/core`

### Purpose

Contain the version 1 domain model.

This package owns business meaning and invariants.

### Responsibilities

- Aggregate Roots.
- Entities.
- Value Objects.
- Domain policies.
- Domain services.
- Domain events when implemented.
- Lifecycle transitions.
- Domain validation that does not require external systems.
- Domain-specific identifiers.
- Domain-specific errors.

### Initial Version 1 Modules

The first implementation may contain:

```text
src/
├── workspace/
├── playbook/
├── playbook-source/
├── synchronization/
├── playbook-version/
├── knowledge/
├── validation/
└── index.ts
```

Folder names may be refined, but the domain boundaries must remain explicit.

### Allowed Dependencies

The Core may use:

- TypeScript standard language features.
- `packages/shared`.
- Small domain-safe libraries only when explicitly approved.

### Prohibited Content

The Core must not contain:

- Environment-variable access.
- PostgreSQL code.
- ORM decorators or models.
- Notion SDK imports.
- File-system access.
- HTTP or CLI types.
- Logging implementations.
- Queue implementations.
- Vendor-specific errors.
- Credential values.
- Application orchestration.
- Framework dependency injection containers.

### Public Surface

The package may expose:

- Aggregate Roots.
- Domain entities.
- Value Objects.
- Domain services.
- Domain events.
- Domain error types.
- Stable domain contracts required by the Application package.

Internal construction helpers and implementation details must not be exported unnecessarily.

### Version 1 Rule

Future modules such as Executions, Audits, Decisions and Projects must not be added during the first ingestion slice.

---

## `packages/application`

### Purpose

Contain application use cases and orchestration.

The package coordinates the domain and external ports without containing infrastructure implementation.

### Responsibilities

- Commands.
- Queries.
- Use-case handlers.
- Application services.
- Repository interfaces.
- Transaction abstractions.
- Storage ports.
- External source ports.
- Workspace resolution contract.
- Idempotency contracts.
- Application result types.
- Application-level error mapping.
- Cross-Aggregate orchestration.

### Initial Version 1 Modules

Candidate structure:

```text
src/
├── workspace/
├── playbooks/
├── sources/
├── synchronization/
├── snapshots/
├── versions/
├── knowledge/
├── validation/
├── ports/
└── index.ts
```

### Examples of Application Responsibilities

- Create a Playbook.
- Register a Notion source.
- Start a Synchronization Run.
- Store a Synchronization Snapshot.
- Create a Draft Playbook Version.
- Normalize knowledge.
- Validate a version.
- Publish a version.
- Activate a version.
- Query normalized knowledge.

### Allowed Dependencies

The Application package may depend on:

- `packages/core`.
- `packages/shared`.

### Prohibited Content

The Application package must not contain:

- PostgreSQL queries.
- ORM models.
- Notion SDK requests.
- CLI formatting.
- HTTP responses.
- Environment parsing.
- Concrete file-system operations.
- Real secret resolution.
- Provider-specific retry code.
- Domain state mutation that bypasses Aggregate behavior.

### Public Surface

The package may expose:

- Use-case contracts.
- Use-case implementations.
- Command and query input types.
- Application output types.
- Repository interfaces.
- External integration ports.
- Transaction boundary contracts.
- Application errors.

The package must not expose infrastructure implementation types.

---

## `packages/config`

### Purpose

Provide centralized, typed and validated runtime configuration.

### Responsibilities

- Define configuration schemas.
- Read approved environment variables.
- Validate startup configuration.
- Produce typed configuration objects.
- Redact sensitive values.
- Support configuration diagnostics.
- Define environment-specific defaults where explicitly allowed.

### Version 1 Configuration Areas

- Application environment.
- PostgreSQL connection.
- Current personal Workspace resolution.
- Notion credential reference.
- Snapshot storage directory.
- Logging level.
- CLI output defaults.
- Synchronization limits.

### Prohibited Content

The Config package must not contain:

- Domain rules.
- Aggregate state.
- Database connections.
- Notion client instances.
- CLI commands.
- Actual credential persistence.
- Secret values in public diagnostic output.

### Public Surface

Expose:

- Validated configuration types.
- Configuration loader.
- Redacted configuration diagnostics.
- Stable configuration errors.

### Rule

Only the Config package may read process environment variables directly.

Other packages receive validated configuration through construction or dependency injection.

---

## `packages/infrastructure`

### Purpose

Implement technical adapters required by application ports.

### Responsibilities

Version 1 infrastructure may include:

- PostgreSQL connection management.
- Database migrations.
- Repository implementations.
- Transaction implementation.
- Local snapshot storage.
- Checksum implementation.
- Structured logging implementation.
- System clock.
- Identifier generation.
- Workspace resolver for personal mode.
- Persistence mappings.
- Operational recovery helpers.

### Candidate Structure

```text
src/
├── persistence/
├── repositories/
├── transactions/
├── storage/
├── logging/
├── time/
├── identifiers/
├── workspace/
└── index.ts
```

### Allowed Dependencies

Infrastructure may depend on:

- `packages/application`.
- `packages/core`.
- `packages/shared`.
- `packages/config`.
- Approved infrastructure libraries.

### Prohibited Content

Infrastructure must not:

- Redefine Aggregate invariants.
- Publish a Playbook Version by directly changing persistence state.
- Infer a Workspace silently.
- Expose ORM models as domain objects.
- Store raw credentials in domain records.
- Contain Notion API traversal logic.
- Contain CLI formatting.
- Become a general location for every external integration.

### Public Surface

Expose only approved adapter factories and implementations required by composition roots.

Internal ORM schemas, query builders and mapping functions should not become general public exports.

---

## `packages/notion`

### Purpose

Implement the Notion Playbook Source adapter.

### Responsibilities

- Create and configure the Notion client.
- Verify access to configured roots.
- Retrieve pages.
- Retrieve databases.
- Retrieve database records.
- Retrieve block hierarchies.
- Handle pagination.
- Apply bounded retry and rate-limit behavior.
- Translate Notion errors into integration errors.
- Produce source-aligned snapshot data.
- Preserve source references.
- Report unsupported block types.
- Map Notion transport objects into intermediate internal source structures.

### Internal Layers

Candidate structure:

```text
src/
├── client/
├── gateway/
├── retrieval/
├── mapping/
├── retry/
├── errors/
├── fixtures/
└── index.ts
```

### Allowed Dependencies

The Notion package may depend on:

- `packages/application`.
- `packages/core` only for approved public domain types where necessary.
- `packages/shared`.
- `packages/config`.
- The official Notion SDK.
- Approved retry utilities when explicitly selected.

### Prohibited Content

The Notion package must not:

- Publish Playbook Versions.
- Activate versions.
- Define Knowledge domain rules.
- Expose Notion SDK types through application contracts.
- Store snapshots directly without using the approved storage port.
- Read arbitrary environment variables.
- Implement CLI commands.
- Write to Notion in version 1.
- Decide Playbook naming or lifecycle policy.

### Boundary Rule

The Notion package understands Notion.

The Core does not.

The Application package understands a generic Playbook Source port.

It does not depend on Notion transport structures.

---

## `packages/ai-providers`

### Purpose

Reserve the boundary for future AI provider adapters.

### Responsibilities

Future responsibilities may include:

- OpenAI adapter.
- Anthropic adapter.
- Google adapter.
- Local model adapter.
- Provider-neutral request mapping.
- Provider response normalization.
- Usage collection.
- Provider error translation.

### Version 1 Status

No AI provider integration is implemented in version 1.

The package may remain empty.

### Prohibited Version 1 Changes

Do not add:

- Provider SDKs.
- AI Request models.
- Token accounting.
- Model routing.
- Embeddings.
- Vector search.
- Runtime model selection.

The package remains reserved to protect the future architecture.

---

## `packages/testing`

### Purpose

Provide reusable test support across packages.

### Responsibilities

- Test builders.
- Domain object factories.
- Fake clocks.
- Fake identifier generators.
- In-memory repository implementations.
- Test database helpers.
- Fixture loaders.
- Contract-test suites.
- Architecture-test helpers.
- Fake external source gateways.

### Prohibited Content

The Testing package must not:

- Contain production business logic.
- Become a required runtime dependency.
- Export real credentials.
- Duplicate large portions of production implementation.
- Hide test setup so extensively that tests become unreadable.

### Dependency Rule

Production packages must not depend on `packages/testing`.

Only tests and test configuration may import it.

---

# Package Classification

Packages are classified into four categories.

## Domain Packages

- `core`.

Own business meaning and invariants.

## Application Packages

- `application`.

Own orchestration and external contracts.

## Technical Packages

- `config`.
- `infrastructure`.
- `notion`.
- `ai-providers`.

Own configuration and technical implementations.

## Support Packages

- `shared`.
- `testing`.

Provide reusable technical support.

---

# Composition Roots

A composition root creates concrete object graphs.

Approved composition roots belong in executable applications.

Examples:

```text
apps/cli/src/composition/
apps/api/src/composition/
apps/worker/src/composition/
```

A composition root may:

- Load validated configuration.
- Create database connections.
- Create repositories.
- Create storage adapters.
- Create the Notion adapter.
- Create use-case handlers.
- Create CLI command dependencies.

A composition root must not:

- Contain business decisions.
- Perform domain state transitions itself.
- Become a global service locator.
- Be imported by Core or Application.

---

# Public Exports

Every package must expose an intentional public API through its root entry point.

Example:

```text
packages/core/src/index.ts
```

Packages must not rely on unrestricted deep imports such as:

```typescript
import { Something } from '@ai-playbook-engine/core/src/internal/file.js';
```

Consumers should import from approved public entry points:

```typescript
import { Something } from '@ai-playbook-engine/core';
```

Subpath exports may be introduced later when a package becomes too large.

They must be explicit.

Example future shape:

```text
@ai-playbook-engine/core/workspace
@ai-playbook-engine/core/playbook
```

Subpath exports must not expose private implementation details.

---

# Internal File Organization

Packages should organize files by capability or domain concept rather than by generic technical type alone.

Preferred:

```text
core/src/playbook/
├── playbook.ts
├── playbook-id.ts
├── playbook-name.ts
├── playbook-status.ts
├── playbook-errors.ts
└── index.ts
```

Avoid package-wide structures such as:

```text
core/src/
├── entities/
├── enums/
├── services/
├── interfaces/
└── utils/
```

Generic technical folders may be used only when the contained concepts genuinely share one responsibility.

---

# Package Naming

Internal package names use the namespace:

```text
@ai-playbook-engine/*
```

Approved package names:

```text
@ai-playbook-engine/shared
@ai-playbook-engine/core
@ai-playbook-engine/application
@ai-playbook-engine/config
@ai-playbook-engine/infrastructure
@ai-playbook-engine/notion
@ai-playbook-engine/ai-providers
@ai-playbook-engine/testing
```

Applications may use private package names such as:

```text
@ai-playbook-engine/cli
@ai-playbook-engine/api
@ai-playbook-engine/worker
```

All internal packages remain private during version 1.

---

# Package Metadata Rules

Each package must define:

- `name`.
- `version`.
- `private`.
- `type`.
- `main`.
- `types`.
- `exports`.
- `files`.
- Required scripts.
- Explicit dependencies.

Recommended scripts:

```json
{
  "build": "tsc --build",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "clean": "rimraf dist tsconfig.tsbuildinfo"
}
```

Scripts may be introduced when the package contains executable code or tests.

Internal dependencies use:

```text
workspace:*
```

Dependencies must be declared in the package that uses them.

---

# TypeScript Project References

Each internal package should have its own `tsconfig.json`.

The root `tsconfig.json` references all buildable packages and applications.

Project references must reflect the approved dependency graph.

A package must not add a TypeScript reference merely to make an import compile.

The reference must represent a valid architectural dependency.

---

# Empty Reserved Packages

Some packages or applications may remain empty during version 1:

- `apps/api`.
- `apps/worker`.
- `packages/ai-providers`.

Reserved packages exist because their architectural role is already approved.

They must not receive placeholder business logic.

An empty package may contain:

- `package.json`.
- `tsconfig.json`.
- `src/index.ts`.
- A short README explaining its deferred scope.

It should not contain speculative interfaces or generated scaffolding without a current use case.

---

# Version 1 Package Activation Order

Packages will be implemented in this order:

1. `shared`.
2. `core`.
3. `application`.
4. `config`.
5. `infrastructure`.
6. `notion`.
7. `testing`, incrementally as shared test support becomes justified.
8. `apps/cli`.

Reserved packages remain inactive:

- `apps/api`.
- `apps/worker`.
- `packages/ai-providers`.

This order follows dependency direction and reduces speculative implementation.

---

# Package Creation Rules

A new package may be introduced only when:

1. It has a distinct architectural responsibility.
2. It has a stable dependency direction.
3. Keeping the code in an existing package would reduce cohesion.
4. Its public surface can be described.
5. Its lifecycle or external dependencies justify separation.
6. The decision is documented.

A package must not be created merely because:

- A folder is growing.
- A coding agent suggests it.
- A dependency has a different vendor name.
- A technical class has a unique name.
- Microservice extraction may happen someday.

---

# Package Removal or Merge Rules

Packages may be merged or removed when:

- Their responsibilities cannot be distinguished.
- They create circular dependencies.
- Their public contracts are artificial.
- They remain empty without a justified future role.
- Their separation increases complexity without protecting a boundary.

Any material package restructuring requires:

- Updated package-design documentation.
- Updated dependency rules.
- TypeScript project-reference changes.
- Import-boundary validation.
- A focused migration plan.

---

# Version 1 Approved Package Set

The approved package set for version 1 is:

```text
apps/
├── cli
├── api      # reserved
└── worker   # reserved

packages/
├── shared
├── core
├── application
├── config
├── infrastructure
├── notion
├── ai-providers   # reserved
└── testing
```

No additional package may be introduced during the initial implementation without an explicit design decision.

---

# Implementation Constraints

OpenCode must not:

- Place use cases in Core.
- Place Aggregate behavior in Application.
- Place database models in Core.
- Place Notion SDK types in Application contracts.
- Place CLI rendering in Application.
- Place environment reads outside Config.
- Place repository implementations in Application.
- Place repository interfaces in Infrastructure.
- Add future AI provider code during version 1.
- Put production code in Testing.
- Use Shared as a miscellaneous code container.
- Add a new package without approval.
- Use deep imports to bypass public exports.

---

# Completion Criteria

The package design is considered implemented when:

- Every approved package has a documented responsibility.
- Applications remain thin delivery mechanisms.
- Domain logic has one clear home.
- Application orchestration has one clear home.
- Technical adapters have explicit package ownership.
- Notion remains isolated from Core.
- Configuration access is centralized.
- Testing support cannot become a runtime dependency.
- Public exports are intentional.
- Reserved future packages remain free from speculative functionality.
