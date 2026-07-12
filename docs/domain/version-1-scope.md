# AI Playbook Engine — Version 1 Functional Scope

## Purpose

This document defines the approved functional scope of AI Playbook Engine version 1.

Version 1 must validate the core product hypothesis:

> The Engine can reliably retrieve the AI Engineering Playbook from Notion, preserve its source state, transform it into versioned internal knowledge and make that knowledge available through a local CLI.

The purpose of version 1 is not to deliver the complete long-term platform.

It must establish a reliable foundation for:

- Playbook synchronization.
- Content normalization.
- Versioning.
- Validation.
- Publication.
- Knowledge queries.
- Traceability.
- Future execution and audit capabilities.

Anything not explicitly included in this document is outside the committed version 1 scope unless a later approved decision modifies it.

---

# Version 1 Product Goal

A user must be able to:

1. Configure a personal Workspace.
2. Register an internal Playbook.
3. Connect the Playbook to its Notion source.
4. Verify access to that source.
5. Synchronize the configured Notion content.
6. Preserve an immutable Synchronization Snapshot.
7. Create a Draft Playbook Version from the snapshot.
8. Normalize supported Playbook content.
9. Validate the normalized content.
10. Publish a valid Playbook Version.
11. Activate a Published version.
12. Query its normalized knowledge through the CLI.
13. Inspect synchronization, version and validation history.
14. Reproduce which source snapshot produced each version.

This flow is the first complete vertical slice of the Engine.

---

# Version 1 Runtime Model

Version 1 will run as a personal local system.

Initial runtime components:

- CLI.
- Core domain and application layer.
- Notion integration adapter.
- Local persistence backed by PostgreSQL.
- Local artifact or snapshot storage.
- Configuration through validated environment variables and configuration files.
- Structured logging.

The API and worker boundaries may remain present in the repository, but they are not required to expose complete functionality in the first release.

Long-running processes may initially execute through the CLI process when this does not compromise correctness or recovery.

A durable background queue is not required for version 1.

---

# Included Modules

## Workspaces

Included capabilities:

- Initialize one personal Workspace.
- Resolve the current Workspace centrally.
- Retrieve basic Workspace information.
- Prevent use of an unavailable or archived Workspace.

Not included:

- Multiple Workspace selection.
- Workspace membership.
- Workspace transfer.
- Workspace administration UI.
- Tenant provisioning.

## Playbooks

Included capabilities:

- Register a Playbook.
- List Playbooks.
- Retrieve Playbook details.
- Rename a Playbook.
- Archive and restore a Playbook.
- Activate a Published Playbook Version.
- Retrieve the active Playbook Version.
- Clear the active version through an explicit operation.

Initial constraint:

- The personal installation may contain multiple Playbooks.
- Each Playbook belongs to the personal Workspace.
- Only one version may be active per Playbook.

## Playbook Sources

Included capabilities:

- Register Notion sources for a Playbook while preserving source history.
- Retrieve source configuration without exposing credentials.
- Update editable source metadata.
- Enable or disable the source.
- Verify Notion access and root object availability.
- Record the last successful and last failed synchronization metadata.

Initial constraint:

- A Playbook may have multiple historical Notion sources, with at most one Enabled source.
- A Playbook Version is produced from exactly one source and one Synchronization Snapshot.
- Disabled sources remain queryable, and source replacement does not modify historical snapshots or versions.

Not included:

- Multiple sources merged into one version.
- Non-Notion Playbook sources.
- Automatic source discovery.
- Notion write-back.

## Synchronization

Included capabilities:

- Start a Synchronization Run.
- Prevent concurrent active runs for the same source.
- Retrieve relevant Notion pages, databases and blocks.
- Handle API pagination.
- Handle bounded retries for transient Notion failures.
- Track run state and timestamps.
- Record retrieval counts and failure summaries.
- Create an immutable Synchronization Snapshot.
- Calculate a content checksum.
- List Synchronization Runs.
- Retrieve run details.
- Retry a failed run by creating a new run.
- Compare checksums between snapshots.
- Detect whether a retrieved snapshot is unchanged from the previous successful snapshot.

Initial execution model:

- Synchronization may run synchronously from the CLI.
- State transitions must still be persisted.
- A failed process must leave a recoverable historical record.

Included statuses:

- Pending.
- Running.
- Completed.
- Failed.

Cancellation is excluded from version 1: there is no cancellation use case or CLI command. Retries create a new Synchronization Run, and recovery may classify an unexpectedly interrupted Running run as Failed. Cancellation may be introduced later with a Worker, durable queue and cooperative cancellation.

Not included:

- Scheduled synchronization.
- Webhooks from Notion.
- Parallel synchronization.
- Distributed locking.
- Durable queues.
- Incremental block-level synchronization.
- Real-time synchronization.

## Synchronization Snapshots

Included capabilities:

- Store immutable snapshot metadata.
- Preserve source identifiers and timestamps.
- Preserve the raw source-aligned payload or a storage reference.
- Record checksum.
- Record parser compatibility metadata.
- Retrieve snapshot metadata.
- Retrieve raw snapshot content for controlled reprocessing.
- Associate one successful Synchronization Run with one snapshot.

Initial storage constraint:

- Snapshot payload storage may use the local file system.
- The database stores authoritative metadata and the storage reference.
- The storage abstraction must permit a future object-storage adapter.

Not included:

- Cloud object storage.
- Snapshot compression unless required by size.
- Snapshot retention policies.
- Snapshot deletion.
- Cross-Workspace snapshot sharing.

## Playbook Versions

Included capabilities:

- Create a Draft Playbook Version from a successful snapshot.
- Assign an internal monotonically increasing sequence within a Playbook.
- Associate the version with exactly one snapshot.
- Normalize supported content into internal knowledge.
- Store parser and normalization schema versions.
- Validate the version.
- Record validation findings.
- Mark the version Validated when validation has zero blocking findings.
- Mark the version Invalid when blocking validation fails.
- Publish a Validated version through a separate explicit operation.
- Archive a Validated, Published or Invalid version.
- List version history.
- Retrieve version details.
- Activate a Published version through the Playbook.

Included lifecycle:

- Draft.
- Validating.
- Validated.
- Invalid.
- Published.
- Archived.

Version numbering decision:

- Version 1 uses an internal positive integer sequence scoped to the Playbook.
- The sequence is an Engine identifier, not the same as the Playbook document version maintained in Notion.
- A human-readable label may be stored as optional metadata.
- Sequence numbers are never reused.

Not included:

- Editing a version after creation.
- Repairing Invalid versions in place.
- Semantic versioning.
- Branching versions.
- Merging versions.
- Restoring Archived versions.
- Multiple validation attempts that rewrite prior results.
- Draft execution.

Normalization uses its own attempt lifecycle: Pending, Running, Completed and Failed. A new version starts Draft with normalization Pending; validation requires Completed normalization. A failed attempt leaves the version Draft, retries preserve attempt history, and normalization cannot run after validation starts.

## Knowledge

Version 1 includes a deliberately limited knowledge taxonomy.

Supported Knowledge Types:

1. Section.
2. Methodology.
3. Workflow.
4. Prompt Definition.
5. Criterion.
6. Decision Matrix.
7. Audit Definition.
8. Reference Document.

These types are sufficient to preserve the structure of the existing AI Engineering Playbook while allowing later refinement.

### Section

Represents a structural grouping in the Playbook.

Examples:

- Objectives.
- Scope.
- Audit Types.
- Workflows.
- Prompt Library.
- Experiments.

A Section is organizational knowledge and may contain or reference other Knowledge Items.

### Methodology

Represents a defined engineering method or practice.

Version 1 captures:

- Title.
- Purpose.
- Description.
- Applicable context.
- Inputs.
- Outputs.
- Ordered guidance.
- References.

Version 1 does not execute Methodologies directly.

### Workflow

Represents a structured sequence of Playbook activities.

Version 1 captures:

- Title.
- Purpose.
- Preconditions.
- Ordered Step Definitions.
- Inputs.
- Outputs.
- References.

Version 1 stores Workflow Definitions but does not execute them.

### Prompt Definition

Represents reusable prompt knowledge.

Version 1 captures:

- Title.
- Purpose.
- Instruction content.
- Required variables when identifiable.
- Expected output description.
- Constraints.
- Related workflow or methodology references.

Version 1 does not invoke AI providers.

### Criterion

Represents one evaluation or selection rule.

Version 1 captures:

- Title.
- Description.
- Criterion category.
- Evaluation guidance.
- Optional weight.
- Optional blocking indicator.
- Related knowledge references.

Version 1 does not execute Criterion evaluation.

### Decision Matrix

Represents structured decision-support knowledge.

Version 1 captures:

- Title.
- Purpose.
- Alternatives or alternative categories.
- Criteria references.
- Weights when available.
- Constraints.
- Interpretation guidance.

Version 1 does not produce runtime Decisions.

### Audit Definition

Represents documented audit structure.

Version 1 captures:

- Title.
- Purpose.
- Scope.
- Applicable target description.
- Criteria references.
- Evidence guidance.
- Severity guidance.
- Completion guidance.

Version 1 does not run Audits.

### Reference Document

Represents supporting content that is useful but not yet modeled as a more specific executable type.

Examples:

- Case studies.
- Experiments.
- Notes.
- Examples.
- Technical guidance.
- Background documentation.

This type prevents loss of relevant Playbook content while avoiding premature domain specialization.

## Knowledge Item Common Data

Every Knowledge Item in version 1 must preserve:

- Deterministic version-specific KnowledgeItemId derived from PlaybookVersionId, SourceStableKey and identity strategy version.
- Workspace identity.
- Playbook identity.
- Playbook Version identity.
- Knowledge Type.
- Stable source key where available.
- Title.
- Normalized content.
- Source Reference.
- Parent or structural placement.
- Content checksum.
- Validation state.
- Creation timestamp.

Optional data may include:

- Slug.
- Tags.
- Display order.
- Related Knowledge Item identifiers.
- Source last-edited timestamp.
- Type-specific structured attributes.

Knowledge Items use one shared immutable model with a KnowledgeType discriminator and attributes specific to that type. They are not separate Aggregate Roots per Knowledge Type, and the domain model contains no Notion types. The same source concept in another version receives a different KnowledgeItemId; SourceStableKey supports correlation between versions. Titles and display order are not identity, and duplicate SourceStableKeys are blocking errors.

## Knowledge Relationships

Version 1 supports explicit directed relationships between Knowledge Items.

Initial relationship types:

- Contains.
- References.
- Implements.
- Uses.
- Evaluates.
- Supports.
- Related To.

Rules:

- Both items must belong to the same Playbook Version.
- Cross-version relationships are not supported.
- Missing required relationships may block publication.
- Unknown optional references produce non-blocking validation findings.
- Relationships must retain source traceability where they originate from Notion.

The relationship taxonomy may evolve after observing the real Playbook content.

## Knowledge Queries

Included CLI query capabilities:

- List Knowledge Items by Playbook Version.
- Filter by Knowledge Type.
- Retrieve one Knowledge Item.
- Search by title and normalized text.
- List relationships for an item.
- Retrieve Workflow Definitions.
- Retrieve Prompt Definitions.
- Retrieve Decision Matrices.
- Retrieve Audit Definitions.
- Show source traceability.

Initial search strategy:

- Deterministic database search.
- Case-insensitive title and text matching.
- Structural filters.

Not included:

- Embeddings.
- Vector search.
- Retrieval-augmented generation.
- Semantic ranking.
- AI-generated summaries.
- Knowledge graph visualization.

---

# Notion Integration Scope

## Supported Source Structures

Version 1 must support configured Notion roots that may contain:

- Pages.
- Child pages.
- Databases.
- Database records.
- Block hierarchies.
- Rich text.
- Headings.
- Paragraphs.
- Bulleted lists.
- Numbered lists.
- To-do items.
- Toggle blocks.
- Quotes.
- Callouts.
- Code blocks.
- Dividers.
- Tables when available through the API representation.
- Links and mentions required for internal references.

Unsupported block types must not crash synchronization.

They must be:

- Preserved as raw source data.
- Recorded as unsupported or partially supported.
- Reported through validation or synchronization diagnostics.

## Notion Mapping Strategy

The integration must maintain three representations:

1. Raw Notion API response or source-aligned snapshot data.
2. Parsed intermediate representation.
3. Internal normalized Knowledge Items.

Notion SDK types must not enter:

- Core domain entities.
- Application use-case contracts.
- Knowledge query results.
- CLI output models.

## Notion Credentials

Version 1 uses one Notion integration credential reference configured locally.

Rules:

- The credential value must come from validated runtime configuration or secret resolution.
- It must not be persisted in domain tables.
- It must not appear in logs.
- It must not be returned by CLI queries.
- Playbook Source stores only an opaque credential reference or configuration key.

## Notion Write Operations

Version 1 is read-only.

The Engine must not:

- Edit pages.
- Create pages.
- Update database records.
- Add comments.
- Modify properties.
- Change the editorial Playbook.

Any future write-back capability requires a separate architectural decision.

---

# Validation Scope

Version 1 validation has three levels.

## Source Validation

Validates that retrieved data can be processed.

Examples:

- Required external identifiers exist.
- Source object type is recognized.
- Parent relationships are coherent.
- Raw payload is accessible.
- Supported content fields are readable.

Source validation failure may fail synchronization or snapshot processing.

## Structural Knowledge Validation

Validates normalized item structure.

Examples:

- Required title exists.
- Knowledge Type is supported.
- Required type-specific fields exist.
- Stable identity is available.
- Parent references are valid.
- Content checksum exists.
- Duplicate stable keys are detected.
- Required relationship targets exist.

Structural failures are normally blocking.

## Semantic Knowledge Validation

Validates Playbook-level meaning that can be checked deterministically.

Examples:

- Workflow contains at least one step.
- Prompt Definition contains instructions.
- Decision Matrix references at least one Criterion.
- Audit Definition includes evaluation criteria.
- A required Section exists.
- A Criterion weight is within an approved range.
- Published knowledge does not contain unresolved blocking references.

Semantic validations that require human judgment or AI interpretation are outside version 1.

## Validation Findings

Each finding records:

- Finding code.
- Severity.
- Blocking status.
- Message.
- Knowledge Item reference when applicable.
- Source Reference when applicable.
- Validation stage.
- Diagnostic metadata.
- Timestamp.

Initial validation severity:

- Error.
- Warning.
- Information.

Publication is blocked by any unresolved blocking Error.

Warnings and Information findings do not block publication unless a specific rule says otherwise.

PlaybookVersion owns the Validation Summary. Validation Findings are stored separately, become immutable after validation completes, and must be persisted atomically with the summary. Zero blocking findings transition the version to Validated; publication remains a later explicit operation.

---

# CLI Scope

The CLI is the primary user interface for version 1.

The final command syntax will be designed later, but version 1 must support operations equivalent to:

```text
workspace initialize
workspace show

playbook create
playbook list
playbook show
playbook rename
playbook archive
playbook restore
playbook activate-version
playbook clear-active-version

source create
source show
source update
source enable
source disable
source verify

sync start
sync list
sync show
sync retry

snapshot show
snapshot compare

version create
version normalize
version validate
version publish
version archive
version list
version show

knowledge list
knowledge show
knowledge search
knowledge relationships

config validate
system status
```

High-level convenience commands may also be included:

```text
playbook ingest
```

An ingestion command may coordinate:

1. Synchronize.
2. Create Draft version.
3. Normalize.
4. Validate.
5. Explicitly publish the Validated version when requested.
6. Explicitly activate the Published version when requested.

The CLI must make each completed stage visible and preserve partial progress if a later stage fails.

## CLI Output

Version 1 should support:

- Human-readable terminal output.
- Structured JSON output for automation.

CLI output must not expose:

- Credentials.
- Raw environment values.
- Internal stack traces by default.
- Vendor SDK objects.
- ORM entities.

## Exit Codes

The CLI must eventually distinguish at least:

- Success.
- Validation failure.
- Not found.
- State conflict.
- External integration failure.
- Infrastructure failure.
- Unexpected internal failure.

The exact numeric mapping will be defined during CLI design.

---

# Persistence Scope

Version 1 uses PostgreSQL as the authoritative structured persistence store.

PostgreSQL will store:

- Workspace.
- Playbook.
- Playbook Source metadata.
- Synchronization Run.
- Synchronization Snapshot metadata.
- Playbook Version.
- Knowledge Items.
- Knowledge relationships.
- Validation findings.
- Operational metadata required for traceability.

Large raw snapshot payloads may be stored through a file-storage abstraction.

## Persistence Requirements

- Schema migrations.
- Transactions.
- Referential integrity.
- Unique constraints.
- Workspace-aware queries.
- Optimistic concurrency where lifecycle updates require it.
- UTC timestamps.
- Immutable historical records where defined.
- Repository contracts separated from ORM models.

## Local Development

A Docker Compose configuration may be used to run PostgreSQL locally.

Version 1 does not require:

- Managed cloud database.
- High availability.
- Read replicas.
- Database sharding.
- Tenant-specific schemas.
- Database-per-tenant.
- Automated backup infrastructure.

---

# Configuration Scope

Version 1 configuration includes:

- Application environment.
- Database connection.
- Personal Workspace bootstrap or current Workspace resolution.
- Notion credential.
- Snapshot storage directory.
- Logging level.
- CLI output defaults.
- Runtime limits such as maximum retrieval depth or content size where needed.

Configuration must be:

- Validated at startup.
- Typed.
- Centralized.
- Separated from domain entities.
- Safe to display only through redacted diagnostics.

A `.env.example` file will document required environment variables without secrets.

---

# Logging and Traceability Scope

Version 1 requires structured logs for:

- Application startup.
- CLI command invocation.
- Synchronization lifecycle.
- Notion requests at a safe diagnostic level.
- Snapshot creation.
- Version creation.
- Normalization.
- Validation.
- Publication.
- Activation.
- Persistence failures.
- Unexpected errors.

Logs should include where available:

- Correlation identifier.
- Workspace identifier.
- Playbook identifier.
- Source identifier.
- Synchronization Run identifier.
- Snapshot identifier.
- Playbook Version identifier.
- Operation name.
- Duration.
- Outcome.

Logs must not include:

- Notion tokens.
- Database passwords.
- Full secret values.
- Sensitive raw content by default.

Distributed tracing and external observability platforms are not required.

---

# Testing Scope

Version 1 requires:

## Unit Tests

For:

- Aggregate invariants.
- Lifecycle state transitions.
- Value Objects.
- Version sequence rules.
- Knowledge normalization rules.
- Validation rules.
- Checksum behavior.
- Source mapping behavior that can be isolated.
- CLI application mapping where valuable.

## Integration Tests

For:

- PostgreSQL repositories.
- Database migrations.
- Workspace isolation.
- Snapshot storage.
- Notion adapter against mocked HTTP responses or an approved test boundary.
- Complete synchronization-to-snapshot flow.
- Draft-version creation.
- Normalization.
- Validation and publication.
- CLI command execution against a test environment.

## Architecture Tests

For:

- Core not importing infrastructure.
- Core not importing Notion SDK types.
- Applications not containing domain logic.
- Internal package dependency rules.
- Forbidden cross-module imports.

## End-to-End Tests

At least one successful vertical slice:

```text
Initialize Workspace
    ↓
Register Playbook
    ↓
Register Notion Source
    ↓
Synchronize fixture content
    ↓
Create Snapshot
    ↓
Create Draft Version
    ↓
Normalize Knowledge
    ↓
Validate
    ↓
Publish
    ↓
Activate
    ↓
Query Knowledge through CLI
```

At least one failed path:

```text
Synchronize invalid or incomplete fixture
    ↓
Create Draft Version
    ↓
Normalize
    ↓
Validation produces blocking findings
    ↓
Version becomes Invalid
    ↓
Publication is rejected
```

Live Notion integration tests may be optional and manually enabled to avoid unreliable or costly automated test runs.

---

# Security Scope

Version 1 includes:

- Secret redaction.
- Validated configuration.
- Parameterized database access through the selected persistence tool.
- Safe file path handling for snapshot storage.
- Workspace-aware repository contracts.
- Input validation.
- Safe error output.
- Dependency vulnerability review.
- Protection against accidental logging of tokens.

Version 1 does not claim complete SaaS-grade security.

Not included:

- User authentication.
- Authorization.
- Role-based access control.
- SSO.
- Audit log for human actors.
- Encryption key management service.
- Per-tenant encryption.
- Network security architecture.
- Compliance certification.

---

# Explicitly Excluded Functional Areas

The following areas are not part of version 1 implementation.

## Execution Engine

Excluded:

- Runtime Workflow execution.
- Step Execution.
- Execution Plans.
- Workflow retries.
- Human review steps.
- Execution cancellation.
- Execution reports.

Workflow Definitions are normalized as knowledge only.

## AI Providers

Excluded:

- OpenAI integration.
- Anthropic integration.
- Google model integration.
- Local model integration.
- AI Request execution.
- Provider Invocation tracking.
- Token usage tracking.
- Model fallback.
- Model selection at runtime.

Model guidance may exist as Reference Documents or structured knowledge, but no provider is called.

## Audits

Excluded:

- Running an Audit.
- Criterion evaluation.
- Audit Findings.
- Finding lifecycle.
- Audit reports.

Audit Definitions are normalized as knowledge only.

## Decisions

Excluded:

- Runtime Decision evaluation.
- Alternative ranking.
- Model recommendation.
- Criterion scoring.
- Decision Outcomes.

Decision Matrices and Criteria are normalized as knowledge only.

## Projects

Excluded from the first release:

- Registering Projects.
- Git repository inspection.
- Local project snapshots.
- Artifact storage for software projects.
- Source-code analysis.

This module will be introduced when the Execution and Audit vertical slices begin.

## Automations

Excluded:

- Scheduled synchronization.
- Recurring jobs.
- Event triggers.
- Automation Runs.
- Retry scheduling.
- Queue workers.

All version 1 operations are initiated explicitly through the CLI.

## API

A production-ready HTTP API is excluded.

The `apps/api` boundary may contain only:

- A minimal health check.
- Bootstrap wiring required to validate architecture.
- No public product functionality unless approved later.

## Web Interface

Excluded entirely:

- Dashboard.
- Administration UI.
- Knowledge browser.
- Synchronization screens.
- Authentication screens.

## SaaS Capabilities

Excluded:

- Users.
- Organizations.
- Memberships.
- Roles.
- Permissions.
- Invitations.
- Billing.
- Subscriptions.
- Usage quotas.
- Multiple tenant selection.
- Tenant provisioning.
- Cross-tenant administration.

---

# Version 1 Delivery Milestones

## Milestone 1 — Domain Foundation

Deliver:

- Workspace model.
- Playbook model.
- Playbook Source model.
- Synchronization Run lifecycle.
- Synchronization Snapshot metadata.
- Playbook Version lifecycle.
- Knowledge Item model.
- Validation Finding model.
- Repository contracts.
- Domain tests.

No external Notion integration is required yet.

## Milestone 2 — Persistence Foundation

Deliver:

- PostgreSQL local environment.
- Database schema.
- Migrations.
- Repository implementations.
- File-based snapshot storage adapter.
- Transaction handling.
- Workspace-aware persistence tests.

## Milestone 3 — Notion Source Adapter

Deliver:

- Validated Notion configuration.
- Connection verification.
- Page, database and block retrieval.
- Pagination.
- Retry and rate-limit handling.
- Source-aligned snapshot builder.
- Adapter tests using fixtures or mocked responses.

## Milestone 4 — Synchronization Pipeline

Deliver:

- Start synchronization.
- Persist lifecycle transitions.
- Retrieve source content.
- Store snapshot.
- Calculate checksum.
- Detect unchanged snapshots.
- Show synchronization history.
- Retry failed synchronization.

## Milestone 5 — Knowledge Normalization

Deliver:

- Parsed intermediate content model.
- Stable identity strategy.
- Mapping to supported Knowledge Types.
- Relationship extraction.
- Source traceability.
- Normalization tests using representative Playbook fixtures.

## Milestone 6 — Validation and Publication

Deliver:

- Structural validators.
- Semantic deterministic validators.
- Validation findings.
- Draft-to-Validated-to-Published lifecycle.
- Invalid version behavior.
- Activation.
- Historical version queries.

## Milestone 7 — CLI Vertical Slice

Deliver:

- Workspace commands.
- Playbook commands.
- Source commands.
- Synchronization commands.
- Version commands.
- Knowledge query commands.
- Human-readable and JSON output.
- Exit-code strategy.
- End-to-end tests.

## Milestone 8 — Hardening and Release

Deliver:

- Architecture tests.
- Error consistency.
- Logging and redaction review.
- Documentation.
- `.env.example`.
- Docker Compose development setup.
- CI validation.
- Release checklist.
- Initial tagged release.

---

# Version 1 Success Criteria

Version 1 is successful when all the following are true:

1. A fresh local installation can initialize a personal Workspace.
2. A Playbook and its Notion source can be configured through the CLI.
3. Source access can be verified without exposing credentials.
4. A complete synchronization can retrieve representative Playbook content.
5. The source state is preserved as an immutable snapshot.
6. Failed synchronization attempts remain visible and retryable through new runs.
7. A Draft Playbook Version can be created from a snapshot.
8. Supported Playbook content can be normalized without Notion-specific types entering the domain.
9. Source traceability is preserved for normalized Knowledge Items.
10. Structural and semantic validation findings are persisted.
11. Invalid versions cannot be published.
12. Validated versions are immutable but not executable, and can be explicitly published then activated.
13. Published versions are immutable.
14. Historical versions remain queryable.
15. Knowledge can be queried through the CLI by type, title and content.
16. CLI commands support structured JSON output.
17. The complete vertical slice has automated tests.
18. Architecture dependency rules are automatically checked.
19. Secrets do not appear in logs, persistence records or CLI output.
20. The repository passes formatting, linting, type checking, tests and build in CI.

---

# Version 1 Release Boundary

Version 1 ends after the Notion-to-versioned-knowledge pipeline is stable and usable through the CLI.

The next product increment begins with:

- Project registration and snapshots.
- Execution Engine.
- AI Gateway.
- Runtime model selection.
- Audits.
- Decisions.
- Reporting.
- Automation.

Those capabilities must build on the versioned knowledge foundation rather than bypass it.

---

# Change Control

Changes to the version 1 scope require explicit evaluation.

A proposed addition must answer:

1. Is it required to validate the core product hypothesis?
2. Does it block the Notion-to-knowledge vertical slice?
3. Can it be safely deferred?
4. Does it introduce a new module or Aggregate?
5. Does it require a new external dependency?
6. Does it materially increase operational complexity?
7. Which existing milestone and success criterion does it support?

Features must not be added merely because they are easy for an AI coding agent to generate.

Version 1 prioritizes a small, reliable and traceable product foundation over breadth.
