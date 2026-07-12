# ADR-002: Package Dependency Rules

## Status

Accepted

## Context

AI Playbook Engine is organized as a modular monorepo with applications and reusable packages.

Without explicit dependency rules, the codebase could gradually introduce circular dependencies, framework coupling and business logic inside delivery or infrastructure layers.

The project must preserve a domain core that can be reused by the API, CLI, worker and future SaaS interfaces.

## Decision

The repository will enforce a directed dependency model.

Allowed dependency direction:

```text
apps
  ↓
config
  ↓
infrastructure adapters
  ↓
core
  ↓
shared
```

External integration packages such as Notion and AI providers will implement ports defined by the core or application layer.

## Package responsibilities

### shared

Contains small, domain-independent primitives and utilities.

Examples:

- Generic result types.
- Base error types.
- Identifiers.
- Date abstractions.
- Serialization helpers.

Rules:

- Must not depend on any other internal package.
- Must not contain business rules.
- Must not become a miscellaneous utility container.

### core

Contains the business domain and application behavior.

Examples:

- Entities.
- Value objects.
- Domain services.
- Use cases.
- Application ports.
- Domain events.
- Business policies.

Rules:

- May depend on shared.
- Must not depend on infrastructure.
- Must not depend on Notion.
- Must not depend on AI provider SDKs.
- Must not depend on Fastify, Commander, Prisma or other frameworks.
- Must not read environment variables directly.

### config

Contains validated application configuration.

Examples:

- Environment variable schemas.
- Runtime configuration.
- Provider configuration.
- Database configuration.

Rules:

- May depend on shared.
- Must not contain business logic.
- Must not expose raw environment variables to the domain.
- Applications and infrastructure packages may depend on config.

### infrastructure

Contains technical implementations of ports.

Examples:

- Database repositories.
- File system access.
- Logging implementations.
- Cache implementations.
- Queue implementations.

Rules:

- May depend on core, shared and config.
- Must implement contracts defined by core.
- Must not define business rules.
- Must not be imported by core.

### notion

Contains the Notion integration adapter.

Examples:

- Notion API client.
- Page and database readers.
- Block retrieval.
- Rate-limit handling.
- Mapping from Notion structures to internal data structures.
- Synchronization support.

Rules:

- May depend on core, shared and config.
- Must not expose Notion SDK types to core.
- Must translate external Notion structures before passing data into the application layer.
- Must not contain Playbook business policies.

### ai-providers

Contains adapters for external AI providers.

Examples:

- OpenAI.
- Anthropic.
- Google.
- Local models.
- Future providers.

Rules:

- May depend on core, shared and config.
- Must implement provider-neutral ports defined by core.
- Must not expose vendor SDK types to core.
- Model selection policies belong in core, not in provider adapters.

### apps/api

HTTP delivery mechanism.

Rules:

- May depend on core, config and infrastructure adapters.
- Must not contain business rules.
- Controllers must delegate behavior to application use cases.
- HTTP schemas must be mapped to application inputs and outputs.
- Framework-specific types must not enter core.

### apps/cli

Command-line delivery mechanism.

Rules:

- May depend on core, config and infrastructure adapters.
- Must not contain business rules.
- Commands must delegate behavior to application use cases.
- CLI formatting must remain separate from domain output.

### apps/worker

Background execution mechanism.

Rules:

- May depend on core, config and infrastructure adapters.
- Must not contain business rules.
- Jobs must invoke application use cases.
- Retry and scheduling behavior belong to infrastructure or application orchestration.

## Allowed dependencies

```text
shared → external libraries with no framework coupling

core → shared

config → shared

infrastructure → core, shared, config

notion → core, shared, config

ai-providers → core, shared, config

apps → core, shared, config, infrastructure, notion, ai-providers
```

## Forbidden dependencies

```text
shared → core
shared → config
shared → infrastructure

core → config
core → infrastructure
core → notion
core → ai-providers
core → apps

config → core
config → infrastructure
config → apps

infrastructure → apps

notion → apps
ai-providers → apps
```

## Cross-module communication

Modules must communicate through explicit contracts.

Preferred mechanisms:

- Application service interfaces.
- Use-case inputs and outputs.
- Domain events.
- Integration events when asynchronous communication is justified.

Direct access to another module's internal entities, repositories or implementation details is prohibited.

## External data rule

Data from external systems is considered untrusted.

Before entering the domain, it must be:

1. Retrieved by an adapter.
2. Validated.
3. Normalized.
4. Mapped to internal types.
5. Passed to an application use case.

This rule applies to:

- Notion.
- AI providers.
- HTTP requests.
- CLI input.
- Files.
- Databases.
- Webhooks.
- Future integrations.

## Consequences

### Positive

- Business logic remains independent from frameworks.
- API, CLI and worker can reuse the same use cases.
- External providers can be replaced.
- Testing becomes simpler.
- Migration toward SaaS remains possible.
- Dependency direction is predictable.

### Negative

- Additional mapping code is required.
- More interfaces and boundaries must be maintained.
- Small features may require changes across several layers.
- Architecture rules must be verified continuously.

## Enforcement

The rules will be enforced through:

- Package-level dependencies.
- TypeScript project references.
- ESLint import restrictions.
- Architecture tests.
- Code review.
- Additional ADRs when dependency rules change.

Any exception requires a new architectural decision record.
