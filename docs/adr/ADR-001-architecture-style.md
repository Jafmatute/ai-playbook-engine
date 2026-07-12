# ADR-001: Architectural Style

## Status

Accepted

## Context

AI Playbook Engine will begin as a personal system but must preserve a clear
path toward becoming a multi-tenant SaaS product.

The system will consume the AI Engineering Playbook from Notion, normalize its
content, execute workflows and decisions, expose an API, provide a CLI and run
background automation.

Starting with microservices would introduce deployment, networking,
observability and data-consistency complexity before those capabilities are
needed.

## Decision

AI Playbook Engine will use a modular monolith architecture.

The internal design will follow:

- Clean Architecture.
- Ports and Adapters.
- Pragmatic Domain-Driven Design.
- Explicit module boundaries.
- Dependency inversion.
- Framework-independent domain logic.

The repository will use a pnpm workspace with separate applications and
packages.

Initial applications:

- API.
- CLI.
- Worker.

Initial packages:

- Core.
- Infrastructure.
- Notion.
- AI providers.
- Configuration.
- Shared utilities.
- Testing utilities.

## Consequences

### Positive

- Lower operational complexity.
- Clear boundaries between business logic and external systems.
- Shared domain logic across API, CLI and workers.
- Easier automated testing.
- Future modules may be extracted into services when justified.

### Negative

- Module boundaries must be enforced through conventions and tests.
- A modular monolith can become tightly coupled if dependencies are not
  controlled.
- Some infrastructure will initially be shared by several modules.

## Rules

- Domain code must not import infrastructure packages.
- Provider SDKs must remain behind application ports.
- Notion data must be normalized before entering the domain.
- API and CLI are delivery mechanisms, not locations for business logic.
- Cross-module communication must use explicit contracts.
- Microservices will not be introduced without a separate ADR.
