# AI Playbook Engine — Context Map

## Purpose

This document defines the initial functional contexts of AI Playbook Engine and the relationships between them.

The contexts represent conceptual boundaries.

They do not imply:

- Separate services.
- Separate databases.
- Independent deployments.
- Microservices.

The initial implementation remains a modular monolith.

## Context map

```text
┌───────────────────────────────────────────────────────────┐
│                    External Systems                       │
│                                                           │
│  Notion        AI Providers        Git Repositories       │
│     │                │                    │                │
└─────┼────────────────┼────────────────────┼────────────────┘
      │                │                    │
      ▼                ▼                    ▼
┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐
│ Playbook Sync │ │ AI Gateway    │ │ Project Inspection  │
└───────┬───────┘ └───────┬───────┘ └──────────┬──────────┘
        │                 │                    │
        ▼                 │                    ▼
┌───────────────┐         │          ┌─────────────────────┐
│ Playbook      │         │          │ Project Context     │
│ Management    │         │          └──────────┬──────────┘
└───────┬───────┘         │                     │
        ▼                 │                     │
┌───────────────┐         │                     │
│ Knowledge     │◄────────┼─────────────────────┘
│ Management    │         │
└───────┬───────┘         │
        │                 │
        ▼                 ▼
┌───────────────────────────────────────────────────────────┐
│                   Execution Engine                        │
└───────────────┬─────────────────────┬─────────────────────┘
                │                     │
                ▼                     ▼
      ┌─────────────────┐   ┌─────────────────────┐
      │ Audit Management│   │ Decision Support    │
      └────────┬────────┘   └──────────┬──────────┘
               │                       │
               └───────────┬───────────┘
                           ▼
                 ┌─────────────────────┐
                 │ Reporting and       │
                 │ Traceability        │
                 └─────────────────────┘
```

## Contexts

### Workspace Management

Defines ownership and isolation boundaries.

Initial responsibilities:

- Represent the personal workspace.
- Associate tenant-owned records with a workspace.
- Provide a migration path toward organizations and multi-tenancy.

The first version does not require complete user, role or billing functionality.

### Playbook Sync

Responsible for communicating with Notion and retrieving source content.

Responsibilities:

- Connect to Notion.
- Read configured pages and databases.
- Retrieve blocks and properties.
- Track synchronization cursors and timestamps.
- Handle pagination and rate limits.
- Produce raw synchronization snapshots.
- Detect additions, updates and deletions.

This context understands Notion structures but does not define Playbook business meaning.

### Playbook Management

Responsible for the lifecycle of synchronized Playbook versions.

Responsibilities:

- Register Playbook sources.
- Create synchronization snapshots.
- Create immutable Playbook versions.
- Track active and archived versions.
- Preserve source references.
- Manage publication state.
- Prevent incomplete versions from becoming executable.

This context does not execute audits or AI workflows.

### Knowledge Management

Responsible for transforming Playbook content into structured, executable knowledge.

Responsibilities:

- Normalize synchronized content.
- Validate required structures.
- Classify Playbook entries.
- Build relationships between methodologies, workflows, criteria and prompts.
- Provide queries over the normalized knowledge.
- Preserve references to the originating Playbook version.

This context must not depend on Notion-specific types.

### Project Context

Responsible for representing the target being analyzed.

Possible targets:

- A source-code repository.
- A local project directory.
- A document.
- A software architecture description.
- A set of requirements.
- A pull request or change set.

Responsibilities:

- Register projects.
- Capture project metadata.
- Build analysis snapshots.
- Represent files and artifacts relevant to an execution.
- Provide a stable input reference for reproducibility.

Project inspection adapters may gather data, but this context owns the internal representation.

### Execution Engine

Responsible for orchestrating executable Playbook workflows.

Responsibilities:

- Select a Playbook version.
- Load the required knowledge.
- Validate execution inputs.
- Build execution plans.
- Invoke deterministic steps.
- Request AI-assisted steps through provider-neutral ports.
- Track step state.
- Handle failures and retries according to policy.
- Produce an execution result.

The Execution Engine coordinates behavior but does not own vendor-specific AI communication.

### Audit Management

Responsible for evaluating a target against Playbook audit definitions and criteria.

Responsibilities:

- Create audit requests.
- Select audit definitions.
- Evaluate criteria.
- Record evidence.
- Produce findings.
- Assign severity and status.
- Generate audit summaries.
- Preserve reproducibility information.

An audit may use the Execution Engine to perform its steps.

### Decision Support

Responsible for applying Playbook decision criteria.

Responsibilities:

- Evaluate decision matrices.
- Recommend models, providers, workflows or strategies.
- Explain the criteria used.
- Record selected alternatives.
- Record rejected alternatives when required.
- Preserve the Playbook version used for the decision.

This context must distinguish between deterministic rules and AI-generated recommendations.

### AI Gateway

Responsible for communication with AI providers.

Responsibilities:

- Implement provider-neutral interfaces.
- Translate internal requests to vendor requests.
- Normalize provider responses.
- Track token and usage metadata.
- Apply timeouts and retry policies.
- Handle provider errors.
- Support model capability metadata.

This context does not own model-selection policy.

### Reporting and Traceability

Responsible for historical visibility and reproducibility.

Responsibilities:

- Record execution history.
- Record audit results.
- Record decision outcomes.
- Record Playbook versions used.
- Record models and providers used.
- Record timings, errors and usage.
- Produce reports and exports.
- Support later observability and cost analysis.

This context consumes results from other contexts but must not redefine their business rules.

### Automation

Responsible for scheduled and event-driven invocation.

Responsibilities:

- Schedule synchronization jobs.
- Trigger audits.
- Trigger validations.
- Run recurring executions.
- Coordinate retries.
- Process pending work.
- Invoke application use cases.

Automation must not contain Playbook or audit business logic.

## Relationship types

### Playbook Sync → Playbook Management

Playbook Sync supplies raw synchronization snapshots.

Playbook Management decides whether those snapshots may become registered Playbook versions.

### Playbook Management → Knowledge Management

Playbook Management supplies an immutable Playbook version.

Knowledge Management validates and transforms it into normalized knowledge.

### Knowledge Management → Execution Engine

The Execution Engine queries structured workflows, prompts, criteria and policies.

### Project Context → Execution Engine

Project Context provides stable information about the target of an execution.

### Execution Engine → AI Gateway

The Execution Engine submits provider-neutral AI requests.

The AI Gateway returns normalized responses.

### Execution Engine → Audit Management

Audit workflows use executions to evaluate audit criteria.

### Knowledge Management → Decision Support

Decision Support loads decision matrices and selection criteria from normalized knowledge.

### Audit Management → Reporting and Traceability

Audit results and findings are recorded for historical access.

### Decision Support → Reporting and Traceability

Decision outcomes and reasoning references are recorded.

### Automation → Application use cases

Automation invokes public application use cases.

It must not access repositories or internal entities directly.

## Ownership rules

Each concept must have one authoritative context.

Examples:

| Concept                       | Owning context       |
| ----------------------------- | -------------------- |
| Notion synchronization cursor | Playbook Sync        |
| Playbook version              | Playbook Management  |
| Normalized workflow           | Knowledge Management |
| Project snapshot              | Project Context      |
| Execution                     | Execution Engine     |
| Audit finding                 | Audit Management     |
| Model recommendation          | Decision Support     |
| Provider response metadata    | AI Gateway           |
| Scheduled job                 | Automation           |

Other contexts may reference these concepts through identifiers and contracts but must not redefine them.

## Initial implementation order

The contexts will not all be implemented simultaneously.

The intended sequence is:

1. Workspace Management foundation.
2. Playbook Management.
3. Playbook Sync.
4. Knowledge Management.
5. Project Context.
6. Execution Engine.
7. Audit Management.
8. Decision Support.
9. AI Gateway.
10. Reporting and Traceability.
11. Automation.

The sequence may be refined through architectural decisions, but phases must not be skipped.
