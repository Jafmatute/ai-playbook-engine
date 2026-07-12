# AI Playbook Engine — Module Catalog

## Purpose

This document maps the functional contexts of AI Playbook Engine to the initial modules of the modular monolith.

The catalog is architectural.

It does not define final TypeScript folder names, entities, tables or API routes.

## Module principles

Each module must:

- Own a clear business responsibility.
- Expose explicit application contracts.
- Hide internal implementation details.
- Avoid direct access to another module's repositories.
- Avoid importing another module's internal entities.
- Communicate through use cases, public contracts or events.
- Preserve workspace ownership where applicable.

## Initial modules

### Workspaces

Context:

- Workspace Management.

Responsibilities:

- Represent the current workspace.
- Provide workspace identifiers.
- Associate tenant-owned records.
- Prepare the architecture for future organizations.

Initial scope:

- One default personal workspace.
- No authentication.
- No roles.
- No billing.
- No team membership.

Future scope:

- Organizations.
- Members.
- Roles.
- Invitations.
- Tenant-level configuration.

### Playbooks

Context:

- Playbook Management.

Responsibilities:

- Register Playbook sources.
- Maintain Playbook identity.
- Create Playbook versions.
- Track version state.
- Define the active version.
- Preserve source metadata.

Expected public operations:

- Register a Playbook.
- Create a version from a synchronization snapshot.
- Validate version eligibility.
- Publish a version.
- Archive a version.
- Obtain the active version.

### Synchronization

Context:

- Playbook Sync.

Responsibilities:

- Configure external synchronization sources.
- Retrieve source content.
- Store raw snapshots.
- Detect changes.
- Track synchronization runs.
- Report synchronization failures.

Expected public operations:

- Start synchronization.
- Obtain synchronization status.
- Retrieve a synchronization run.
- Retry a failed synchronization.
- Compare synchronization snapshots.

Notion will be the first adapter, but the module must not assume that all future Playbook sources are Notion.

### Knowledge

Context:

- Knowledge Management.

Responsibilities:

- Normalize source content.
- Validate Playbook structure.
- Build executable knowledge records.
- Classify knowledge items.
- Resolve internal references.
- Query knowledge by version and type.

Initial knowledge categories may include:

- Methodologies.
- Workflows.
- Prompt definitions.
- Audit definitions.
- Decision matrices.
- Criteria.
- Experiments.
- Case studies.
- Model guidance.

The final taxonomy will be defined during domain modeling.

### Projects

Context:

- Project Context.

Responsibilities:

- Register analysis targets.
- Represent repository or directory metadata.
- Create immutable project snapshots.
- Reference project files and artifacts.
- Provide execution input context.

Expected public operations:

- Register a project.
- Create a project snapshot.
- List snapshot artifacts.
- Retrieve project context.
- Archive a project.

### Executions

Context:

- Execution Engine.

Responsibilities:

- Create execution requests.
- Resolve required knowledge.
- Build execution plans.
- Execute workflow steps.
- Track state transitions.
- Record inputs and outputs.
- Handle cancellation and failure.
- Produce final execution results.

Expected public operations:

- Start an execution.
- Retrieve execution status.
- Cancel an execution.
- Resume a resumable execution.
- Retrieve execution results.

### Audits

Context:

- Audit Management.

Responsibilities:

- Create audits.
- Select audit definitions.
- Evaluate criteria.
- Record evidence.
- Produce findings.
- Summarize audit status.
- Track finding resolution.

Expected public operations:

- Start an audit.
- Retrieve audit results.
- List findings.
- Update finding status.
- Export an audit report.

### Decisions

Context:

- Decision Support.

Responsibilities:

- Evaluate decision inputs.
- Apply matrices and criteria.
- Rank alternatives.
- Produce recommendations.
- Preserve decision evidence.
- Explain decision outcomes.

Expected public operations:

- Request a decision.
- Retrieve a recommendation.
- Compare alternatives.
- Retrieve decision evidence.

### AI Providers

Context:

- AI Gateway.

Responsibilities:

- Register provider adapters.
- Normalize AI requests.
- Normalize provider responses.
- Manage model metadata.
- Capture usage.
- Handle provider failures.

Expected public contracts:

- Generate text.
- Produce structured output.
- Evaluate content.
- Retrieve model capabilities.
- Estimate or report usage.

Provider credentials and vendor SDKs must remain outside the domain model.

### Reports

Context:

- Reporting and Traceability.

Responsibilities:

- Build execution reports.
- Build audit reports.
- Build decision reports.
- Query historical results.
- Produce exports.
- Support future dashboards.

Reports may use read models optimized for queries, but they must not alter authoritative domain records.

### Automations

Context:

- Automation.

Responsibilities:

- Define recurring jobs.
- Trigger application use cases.
- Track automation runs.
- Apply retry schedules.
- Disable failing automations.

Initial automation examples:

- Synchronize Notion.
- Validate the latest Playbook version.
- Execute a recurring project audit.
- Generate a periodic report.

## Supporting technical modules

The following packages support multiple business modules but are not independent business contexts.

### Config

Responsibilities:

- Load environment configuration.
- Validate runtime configuration.
- Expose typed configuration.
- Prevent direct environment access throughout the codebase.

### Infrastructure

Responsibilities:

- Database access.
- Repository implementations.
- Logging.
- File-system access.
- Queue implementations.
- Cache implementations.
- Runtime adapters.

### Shared

Responsibilities:

- Generic technical primitives.
- Base errors.
- Common identifiers.
- Result types.
- Time abstractions where appropriate.

Shared must not contain module-specific domain concepts.

### Testing

Responsibilities:

- Test builders.
- Fixtures.
- Fakes.
- Contract-test utilities.
- Integration-test support.

## Proposed module location

The business modules will initially live inside:

```text
packages/core/src/modules/
```

Proposed structure:

```text
packages/core/src/
├── modules/
│   ├── workspaces/
│   ├── playbooks/
│   ├── synchronization/
│   ├── knowledge/
│   ├── projects/
│   ├── executions/
│   ├── audits/
│   ├── decisions/
│   ├── reports/
│   └── automations/
│
├── application/
├── domain/
└── index.ts
```

This structure is provisional.

The final internal structure will be decided after defining the domain model and module boundaries in greater detail.

The `ai-providers` integration remains a separate package because it contains external adapters:

```text
packages/ai-providers/
```

The Notion adapter remains:

```text
packages/notion/
```

Persistence and technical adapters remain:

```text
packages/infrastructure/
```

## Module dependency guidance

Expected direction:

```text
workspaces
    ↑
playbooks
    ↑
knowledge
    ↑
executions
   ↙   ↘
audits  decisions
```

Projects may provide context to executions:

```text
projects → executions
```

Reports consume public result contracts:

```text
executions → reports
audits → reports
decisions → reports
```

Automations invoke application use cases:

```text
automations → synchronization
automations → executions
automations → audits
automations → reports
```

This diagram does not authorize direct entity or repository access between modules.

## Deferred modules

The following modules are intentionally deferred:

- Identity.
- Authentication.
- Authorization.
- Organizations.
- Billing.
- Subscriptions.
- Notifications.
- Web administration.
- Marketplace.
- Collaboration.

Workspace compatibility will be introduced without implementing these complete SaaS capabilities.

## Module creation rule

A new module may only be introduced when:

1. It owns a distinct business responsibility.
2. Existing modules cannot own that responsibility without losing cohesion.
3. Its boundaries can be clearly described.
4. Its public contracts can be identified.
5. The decision is documented.

Folders must not be created solely because a technical concept has a different name.
