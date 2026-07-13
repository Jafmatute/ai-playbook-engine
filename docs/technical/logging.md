# AI Playbook Engine — Logging and Traceability

## Purpose

This document defines the logging and operational traceability strategy for AI Playbook Engine version 1.

It establishes:

- Log structure.
- Log levels.
- Correlation context.
- Domain and resource identifiers.
- Package responsibilities.
- Secret and sensitive-data redaction.
- Error logging.
- Synchronization traceability.
- CLI behavior.
- Testing requirements.

The objective is to make operations diagnosable without exposing secrets, leaking private Playbook content or coupling the domain to a logging framework.

This document does not define:

- A specific logging library.
- A centralized cloud observability platform.
- Distributed tracing infrastructure.
- Metrics collection.
- Alerting rules.
- Log retention policies.
- Production log shipping.
- SaaS audit logging for human actors.

---

# Logging Principles

## Logs Are Operational Records

Logs describe what the running system did.

They support:

- Debugging.
- Failure diagnosis.
- Performance analysis.
- Correlation of related operations.
- Verification of lifecycle progress.
- Detection of unexpected behavior.

Logs are not the authoritative source of domain state.

Authoritative state remains in:

- Aggregates.
- Repositories.
- Synchronization Runs.
- Snapshots.
- Playbook Versions.
- Validation Findings.

## Structured Logging

Version 1 should use structured logs.

Each log record should conceptually contain:

```text
timestamp
level
message
event
correlationId
operation
context
error
```

Structured JSON is preferred for machine-readable output.

Human-readable pretty logging may be enabled in local development.

## Logging Must Not Change Behavior

Logging failures must not normally alter domain outcomes.

Examples:

- Failure to write one debug log must not invalidate a Playbook Version.
- Logging must not be required for lifecycle transitions.
- Logging must not become the mechanism for persistence or idempotency.

Critical logger initialization failure may block startup when no safe fallback exists.

## Domain Independence

Core must not depend on:

- A logging framework.
- Logger instances.
- Log levels.
- Structured-log field names.
- Output destinations.

Domain code communicates behavior through:

- Return values.
- Errors.
- State transitions.
- Domain events when introduced.

Application and adapter layers decide what to log.

---

# Package Responsibilities

## Shared

May define only genuinely generic logging-related contracts when justified.

Candidate generic concepts:

- Safe JSON metadata.
- CorrelationId.
- Redacted value marker.

Shared must not define:

- Synchronization-specific log events.
- Playbook-specific logging.
- Notion-specific fields.

## Core

Does not perform operational logging.

Core may expose:

- Domain errors.
- State transitions.
- Domain events.
- Stable identifiers.

These can be logged by Application or delivery layers.

## Application

May log:

- Use-case start.
- Use-case completion.
- Use-case failure.
- Duration.
- Resource identifiers.
- State transition outcomes.
- External-port invocation outcomes.
- Partial progress.

Application must not log:

- Raw credentials.
- Full Snapshot payloads.
- Full Knowledge content.
- Raw Notion responses.
- Database connection details.

## Config

Owns:

- Logging configuration.
- Level validation.
- Output-mode validation.
- Redaction configuration.
- Safe logging diagnostics.

Config must not log raw configuration before redaction is active.

## Infrastructure

Owns the concrete logger implementation and technical adapter logs.

May log:

- Database connection lifecycle.
- Migration execution.
- Transaction failures.
- Snapshot storage operations.
- Checksum verification.
- Orphan detection.
- File-system diagnostics.

Must not expose:

- Passwords.
- Full connection strings.
- Physical paths in normal logs when unnecessary.
- Snapshot content.

## Notion

May log:

- Request attempt.
- Operation type.
- Pagination progress.
- Rate-limit handling.
- Retry behavior.
- Safe external request identifiers.
- Unsupported content diagnostics.

Must not log:

- Notion token.
- Authorization headers.
- Full API request objects.
- Full raw responses.
- Full private page content.

## CLI

Owns:

- Final user-facing command messages.
- Human-readable diagnostics.
- Correlation identifier display when useful.
- Debug-mode presentation.
- Separation between normal output and logs.

Normal CLI output is not automatically a log record.

---

# Log Levels

Version 1 uses four principal levels:

```text
debug
info
warn
error
```

## Debug

Use for detailed diagnostic information useful during development or troubleshooting.

Examples:

- Repository method timing.
- Pagination cursor progression.
- Snapshot serialization stages.
- Retry attempt number.
- Validation rule execution.
- Mapping counts.
- Temporary-file cleanup details.

Debug logs must remain safe.

Debug does not permit secrets or full private payloads.

## Info

Use for meaningful normal operational milestones.

Examples:

- CLI command started.
- Workspace initialized.
- Playbook created.
- Synchronization Run started.
- Snapshot stored.
- Draft version created.
- Normalization completed.
- Validation completed.
- Version published.
- Version activated.
- Command completed.

Info logs should not record every low-level internal step.

## Warn

Use for recoverable or notable conditions.

Examples:

- Notion rate limit encountered and retried.
- Unsupported non-blocking block type.
- Stale Running synchronization detected.
- Validation produced warnings.
- Temporary cleanup failed.
- Deprecated configuration key.
- Orphaned payload detected.
- Retryable external failure.

Warn indicates attention may be required, but the process may still succeed.

## Error

Use when an operation fails or an unexpected condition occurs.

Examples:

- Synchronization Run failed.
- Snapshot write failed.
- Database transaction failed.
- Version publication failed because persisted state was inconsistent.
- Unexpected exception reached the outer boundary.
- Stored payload checksum mismatch.
- Required migration failed.

Expected user validation errors do not always require Error level.

For example:

- Invalid CLI argument may be Warn or not logged.
- Playbook not found may be Info or Warn depending on context.
- Domain conflict may be Warn.

---

# Log Event Names

Logs should include a stable machine-readable event name.

Examples:

```text
application.command.started
application.command.completed
application.command.failed

workspace.initialized
workspace.archived
workspace.restored

playbook.created
playbook.renamed
playbook.archived
playbook.version_activated

source.registered
source.enabled
source.disabled
source.verification_completed
source.verification_failed

synchronization.created
synchronization.started
synchronization.progress
synchronization.completed
synchronization.failed
synchronization.stale_detected

snapshot.write_started
snapshot.write_completed
snapshot.verification_failed
snapshot.orphan_detected

version.draft_created
version.normalization_started
version.normalization_completed
version.normalization_failed
version.validation_started
version.validation_completed
version.validated
version.invalid
version.published
version.archived

knowledge.normalization_completed
knowledge.validation_completed

notion.request_started
notion.request_completed
notion.request_retried
notion.rate_limited
notion.request_failed

persistence.transaction_failed
persistence.concurrency_conflict
persistence.constraint_conflict
```

## Rules

Event names must:

- Be stable.
- Use lowercase dot-separated notation.
- Describe what happened.
- Avoid implementation-class names.
- Avoid dynamic values.
- Be distinct from human-readable messages.

The human-readable message may change.

Automation and diagnostics should depend on event fields, not message text.

---

# Common Log Fields

Every structured log should include only fields relevant to the operation.

## Base Fields

Candidate base fields:

```text
timestamp
level
event
message
application
environment
applicationVersion
correlationId
operation
invocationOrigin
durationMs
```

## Tenant and Domain Context

When available:

```text
workspaceId
playbookId
playbookSourceId
synchronizationRunId
synchronizationSnapshotId
playbookVersionId
normalizationAttemptId
validationAttemptId
knowledgeItemId
commandId
```

## External Context

When safe:

```text
externalSystem
externalOperation
externalRequestId
externalObjectType
externalObjectId
attempt
retryable
retryAfterMs
```

## Error Context

```text
errorCode
errorCategory
failureStage
retryable
expected
```

## Rules

- Identifiers use canonical string form.
- Timestamps use ISO 8601 UTC.
- Durations use explicit units such as `durationMs`.
- Field names remain consistent across packages.
- Optional fields are omitted rather than set inconsistently to null.
- Arbitrary nested objects should be avoided.

---

# CorrelationId

## Purpose

CorrelationId connects all logs belonging to one logical operation.

Examples:

- One CLI command.
- One synchronization.
- One ingestion pipeline.
- One validation operation.

## Creation

The delivery boundary creates a CorrelationId when none is supplied.

Version 1 CLI creates one per command invocation.

## Propagation

The same CorrelationId must propagate through:

```text
CLI
  ↓
Application handler
  ↓
Repositories
  ↓
Snapshot storage
  ↓
Notion adapter
```

## Rules

- Must not change during one logical operation.
- Must not be generated independently by every adapter.
- May be included in user-facing error output.
- Is not domain identity.
- Is not authorization context.
- Must not contain personal data.

---

# CommandId and CorrelationId

These concepts remain distinct.

## CorrelationId

Groups one logical execution and its logs.

## CommandId

Supports idempotency for one state-changing request.

One CorrelationId may include several internal Commands.

A retried invocation may:

- Reuse the same CommandId.
- Receive a new CorrelationId.

Both should be logged separately when available.

---

# Operation Naming

Every Application handler should have a stable operation name.

Examples:

```text
workspace.initialize
workspace.get_current
playbook.create
playbook.rename
source.register
source.verify
synchronization.start
version.normalize
version.validate
version.publish
knowledge.search
```

Operation names should align with use-case terminology.

Avoid using:

- Handler class names.
- CLI command syntax as the only operation identity.
- Dynamic operation names.

---

# CLI Output Versus Logs

## Standard Output

Used for successful command results.

Examples:

- Created identifier.
- Human-readable table.
- JSON result.

## Standard Error

Used for:

- User-facing errors.
- Warnings when appropriate.
- Diagnostic logging in interactive local mode.

## Structured Logs

May be written to:

- Standard error.
- A configured file.
- Another future destination.

## Rules

In JSON CLI output mode:

- Standard output must remain valid JSON for the command result.
- Logs must not corrupt standard output.
- Logs should go to standard error or another destination.
- Human progress animations must be disabled.
- Errors should use the approved JSON error contract.

---

# Command Lifecycle Logging

Every significant CLI command should conceptually log:

## Start

```text
event: application.command.started
operation
correlationId
invocationOrigin
```

## Completion

```text
event: application.command.completed
operation
correlationId
durationMs
outcome
```

## Failure

```text
event: application.command.failed
operation
correlationId
durationMs
errorCode
errorCategory
expected
retryable
```

## Rules

- Do not log the complete raw Command object automatically.
- Log selected safe fields only.
- User-provided content must be bounded and reviewed.
- Secret-bearing options are never logged.

---

# Synchronization Logging

Synchronization is the most important operational trace in version 1.

## Creation

Log:

```text
event: synchronization.created
workspaceId
playbookSourceId
synchronizationRunId
commandId
```

## Start

Log:

```text
event: synchronization.started
synchronizationRunId
sourceType
externalRootType
parserVersion
```

Do not log full credentials or sensitive URLs.

## Progress

Progress logs may include:

```text
event: synchronization.progress
stage
pagesRetrieved
databasesRetrieved
recordsRetrieved
blocksRetrieved
requestCount
retryCount
```

## Progress Frequency

Progress logging must be bounded.

Avoid one Info log per block.

Preferred:

- Debug for low-level pagination.
- Periodic Info progress by configured count or duration.
- Final Info summary.

## Completion

Log:

```text
event: synchronization.completed
synchronizationRunId
snapshotId
durationMs
contentChecksum
contentUnchanged
pagesRetrieved
blocksRetrieved
unsupportedCount
warningCount
```

## Failure

Log:

```text
event: synchronization.failed
synchronizationRunId
failureStage
errorCode
retryable
durationMs
requestCount
retryCount
```

The full technical cause may be included in internal Error data after redaction.

---

# Notion Request Logging

## Request Start

Candidate fields:

```text
event: notion.request_started
externalOperation
externalObjectType
attempt
```

## Request Completion

```text
event: notion.request_completed
externalOperation
externalRequestId
durationMs
status
```

## Rate Limit

```text
event: notion.rate_limited
attempt
retryAfterMs
externalRequestId
```

## Failure

```text
event: notion.request_failed
errorCode
externalStatus
retryable
attempt
```

## Content Restrictions

Do not log:

- Full block text.
- Full page content.
- Full property values.
- Raw request body.
- Raw response body.

Safe diagnostics may include:

- Object counts.
- Object type.
- External identifier.
- Unsupported block type.
- Safe property names when necessary.

---

# Snapshot Storage Logging

## Write Start

```text
event: snapshot.write_started
snapshotId
workspaceId
expectedChecksum
storageFormat
```

## Write Completion

```text
event: snapshot.write_completed
snapshotId
storageReference
byteSize
checksum
wasAlreadyPresent
durationMs
```

StorageReference must remain logical.

Do not log the unrestricted physical path in normal mode.

## Verification Failure

```text
event: snapshot.verification_failed
snapshotId
expectedChecksum
actualChecksum
errorCode
```

## Orphan Detection

```text
event: snapshot.orphan_detected
storageReference
checksum
ageMs
```

No automatic deletion should be implied.

---

# Playbook Version Logging

## Draft Creation

```text
event: version.draft_created
playbookVersionId
playbookId
snapshotId
versionSequence
```

## Normalization Start

```text
event: version.normalization_started
playbookVersionId
normalizationAttemptId
parserVersion
normalizationSchemaVersion
```

## Normalization Completion

```text
event: version.normalization_completed
playbookVersionId
normalizationAttemptId
knowledgeItemCount
relationshipCount
contentChecksum
durationMs
```

## Validation Completion

```text
event: version.validation_completed
playbookVersionId
validationAttemptId
errorCount
warningCount
informationCount
blockingFindingCount
publicationEligible
durationMs
```

## Publication

```text
event: version.published
playbookVersionId
playbookId
versionSequence
publicationOrigin
```

## Activation

```text
event: playbook.version_activated
playbookId
playbookVersionId
previousActiveVersionId
```

The absence of a previous version should be represented consistently by omission.

---

# Validation Logging

## Rule-Level Logging

Individual validation rules should normally log only at Debug.

Candidate fields:

```text
event: validation.rule_completed
validationCode
targetType
findingCount
durationMs
```

## Summary Logging

Validation completion should log at Info.

## Findings

Do not emit every finding as an Error log automatically.

Validation Findings are domain records.

Recommended mapping:

- Error-severity blocking finding: Warn or Debug individually.
- Warning finding: Debug individually.
- Summary: Info.
- Validation process failure: Error.

This prevents expected invalid Playbook content from polluting operational error logs.

---

# Persistence Logging

Infrastructure may log:

- Connection established.
- Migration started and completed.
- Transaction rollback.
- Concurrency conflict.
- Known constraint conflict.
- Slow query warning when introduced.

## Query Content

Do not log full SQL parameters when they may include private content.

Safe fields:

- Repository operation.
- Table or mapped concept.
- Duration.
- Row count.
- Error classification.

## SQL Logging

Full SQL logging is disabled by default.

Development debug mode may enable bounded SQL diagnostics after reviewing secret and content exposure.

---

# Error Logging

## Expected Errors

Expected errors should be logged according to operational significance.

Examples:

| Error type                        | Suggested level |
| --------------------------------- | --------------- |
| Invalid CLI input                 | none or warn    |
| Not found                         | info or warn    |
| State conflict                    | warn            |
| Blocking validation findings      | info summary    |
| Rate limit retried successfully   | warn            |
| External failure ending operation | error           |
| Infrastructure failure            | error           |
| Unexpected internal exception     | error           |

## Unexpected Errors

Unexpected errors should include:

- CorrelationId.
- Operation.
- Stable public error code.
- Internal error type.
- Safe stack trace.
- Cause chain when safe.
- Package or component.
- Duration.

The public CLI response remains generic.

## Double Logging

Avoid logging the same failure as Error in:

- Adapter.
- Infrastructure.
- Application.
- CLI.

Preferred pattern:

- Lower layer translates and returns the error.
- Boundary responsible for operation visibility logs the terminal failure.
- Lower layers may emit Debug diagnostics or Warn for retries.

---

# Error Object Serialization

Do not serialize Error objects blindly.

A safe logger adapter should extract:

```text
name
message
stack
cause
code
category
retryable
```

after redaction and bounded normalization.

Raw SDK or database objects must not be attached directly.

---

# Secret Redaction

## Mandatory Redaction Targets

At minimum:

```text
token
accessToken
authorization
apiKey
secret
password
connectionString
databaseUrl
cookie
setCookie
credential
headers.authorization
```

Field names should be matched case-insensitively where supported.

## Known Values

The logger should support redacting known secret values, not only field names.

This protects against messages that accidentally contain a token.

## Connection URLs

A database URL must be logged only in redacted form.

Example:

```text
postgresql://user:***@localhost:5432/ai_playbook_engine
```

## Notion Tokens

Any value matching configured Notion credentials must be redacted.

## CredentialReference

CredentialReference may be logged when safe.

It is not the secret value.

---

# Sensitive Playbook Content

Playbook content may be private even when it is not a credential.

Normal logs must not contain:

- Full page content.
- Full prompts.
- Full methodology text.
- Full audit definitions.
- Raw Snapshot payload.
- Large Knowledge Item content.

## Safe Alternatives

Log:

- KnowledgeItemId.
- KnowledgeType.
- SourceStableKey when safe.
- Content checksum.
- Character or block count.
- Title only when approved and bounded.

Titles may also be sensitive.

A configuration option may later control whether titles appear in Debug logs.

Version 1 should default to identifiers over content.

---

# Physical Paths

Normal logs should prefer:

- StorageReference.
- Configured storage type.
- Logical key.

Avoid exposing full local absolute paths in standard logs.

Debug mode may include a redacted or normalized path when necessary.

Path diagnostics must not expose unrelated user directories.

---

# Logging Context Propagation

## Context Object

A scoped logging context may conceptually contain:

```text
correlationId
operation
invocationOrigin
workspaceId
commandId
```

Child operations add identifiers without losing parent context.

## Example

```text
base context
- correlationId
- operation: synchronization.start
- workspaceId

child context
- playbookSourceId
- synchronizationRunId
```

## Rules

- Context must not be global mutable state.
- Parallel operations must not overwrite each other's context.
- Async propagation must be safe.
- Tests must be able to construct context explicitly.
- Core remains unaware of it.

The exact implementation may use explicit child loggers or an approved asynchronous context mechanism.

---

# Logger Contract

## Ownership

If Application needs logging, it should depend on an Application-owned minimal Logger port.

Infrastructure implements it.

## Conceptual Operations

```text
debug(event, message, context)
info(event, message, context)
warn(event, message, context)
error(event, message, context)
```

The exact TypeScript shape remains deferred.

## Rules

- Context must use safe JSON-compatible metadata.
- Error logging should support a normalized internal error field.
- The Application contract must not depend on one logging vendor.
- Child-context creation may be supported.
- The contract must remain small.

## Alternative

Application handlers may emit operational events to a wrapper without receiving a logger directly.

Version 1 should choose the simplest approach that supports traceability and testing.

---

# Logger Initialization

Recommended startup sequence:

1. Create minimal bootstrap logger.
2. Load raw configuration.
3. Validate logging configuration.
4. Create configured logger with redaction enabled.
5. Log redacted startup information.
6. Compose remaining dependencies.
7. Execute the command.

## Bootstrap Failures

Configuration errors must be shown safely even before the final logger exists.

The bootstrap logger must never print raw configuration objects.

---

# Logging Configuration

Candidate settings:

```text
logLevel
logFormat
pretty
destination
includeTimestamp
includeApplicationVersion
includeEnvironment
```

Version 1 output formats:

- JSON.
- Pretty local output.

## Defaults

Development:

- `info`.
- Pretty output when interactive.

Test:

- Silent or error-only by default.
- Capture logs for assertions where required.

Production:

- `info`.
- Structured JSON.
- No pretty output by default.

Debug must be explicit.

---

# Log Destinations

Version 1 may support:

- Standard error.
- Optional local file output.

Standard output should remain reserved for command results, particularly in JSON mode.

Cloud destinations are deferred.

## File Output

If introduced:

- Path comes from validated Config.
- Writes must not expose secrets.
- Rotation is required before production use.
- Failure behavior must be defined.
- The logger must not use SnapshotStorage for log files.

File logging is optional for the first implementation.

---

# Traceability Requirements

The system must be able to answer operationally:

- Which CLI command initiated the operation?
- Which Workspace was used?
- Which Playbook and source were involved?
- Which Synchronization Run was created?
- Which Snapshot was written?
- Which Playbook Version was produced?
- Which normalization and validation attempts ran?
- Which stage failed?
- Which error code occurred?
- Was the error retryable?
- How long did each stage take?

Logs support these questions but do not replace persisted history.

---

# Persisted Traceability Versus Logs

## Persisted

Must be stored authoritatively:

- Run status.
- Start and completion timestamps.
- Snapshot identity.
- Checksums.
- Retrieval summaries.
- Failure summary.
- Version lifecycle.
- Validation Summary.
- Validation Findings.
- Source configuration snapshot.
- Parser and schema versions.

## Logs

Provide additional operational context:

- Internal durations.
- Retry attempts.
- Adapter request IDs.
- Diagnostic stage progress.
- Stack traces for unexpected failures.
- Temporary cleanup details.

A required historical fact must not exist only in logs.

---

# Performance Logging

Version 1 should measure durations for:

- CLI command.
- Notion request.
- Complete synchronization.
- Snapshot serialization.
- Snapshot write.
- Snapshot verification.
- Knowledge normalization.
- Validation.
- Database transaction.

## Slow Operation Warning

Threshold-based warnings may be added later.

Thresholds must be configurable and based on measured needs.

Do not label normal Notion latency as a warning without an approved threshold.

---

# Volume Control

Logging must remain bounded.

## Prohibited High-Volume Patterns

- One Info log per block.
- One Info log per Knowledge Item.
- Full payload logging.
- Full validation finding logging.
- Full SQL parameter logging.
- Repeated logging of the same retry failure at Error level.

## Preferred Pattern

- Debug for item-level diagnostics.
- Periodic progress summary.
- Final operation summary.
- Error only for terminal or unexpected failures.

---

# Unsupported Content Logging

An unsupported Notion block should produce:

- A persisted or returned diagnostic.
- A bounded Warn or Debug log.
- Object type.
- Source identifier.
- Handling decision.

Example:

```text
event: notion.unsupported_block
blockType: synced_block
externalObjectId: ...
handling: preserved_as_placeholder
```

Do not include the full block content.

Repeated identical unsupported types may be aggregated.

---

# Test Logging Behavior

Tests should suppress normal logs by default.

A test logger may:

- Capture records in memory.
- Assert event names.
- Assert fields.
- Assert redaction.
- Assert no forbidden content.

Tests should not depend on console output.

---

# Testing Requirements

## Logger Contract Tests

Test:

- Event and message recording.
- Log-level filtering.
- Context propagation.
- Child context.
- Error normalization.
- JSON-safe metadata.
- Timestamp behavior when controlled.

## Redaction Tests

Verify that logs never expose:

- Notion token.
- Database password.
- Connection string password.
- Authorization header.
- Secret configuration values.
- Raw credentials nested inside objects.
- Secret values included in an Error message.

## Correlation Tests

Verify:

- CLI creates CorrelationId.
- Application preserves it.
- Notion and storage logs include it.
- Parallel operations remain isolated.
- Retry logs retain the same CorrelationId.

## Synchronization Logging Tests

Verify:

- Start.
- Progress summary.
- Completion.
- Failure.
- Retrieval counts.
- No raw content.
- No token exposure.
- Correct identifiers.

## CLI Tests

Verify:

- JSON standard output remains valid when logs are enabled.
- Logs go to the correct stream.
- Debug mode does not expose secrets.
- User-facing errors include CorrelationId when configured.
- Stack traces remain hidden normally.

## Unexpected Error Tests

Verify:

- Unexpected error logged once at Error.
- Stack trace captured internally.
- Public output remains generic.
- CorrelationId preserved.
- Secrets in causes are redacted.

---

# Architecture Rules

The following are prohibited:

- Core importing a logging library.
- Core receiving a logger.
- Application importing a concrete logging framework.
- Packages creating unrelated global logger instances.
- Logging raw configuration.
- Logging complete Snapshot payloads.
- Logging Notion credentials.
- Logging full database URLs.
- Using logs as persistence.
- Parsing log messages to drive behavior.
- Printing logs to standard output in JSON CLI mode.
- Logging the same terminal error at every layer.
- Disabling redaction in Debug mode.

---

# Initial Event Catalog

The first implementation should introduce only events required by implemented behavior.

Initial candidates:

```text
application.command.started
application.command.completed
application.command.failed

workspace.initialized
workspace.archived
workspace.restored

playbook.created
playbook.renamed
playbook.archived
playbook.restored
playbook.version_activated

configuration.validation_failed
configuration.loaded

persistence.connection_failed
persistence.transaction_failed
persistence.concurrency_conflict
```

Synchronization, Snapshot, Notion, normalization and validation events are introduced with their respective modules.

Do not create the complete catalog speculatively in code.

---

# Deferred Decisions

The following remain deferred:

- Logging library.
- Async context implementation.
- File rotation.
- Cloud log aggregation.
- Metrics.
- Distributed tracing.
- OpenTelemetry.
- Alerting.
- Log retention.
- Audit logs for user actions.
- PII classification.
- Per-Workspace log destinations.
- Production sampling.
- Performance dashboards.

Future implementations must preserve the redaction and package-boundary rules defined here.

---

# Approved Version 1 Direction

Version 1 will use:

- Structured logging.
- JSON logs for machine-readable environments.
- Pretty logs for local development.
- CorrelationId per CLI invocation.
- Stable event names.
- Explicit operation names.
- Contextual domain identifiers.
- Safe error normalization.
- Mandatory secret redaction.
- No raw Playbook payload logging.
- Standard output reserved for command results.
- Standard error or another destination for logs.
- Bounded progress logging.
- Persisted domain history separate from logs.
- Application or Infrastructure logging through a vendor-neutral boundary.

---

# Completion Criteria

Logging design is ready for implementation when:

- Every package has a clear logging responsibility.
- Core remains logging-independent.
- Correlation context can cross all runtime layers.
- Event names and common fields are consistent.
- CLI output cannot be corrupted by logs.
- Secret and content redaction rules are explicit.
- Synchronization progress can be diagnosed without excessive volume.
- Expected and unexpected failures use appropriate levels.
- Required historical facts remain persisted outside logs.
- Logging behavior can be tested without console dependence.
