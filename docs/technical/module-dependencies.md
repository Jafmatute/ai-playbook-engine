# AI Playbook Engine — Module and Package Dependencies

## Purpose

This document defines the approved dependency graph for AI Playbook Engine.

It governs:

* Package dependencies.
* TypeScript project references.
* Source-code imports.
* Public package exports.
* Runtime composition.
* Test dependencies.
* Future architecture tests.

The objective is to preserve a directed architecture in which business rules remain independent from delivery mechanisms, persistence and external providers.

This document refines:

* `docs/adr/ADR-002-package-dependency-rules.md`
* `docs/technical/package-design.md`

If an implementation requires a dependency prohibited by this document, the implementation must be redesigned or the architecture must be changed explicitly before proceeding.

---

# Dependency Principles

## Dependencies Point Inward

Source-code dependencies must point toward more stable business abstractions.

The general direction is:

```text
Delivery applications
        ↓
Technical adapters
        ↓
Application
        ↓
Core
        ↓
Shared
```

External systems remain outside the architecture:

```text
Notion SDK
PostgreSQL driver or ORM
File system
Logging library
CLI framework
HTTP framework
Future AI provider SDKs
```

They must be accessed through adapters or composition roots.

## Stability Direction

Packages closer to the domain must be more stable and less dependent on frameworks.

Expected stability order:

```text
shared
  ↑
core
  ↑
application
  ↑
config / infrastructure / notion
  ↑
cli / api / worker
```

This diagram represents dependency direction, not runtime call order.

At runtime, Core behavior may cause an Application use case to invoke an Infrastructure adapter through an Application port. The source dependency still points from Infrastructure toward Application, because Infrastructure implements a contract owned by Application.

## Explicit Dependencies

Every internal dependency must appear in:

* The consuming package's `package.json`.
* The consuming package's TypeScript project references when required.
* The approved dependency matrix in this document.

A package must not rely on transitive dependencies.

If a package imports another package directly, it must declare it directly.

## No Circular Dependencies

Circular dependencies are prohibited between packages and between domain modules.

Examples of prohibited package cycles:

```text
core → application → core
application → infrastructure → application
config → infrastructure → config
notion → application → notion
```

Implementation through dependency inversion does not create a cycle when:

* Application defines a port.
* Notion or Infrastructure implements the port.
* The composition root injects the implementation.

The source dependency remains:

```text
notion → application
```

Application does not import Notion.

---

# Approved Package Dependency Graph

```text
shared

core
  └── shared

application
  ├── core
  └── shared

config
  └── shared

infrastructure
  ├── application
  ├── core
  ├── shared
  └── config

notion
  ├── application
  ├── core       # only approved public domain types when necessary
  ├── shared
  └── config

ai-providers
  ├── application
  ├── core       # future approved public types only
  ├── shared
  └── config

testing
  ├── application
  ├── core
  ├── shared
  ├── config
  ├── infrastructure
  └── notion

cli
  ├── application
  ├── core       # public types required for rendering only
  ├── shared
  ├── config
  ├── infrastructure
  └── notion

api
  ├── application
  ├── core       # public response mapping types only when necessary
  ├── shared
  ├── config
  ├── infrastructure
  └── notion

worker
  ├── application
  ├── core       # public runtime types only when necessary
  ├── shared
  ├── config
  ├── infrastructure
  └── notion
```

Reserved packages may omit unused dependencies until implementation requires them.

A dependency being permitted does not mean it should be added preemptively.

---

# Dependency Matrix

Legend:

* `✓`: allowed when required.
* `—`: same package.
* `✗`: prohibited.
* `R`: reserved for future approved use.
* `T`: allowed only in test code.

| Consumer       | shared | core | application | config | infrastructure | notion | ai-providers | testing |
| -------------- | -----: | ---: | ----------: | -----: | -------------: | -----: | -----------: | ------: |
| shared         |      — |    ✗ |           ✗ |      ✗ |              ✗ |      ✗ |            ✗ |       ✗ |
| core           |      ✓ |    — |           ✗ |      ✗ |              ✗ |      ✗ |            ✗ |       ✗ |
| application    |      ✓ |    ✓ |           — |      ✗ |              ✗ |      ✗ |            ✗ |       ✗ |
| config         |      ✓ |    ✗ |           ✗ |      — |              ✗ |      ✗ |            ✗ |       ✗ |
| infrastructure |      ✓ |    ✓ |           ✓ |      ✓ |              — |      ✗ |            ✗ |       ✗ |
| notion         |      ✓ |    ✓ |           ✓ |      ✓ |              ✗ |      — |            ✗ |       ✗ |
| ai-providers   |      ✓ |    R |           ✓ |      ✓ |              ✗ |      ✗ |            — |       ✗ |
| testing        |      ✓ |    ✓ |           ✓ |      ✓ |              T |      T |            T |       — |
| cli            |      ✓ |    ✓ |           ✓ |      ✓ |              ✓ |      ✓ |      ✗ in V1 |       T |
| api            |      ✓ |    ✓ |           ✓ |      ✓ |              ✓ |      ✓ |            R |       T |
| worker         |      ✓ |    ✓ |           ✓ |      ✓ |              ✓ |      ✓ |            R |       T |

## Interpretation

### `core → shared`

Allowed for genuinely generic primitives.

Core must not depend on Shared for domain meaning that belongs inside Core.

### `application → core`

Required for:

* Aggregate interaction.
* Domain identifiers.
* Domain outputs.
* Domain errors.
* Domain services.

### `application → config`

Prohibited.

Application contracts should receive validated values or abstractions, not runtime configuration objects.

### `infrastructure → application`

Required to implement:

* Repositories.
* Transactions.
* Storage ports.
* Workspace resolution.
* Logging or operational ports when Application owns the abstraction.

### `notion → application`

Required to implement the generic Playbook Source gateway.

### `notion → infrastructure`

Prohibited.

The Notion adapter must not call database repositories or storage implementations directly.

Application use cases coordinate the Notion adapter with persistence and storage ports.

### `cli → infrastructure` and `cli → notion`

Allowed only for composition.

CLI commands must not invoke them directly.

The CLI composition root may instantiate:

* Repository implementations.
* Storage adapters.
* Notion gateway.
* Application handlers.

### `testing → production packages`

Allowed from test code and shared test helpers.

Production code must never import Testing.

---

# Package-Specific Rules

## Shared

### Allowed Imports

* JavaScript and TypeScript standard libraries.
* Approved generic dependencies with no business or framework coupling.

### Prohibited Imports

* Any internal package.
* Notion SDK.
* Database or ORM libraries.
* CLI or HTTP frameworks.
* Environment configuration libraries.
* Logging implementations.

### Rule

Shared is the root of the dependency graph.

If Shared needs to import another internal package, the concept does not belong in Shared.

---

## Core

### Allowed Imports

* `@ai-playbook-engine/shared`.
* Standard language features.
* Explicitly approved domain-safe dependencies.

### Prohibited Imports

* `@ai-playbook-engine/application`.
* `@ai-playbook-engine/config`.
* `@ai-playbook-engine/infrastructure`.
* `@ai-playbook-engine/notion`.
* `@ai-playbook-engine/ai-providers`.
* `@ai-playbook-engine/testing`.
* Any application under `apps`.
* Notion SDK.
* PostgreSQL, ORM or migration libraries.
* CLI frameworks.
* HTTP frameworks.
* Logging frameworks.
* Environment-variable libraries.
* File-system APIs for domain behavior.

### Internal Module Rule

Core modules may reference another Core module only through intentional public module contracts.

Examples:

```text
playbook-source → playbook identity
playbook-version → playbook identity
knowledge → playbook-version identity
validation → knowledge public contracts
```

A module must not deep-import another module's private files.

---

## Application

### Allowed Imports

* `@ai-playbook-engine/core`.
* `@ai-playbook-engine/shared`.

### Prohibited Imports

* Config.
* Infrastructure.
* Notion.
* AI Providers.
* Testing in production code.
* Applications.
* ORM libraries.
* Database drivers.
* Notion SDK.
* CLI or HTTP frameworks.
* File-system implementation APIs.
* Concrete logging libraries.

### Port Ownership Rule

Application owns contracts for capabilities it needs.

Examples:

* `WorkspaceRepository`.
* `PlaybookRepository`.
* `PlaybookSourceRepository`.
* `SynchronizationRunRepository`.
* `SnapshotStorage`.
* `PlaybookSourceGateway`.
* `TransactionManager`.
* `CurrentWorkspaceProvider`.
* `Clock`.
* `IdempotencyStore`.

Infrastructure and integration packages implement these contracts.

### Prohibited Reversal

Application must never import a concrete adapter to simplify wiring.

Incorrect:

```typescript
import { PostgresPlaybookRepository } from '@ai-playbook-engine/infrastructure';
```

Correct:

```typescript
import type { PlaybookRepository } from './ports/playbook-repository.js';
```

The composition root injects the concrete implementation.

---

## Config

### Allowed Imports

* Shared.
* Approved configuration validation library.
* Node runtime environment APIs.

### Prohibited Imports

* Core.
* Application.
* Infrastructure.
* Notion.
* Applications.
* Database clients.
* Notion client creation.
* Domain identifiers unless represented as validated raw configuration values.

### Rule

Config validates runtime input.

It does not resolve domain entities.

For example, Config may provide a configured personal Workspace identifier as a validated string representation, while Infrastructure or Application converts and verifies it through approved contracts.

---

## Infrastructure

### Allowed Imports

* Application.
* Core.
* Shared.
* Config.
* Approved persistence, logging, storage and system libraries.

### Prohibited Imports

* Notion.
* AI Providers.
* CLI, API or Worker.
* Application-specific rendering types.
* Notion SDK.
* Future provider SDKs.

### Repository Rule

Infrastructure may import Core domain types to map persistence records.

It must not make Core import Infrastructure persistence models.

### Mapping Rule

Mappings are one-directional adapters:

```text
Persistence record
      ⇄
Domain Aggregate or record
```

ORM entities and database row types remain private to Infrastructure.

### Transaction Rule

Infrastructure implements transaction abstractions defined by Application.

Application controls which use-case operation requires a transaction.

Infrastructure controls the technical transaction mechanism.

---

## Notion

### Allowed Imports

* Application.
* Core public types when necessary.
* Shared.
* Config.
* Official Notion SDK.
* Approved technical dependencies specific to Notion communication.

### Prohibited Imports

* Infrastructure.
* AI Providers.
* Applications.
* ORM or database libraries.
* CLI rendering.
* Domain repository implementations.
* Snapshot storage implementations.

### Core Dependency Restriction

Notion should prefer Application integration contracts and intermediate source structures.

Direct Core imports are allowed only for stable public concepts such as:

* Source reference types.
* Approved source identifiers.
* Domain-safe normalized primitive contracts.

Notion must not construct or mutate Aggregate Roots unless the application contract explicitly requires a domain factory and the dependency remains justified.

### Transport Boundary Rule

Notion SDK types must remain within the Notion package.

They must not appear in:

* Application port method signatures.
* Core models.
* CLI outputs.
* Persistence models.
* Public cross-package events.

---

## AI Providers

### Version 1 Rule

No production dependency may import AI Providers in version 1.

The package remains reserved.

### Future Direction

When activated, AI Providers may implement Application ports but must not be imported by Application or Core.

---

## Testing

### Allowed Imports

Testing may import approved public APIs from production packages.

It may also provide contract-test suites consumed by adapter tests.

### Prohibited Runtime Dependency

No production package may list Testing under:

* `dependencies`.
* `peerDependencies`.
* `optionalDependencies`.

Testing may appear only under `devDependencies`.

### Private Implementation Rule

Testing should avoid deep imports into private production files.

Tests should normally exercise public module or package behavior.

A narrowly scoped internal unit test may be colocated inside the owning package without exposing private code through Testing.

---

# Application Dependency Rules

## CLI

### Direct Imports Allowed

The CLI composition root may import:

* Config loader.
* Infrastructure adapter factories.
* Notion adapter factory.
* Application use cases.
* Shared and Core public types needed for output mapping.

CLI commands should import:

* Application use-case contracts.
* CLI-local rendering and exit-code utilities.

### Direct Imports Prohibited in Commands

CLI command handlers must not import:

* PostgreSQL repositories.
* Database clients.
* Notion SDK.
* Snapshot file-system implementation.
* Domain Aggregate constructors for state-changing behavior.
* Environment variables.

### Flow

```text
CLI command
   ↓
Application use case
   ↓
Application ports
   ↓
Injected adapters
```

Not:

```text
CLI command
   ↓
Database or Notion directly
```

## API

When implemented, the same rules apply:

```text
Route
  ↓
Application use case
  ↓
Ports and adapters
```

Routes must not access repositories directly.

## Worker

Worker job handlers invoke use cases.

They must not duplicate orchestration already implemented in Application.

---

# TypeScript Project Reference Rules

## Reference Direction

A TypeScript project reference must follow the approved dependency graph.

Examples:

```json
{
  "references": [
    { "path": "../shared" },
    { "path": "../core" }
  ]
}
```

is valid for Application.

The following would be invalid for Core:

```json
{
  "references": [
    { "path": "../infrastructure" }
  ]
}
```

## Reference and Package Dependency Consistency

When package A imports package B:

1. A must declare B in `package.json`.
2. A should reference B in `tsconfig.json` when project references are used.
3. The dependency must be approved by this document.
4. B must expose the imported symbol through an approved export.

A TypeScript path alias must not hide an invalid dependency.

## Root Build Graph

The root `tsconfig.json` should list buildable packages and applications.

The reference order does not grant permission.

Permission comes from the dependency graph.

---

# `package.json` Dependency Rules

## Internal Runtime Dependency

Use:

```json
{
  "dependencies": {
    "@ai-playbook-engine/core": "workspace:*"
  }
}
```

when production code imports that package.

## Internal Test-Only Dependency

Use:

```json
{
  "devDependencies": {
    "@ai-playbook-engine/testing": "workspace:*"
  }
}
```

when only test code imports Testing.

## Root Dependencies

The workspace root should contain only:

* Shared development tooling.
* Monorepo-wide build tooling.
* Formatting, linting and testing tools.
* Tools intentionally executed from the root.

Runtime dependencies must live in the package that uses them.

## No Phantom Dependencies

A package must not import a library simply because it exists in the root `node_modules`.

Every external import must have a matching declaration in the consuming workspace.

---

# Public Export Rules

## Root Exports

Every package exposes its approved public surface through its `exports` map.

Example:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

## Deep Imports

Unapproved deep imports are prohibited:

```typescript
import { Playbook } from '@ai-playbook-engine/core/src/playbook/playbook.js';
```

Approved:

```typescript
import { Playbook } from '@ai-playbook-engine/core';
```

## Subpath Exports

Subpath exports may be introduced when package size justifies them.

Example:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./playbook": {
      "types": "./dist/playbook/index.d.ts",
      "import": "./dist/playbook/index.js"
    }
  }
}
```

Subpath exports must be:

* Intentional.
* Documented.
* Stable enough for consumers.
* Free from private implementation leakage.

---

# Type-Only Imports

TypeScript type-only imports should be used when the import is not required at runtime.

Example:

```typescript
import type { PlaybookRepository } from './ports/playbook-repository.js';
```

Benefits:

* Clarifies dependency intent.
* Reduces accidental runtime coupling.
* Works with `verbatimModuleSyntax`.
* Makes architecture analysis easier.

Type-only syntax does not make a prohibited package dependency valid.

---

# Module Boundaries Inside Core

Core is one package but contains several domain modules.

Initial modules:

```text
workspace
playbook
playbook-source
synchronization
playbook-version
knowledge
validation
```

## Allowed Conceptual Direction

```text
workspace

playbook
  └── workspace identity

playbook-source
  ├── workspace identity
  └── playbook identity

synchronization
  ├── workspace identity
  └── playbook-source identity

playbook-version
  ├── workspace identity
  ├── playbook identity
  └── snapshot identity

knowledge
  ├── workspace identity
  ├── playbook identity
  └── playbook-version identity

validation
  ├── playbook-version public contracts
  └── knowledge public contracts
```

## Identity Dependency

Modules may depend on another module's public identifier without depending on its Aggregate implementation.

For example, Synchronization may use `PlaybookSourceId` but should not need to import and hold a complete `PlaybookSource` Aggregate.

## Aggregate Independence

Aggregate Roots must not contain live references to Aggregate Roots from other modules.

Use identifiers:

```typescript
playbookId: PlaybookId;
```

Avoid:

```typescript
playbook: Playbook;
```

unless the concept is inside the same Aggregate boundary.

---

# Module Boundaries Inside Application

Application use cases should be grouped by capability.

Candidate modules:

```text
workspace
playbooks
sources
synchronization
snapshots
versions
knowledge
validation
```

## Cross-Module Coordination

A higher-level Application service may coordinate several module contracts.

Example ingestion flow:

```text
Synchronization use case
        ↓
Snapshot use case
        ↓
Version use case
        ↓
Normalization use case
        ↓
Validation use case
```

This coordination must not cause lower-level modules to import higher-level orchestration.

## Shared Application Ports

Ports used by several modules may live in:

```text
application/src/ports/
```

Module-specific repository contracts should remain close to their owning module unless they are genuinely shared.

---

# Dependency Inversion Examples

## Repository

Application defines:

```typescript
export interface PlaybookRepository {
  findById(...): Promise<...>;
  save(...): Promise<void>;
}
```

Infrastructure implements:

```typescript
export class PostgresPlaybookRepository implements PlaybookRepository {
  // ...
}
```

Composition root injects:

```typescript
const useCase = new RenamePlaybook(postgresPlaybookRepository);
```

## Notion Source

Application defines:

```typescript
export interface PlaybookSourceGateway {
  verifyConnection(...): Promise<...>;
  retrieveSnapshot(...): Promise<...>;
}
```

Notion implements:

```typescript
export class NotionPlaybookSourceGateway implements PlaybookSourceGateway {
  // ...
}
```

Application never imports the Notion implementation.

## Snapshot Storage

Application defines:

```typescript
export interface SnapshotStorage {
  put(...): Promise<StorageReference>;
  get(...): Promise<...>;
}
```

Infrastructure implements local file storage.

A future object-storage package may implement the same port.

---

# Cross-Package Data Rules

## Domain Objects

Core domain objects may cross into Application.

They should not cross directly into:

* CLI output.
* HTTP output.
* Database records.
* Notion transport contracts.

Delivery and infrastructure layers should map them.

## Application DTOs

Application input and output types may cross into delivery applications.

They must remain:

* Transport-independent.
* ORM-independent.
* Notion-independent.
* Safe for intended consumers.

## External DTOs

Notion SDK objects remain in Notion.

Database row types remain in Infrastructure.

CLI render models remain in CLI.

## Errors

External technical errors must be translated before crossing package boundaries.

Examples:

```text
Notion API error
  ↓
Playbook source integration error
  ↓
Application error
  ↓
CLI exit code and message
```

The CLI must not receive raw Notion SDK exceptions as expected application outcomes.

---

# Runtime Dependency Versus Construction Dependency

A composition root may import several concrete packages.

That does not allow those packages to import each other.

Example:

```text
CLI composition root imports:
- Application
- Infrastructure
- Notion
- Config
```

Infrastructure and Notion remain independent sibling adapters.

They interact only because the composition root injects both into Application use cases.

---

# Test Dependency Rules

## Unit Tests

A package's unit tests may import:

* The package under test.
* Shared test support.
* Testing package as a development dependency.
* Approved assertion and test libraries.

## Integration Tests

Infrastructure integration tests may import:

* Infrastructure.
* Application contracts.
* Core public types.
* Testing helpers.
* Test database utilities.

Notion integration tests may import:

* Notion package.
* Application port contracts.
* Testing fixtures and fake HTTP boundaries.

## End-to-End Tests

End-to-end tests may invoke the CLI application as a user would.

They should avoid bypassing delivery paths unless setup requires direct fixture preparation.

## Production Isolation

A production build must not require Testing.

Architecture checks should fail if production source files import Testing.

---

# Forbidden Dependency Examples

The following imports are prohibited.

## Core importing Infrastructure

```typescript
import { PostgresPlaybookRepository } from '@ai-playbook-engine/infrastructure';
```

## Core importing Config

```typescript
import { env } from '@ai-playbook-engine/config';
```

## Application importing Notion

```typescript
import { Client } from '@notionhq/client';
```

## Application importing Infrastructure

```typescript
import { LocalSnapshotStorage } from '@ai-playbook-engine/infrastructure';
```

## Notion importing Infrastructure

```typescript
import { PostgresSynchronizationRunRepository } from '@ai-playbook-engine/infrastructure';
```

## CLI command querying database directly

```typescript
import { database } from '@ai-playbook-engine/infrastructure';
```

## Production importing Testing

```typescript
import { fakeClock } from '@ai-playbook-engine/testing';
```

## Deep import

```typescript
import { PlaybookName } from '@ai-playbook-engine/core/src/playbook/playbook-name.js';
```

---

# Architecture Enforcement

The dependency rules will be enforced progressively.

## Stage 1 — Package Metadata

* Explicit `package.json` dependencies.
* pnpm workspace resolution.
* TypeScript project references.
* Controlled package exports.

## Stage 2 — ESLint Restrictions

Add restrictions for:

* Forbidden internal package imports.
* Application-layer framework imports.
* Core-layer technical imports.
* Production imports from Testing.
* Deep imports into internal package paths.

## Stage 3 — Architecture Tests

Add automated tests that inspect:

* Import graphs.
* Package dependency direction.
* Forbidden libraries by package.
* Public export boundaries.
* Core independence.
* Application independence from adapters.

## Stage 4 — CI

CI must run:

```text
format check
lint
typecheck
unit tests
integration tests
architecture tests
build
```

No architecture violation may be accepted solely because the code compiles.

---

# Temporary Exceptions

Temporary architecture exceptions are discouraged.

When unavoidable, they require:

* Exact package and import involved.
* Reason.
* Risk.
* Expiration condition.
* Tracking issue.
* Explicit approval.

An exception must not be hidden through:

* ESLint disable comments.
* TypeScript path aliases.
* Dynamic imports.
* Re-exporting forbidden dependencies through another package.
* Moving a type to Shared without domain justification.

---

# Dependency Review Checklist

Before adding an internal dependency, verify:

1. Does the consumer truly need the provider package?
2. Is the direction approved?
3. Could dependency inversion avoid the direct import?
4. Is the imported concept part of the provider's public API?
5. Does the dependency create a cycle?
6. Does it introduce framework knowledge into a stable layer?
7. Is it declared in `package.json`?
8. Is the TypeScript reference correct?
9. Is the dependency needed at runtime or only in tests?
10. Can an Application port represent the requirement instead?

---

# Version 1 Rules

During version 1:

* CLI is the only active delivery application.
* API and Worker must not create new runtime dependencies.
* AI Providers remains unused by production code.
* Core contains only the ingestion-domain modules.
* Application defines all repository and external source ports.
* Infrastructure implements persistence and local storage ports.
* Notion implements the external Playbook Source port.
* CLI composes the system.
* Testing remains development-only.
* No package may depend on future modules to anticipate later work.

---

# Approved Dependency Summary

```text
shared
  ↑
core
  ↑
application
  ↑          ↑
infrastructure   notion
       ↑          ↑
       └──── cli ─┘
```

Config supplies validated runtime values to composition and adapters but remains independent from Core and Application.

Testing may support all packages in test code but must never become a runtime dependency.

This graph is the approved source dependency direction for version 1.
