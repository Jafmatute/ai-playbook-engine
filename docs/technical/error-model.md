# AI Playbook Engine — Error Model

## Purpose

This document defines the error model for AI Playbook Engine version 1.

It establishes:

* Error categories.
* Stable machine-readable error codes.
* Error ownership by package and layer.
* Translation rules between layers.
* Retryability classification.
* Safe diagnostic metadata.
* CLI presentation rules.
* Logging behavior.
* Testing requirements.

The error model must allow the system to distinguish expected business and operational failures from unexpected programming or infrastructure faults.

This document does not define:

* Final CLI numeric exit codes.
* HTTP status-code mappings.
* Complete logging implementation.
* Notion-specific error codes.
* Database-library exception classes.
* User authentication or authorization errors.

Those mappings will be defined in their corresponding technical designs.

---

# Error Model Principles

## Errors Must Preserve Meaning

An error must communicate what failed in terms understood by the layer that receives it.

Examples:

* Core understands an invalid lifecycle transition.
* Application understands that a requested Playbook was not found.
* Notion understands an external rate-limit response.
* CLI understands that a command failed because the source connection was unavailable.

A raw external exception must not cross every layer unchanged.

## Stable Codes, Flexible Messages

Expected errors must provide:

* A stable machine-readable code.
* A safe human-readable message.
* An error category.
* Optional safe details.
* Optional cause information for internal diagnostics.

Consumers must depend on the stable code or category, not the exact message text.

Message wording may evolve without breaking automation.

## Expected Errors Are Not Programmer Bugs

Expected failures include:

* Invalid user input.
* Missing records.
* State conflicts.
* Validation failures.
* External integration failures.
* Retryable operational failures.

Unexpected failures include:

* Broken invariants caused by invalid internal code.
* Impossible states.
* Unhandled library behavior.
* Programming defects.
* Corrupted assumptions.

Expected failures should normally be represented explicitly.

Unexpected failures may be caught at an outer boundary and converted into a safe internal-error response.

## Errors Must Not Expose Secrets

Error messages and metadata must not contain:

* Notion tokens.
* Database credentials.
* Environment variable values.
* Raw authorization headers.
* Secret file contents.
* Full sensitive source payloads.
* Unredacted connection strings.

## Errors Must Be Traceable

Operational errors should support:

* CorrelationId.
* WorkspaceId where available.
* Operation name.
* Aggregate or resource identity.
* Failure stage.
* Retryability.
* Safe external reference.
* Timestamp.

These fields do not all need to live inside every domain error.

They may be added through structured logging context.

---

# Error Layers

Version 1 defines five principal error layers:

1. Domain errors.
2. Application errors.
3. Integration errors.
4. Infrastructure errors.
5. Delivery errors.

Unexpected internal failures are treated separately.

---

# Domain Errors

## Purpose

Domain errors represent violations of business invariants or invalid domain transitions.

They belong in:

```text
packages/core
```

## Characteristics

Domain errors:

* Use domain language.
* Do not reference CLI, HTTP, PostgreSQL or Notion.
* Are deterministic for the same invalid operation.
* Must not expose framework exceptions.
* May be returned or thrown according to the approved domain coding pattern.
* Must include stable domain error codes.

## Examples

* Invalid Workspace name.
* Attempt to rename an Archived Playbook.
* Attempt to activate a non-Published version.
* Attempt to start an already Running Synchronization Run.
* Attempt to validate before normalization completes.
* Attempt to publish an Invalid version.
* Duplicate SourceStableKey.
* Invalid Knowledge attributes for the selected KnowledgeType.
* Invalid lifecycle timestamp ordering.

## Candidate Domain Error Codes

### Workspace

```text
WORKSPACE_NAME_REQUIRED
WORKSPACE_NAME_INVALID
WORKSPACE_ALREADY_ARCHIVED
WORKSPACE_NOT_ARCHIVED
WORKSPACE_OPERATION_NOT_ALLOWED
```

### Playbook

```text
PLAYBOOK_NAME_REQUIRED
PLAYBOOK_NAME_INVALID
PLAYBOOK_ALREADY_ARCHIVED
PLAYBOOK_NOT_ARCHIVED
PLAYBOOK_ACTIVE_VERSION_INVALID
PLAYBOOK_ACTIVE_VERSION_NOT_SET
PLAYBOOK_OPERATION_NOT_ALLOWED
```

### Playbook Source

```text
PLAYBOOK_SOURCE_DISABLED
PLAYBOOK_SOURCE_ALREADY_ENABLED
PLAYBOOK_SOURCE_ALREADY_DISABLED
PLAYBOOK_SOURCE_TYPE_UNSUPPORTED
PLAYBOOK_SOURCE_ROOT_INVALID
PLAYBOOK_SOURCE_OPERATION_NOT_ALLOWED
```

### Synchronization Run

```text
SYNCHRONIZATION_RUN_ALREADY_STARTED
SYNCHRONIZATION_RUN_NOT_RUNNING
SYNCHRONIZATION_RUN_ALREADY_TERMINAL
SYNCHRONIZATION_RUN_SNAPSHOT_REQUIRED
SYNCHRONIZATION_RUN_FAILURE_REQUIRED
SYNCHRONIZATION_RUN_INVALID_TIMESTAMP
SYNCHRONIZATION_RUN_INVALID_RETRY_REFERENCE
```

### Playbook Version

```text
PLAYBOOK_VERSION_NORMALIZATION_INCOMPLETE
PLAYBOOK_VERSION_VALIDATION_ALREADY_STARTED
PLAYBOOK_VERSION_NOT_DRAFT
PLAYBOOK_VERSION_NOT_VALIDATING
PLAYBOOK_VERSION_NOT_VALIDATED
PLAYBOOK_VERSION_NOT_PUBLISHABLE
PLAYBOOK_VERSION_ALREADY_PUBLISHED
PLAYBOOK_VERSION_ALREADY_ARCHIVED
PLAYBOOK_VERSION_BLOCKING_FINDINGS_PRESENT
PLAYBOOK_VERSION_CHECKSUM_MISMATCH
PLAYBOOK_VERSION_OPERATION_NOT_ALLOWED
```

### Knowledge

```text
KNOWLEDGE_TYPE_UNSUPPORTED
KNOWLEDGE_TITLE_REQUIRED
KNOWLEDGE_ATTRIBUTES_INVALID
KNOWLEDGE_SOURCE_KEY_REQUIRED
DUPLICATE_SOURCE_STABLE_KEY
KNOWLEDGE_PARENT_INVALID
KNOWLEDGE_RELATIONSHIP_INVALID
KNOWLEDGE_RELATIONSHIP_CYCLE
KNOWLEDGE_ITEM_IMMUTABLE
```

### Identifiers and Sequences

```text
INVALID_IDENTIFIER
IDENTITY_STRATEGY_UNSUPPORTED
VERSION_SEQUENCE_INVALID
CONTENT_CHECKSUM_INVALID
```

## Domain Error Metadata

Domain errors may include safe structured details such as:

* Current state.
* Requested transition.
* Expected state.
* KnowledgeType.
* ValidationCode.
* Conflicting identifier.
* Allowed values.

They must not include:

* ORM records.
* Raw Notion payloads.
* Stack traces as public data.
* Credentials.

---

# Application Errors

## Purpose

Application errors represent failures while executing a use case or query.

They belong in:

```text
packages/application
```

Application errors may wrap or translate:

* Domain errors.
* Repository outcomes.
* Integration errors.
* Infrastructure failures.
* Cross-Aggregate validation failures.

## Application Error Categories

Version 1 defines these categories:

```text
validation
not_found
conflict
precondition_failed
external_failure
infrastructure_failure
unavailable
timeout
idempotency_conflict
unexpected
```

## Validation

The request is malformed or cannot be converted into valid domain input.

Examples:

* Missing required command field.
* Malformed identifier.
* Invalid source configuration.
* Unsupported query filter.

Candidate codes:

```text
APPLICATION_INPUT_INVALID
REQUIRED_FIELD_MISSING
INVALID_COMMAND
INVALID_QUERY
INVALID_PAGINATION
```

## Not Found

A required record or resource does not exist in the expected Workspace or scope.

Candidate codes:

```text
WORKSPACE_NOT_FOUND
PLAYBOOK_NOT_FOUND
PLAYBOOK_SOURCE_NOT_FOUND
SYNCHRONIZATION_RUN_NOT_FOUND
SYNCHRONIZATION_SNAPSHOT_NOT_FOUND
PLAYBOOK_VERSION_NOT_FOUND
KNOWLEDGE_ITEM_NOT_FOUND
VALIDATION_ATTEMPT_NOT_FOUND
```

## Conflict

The requested operation conflicts with existing state or uniqueness constraints.

Candidate codes:

```text
PLAYBOOK_NAME_CONFLICT
ENABLED_PLAYBOOK_SOURCE_CONFLICT
ACTIVE_SYNCHRONIZATION_RUN_CONFLICT
VERSION_SEQUENCE_CONFLICT
PLAYBOOK_VERSION_ALREADY_EXISTS
COMMAND_ALREADY_PROCESSED
```

## Precondition Failed

A referenced resource exists, but the operation cannot proceed because a required condition is not satisfied.

Candidate codes:

```text
WORKSPACE_NOT_ACTIVE
PLAYBOOK_ARCHIVED
PLAYBOOK_SOURCE_NOT_ENABLED
PLAYBOOK_VERSION_NOT_ELIGIBLE
NORMALIZATION_NOT_COMPLETED
VALIDATION_NOT_COMPLETED
SOURCE_CONNECTION_NOT_VERIFIED
```

## External Failure

An external system failed while performing an application operation.

Candidate codes:

```text
PLAYBOOK_SOURCE_CONNECTION_FAILED
PLAYBOOK_SOURCE_RETRIEVAL_FAILED
PLAYBOOK_SOURCE_RATE_LIMITED
PLAYBOOK_SOURCE_UNAVAILABLE
EXTERNAL_RESPONSE_INVALID
```

## Infrastructure Failure

An internal technical dependency failed.

Candidate codes:

```text
PERSISTENCE_OPERATION_FAILED
TRANSACTION_FAILED
SNAPSHOT_STORAGE_FAILED
SNAPSHOT_READ_FAILED
CHECKSUM_OPERATION_FAILED
CONFIGURATION_ACCESS_FAILED
```

## Unavailable

A required capability or resource is temporarily unavailable.

Candidate codes:

```text
DATABASE_UNAVAILABLE
SNAPSHOT_STORAGE_UNAVAILABLE
PLAYBOOK_SOURCE_TEMPORARILY_UNAVAILABLE
```

## Timeout

A bounded operation exceeded its allowed duration.

Candidate codes:

```text
PLAYBOOK_SOURCE_TIMEOUT
PERSISTENCE_TIMEOUT
OPERATION_TIMEOUT
```

## Idempotency Conflict

The same command identity was reused with different canonical input.

Candidate code:

```text
IDEMPOTENCY_CONFLICT
```

## Unexpected

The application encountered an unclassified internal failure.

Candidate code:

```text
UNEXPECTED_APPLICATION_ERROR
```

This code must not replace more precise known errors.

---

# Integration Errors

## Purpose

Integration errors represent normalized failures from an external system.

They belong to the adapter package that understands the external system.

For Notion:

```text
packages/notion
```

## Boundary Rule

Raw SDK errors must remain inside the adapter package.

The Notion package translates them into provider-neutral integration failures before returning through the Application port.

## Candidate Integration Categories

```text
configuration
authentication
authorization
not_found
rate_limit
timeout
network
invalid_response
unsupported_content
unavailable
unexpected
```

## Candidate Notion Integration Codes

```text
NOTION_CONFIGURATION_INVALID
NOTION_CREDENTIAL_MISSING
NOTION_AUTHENTICATION_FAILED
NOTION_ACCESS_DENIED
NOTION_ROOT_NOT_FOUND
NOTION_OBJECT_NOT_FOUND
NOTION_RATE_LIMITED
NOTION_REQUEST_TIMEOUT
NOTION_NETWORK_FAILURE
NOTION_RESPONSE_INVALID
NOTION_PAGINATION_FAILED
NOTION_UNSUPPORTED_OBJECT
NOTION_UNSUPPORTED_BLOCK
NOTION_SERVICE_UNAVAILABLE
NOTION_UNEXPECTED_ERROR
```

## External Status and References

An integration error may contain safe fields such as:

* External status code.
* Request identifier.
* Retry-after duration.
* External object type.
* External object identifier when safe.
* Failure stage.

It must not expose:

* Authentication headers.
* Tokens.
* Full raw response bodies by default.
* Internal SDK objects.

## Unsupported Content

Unsupported Notion content does not always fail synchronization.

The adapter must distinguish:

### Blocking unsupported content

The source cannot be represented safely or traversal cannot continue.

### Non-blocking unsupported content

The block can be preserved as raw content or placeholder and reported diagnostically.

An unsupported block warning is not automatically an Application error.

---

# Infrastructure Errors

## Purpose

Infrastructure errors represent failures in internal technical adapters.

They belong in:

```text
packages/infrastructure
```

## Candidate Categories

```text
database
transaction
storage
filesystem
serialization
checksum
configuration
concurrency
migration
unexpected
```

## Candidate Infrastructure Codes

### Persistence

```text
DATABASE_CONNECTION_FAILED
DATABASE_QUERY_FAILED
DATABASE_WRITE_FAILED
DATABASE_CONSTRAINT_VIOLATION
DATABASE_CONCURRENCY_CONFLICT
DATABASE_TRANSACTION_FAILED
DATABASE_RECORD_MAPPING_FAILED
```

### Snapshot Storage

```text
SNAPSHOT_STORAGE_WRITE_FAILED
SNAPSHOT_STORAGE_READ_FAILED
SNAPSHOT_STORAGE_NOT_FOUND
SNAPSHOT_STORAGE_CHECKSUM_MISMATCH
SNAPSHOT_STORAGE_PATH_INVALID
SNAPSHOT_STORAGE_SERIALIZATION_FAILED
```

### Identifier and Checksum

```text
RANDOM_ID_GENERATION_FAILED
DETERMINISTIC_ID_GENERATION_FAILED
CHECKSUM_CALCULATION_FAILED
CHECKSUM_VERIFICATION_FAILED
```

### Configuration and Migrations

```text
DATABASE_CONFIGURATION_INVALID
SNAPSHOT_STORAGE_CONFIGURATION_INVALID
DATABASE_MIGRATION_FAILED
```

## Constraint Translation

Database constraint errors must be translated into meaningful Application outcomes when the violated constraint represents a known business or application rule.

Examples:

```text
Database unique constraint:
workspace + normalized playbook name
        ↓
PLAYBOOK_NAME_CONFLICT
```

```text
Database active-source constraint
        ↓
ENABLED_PLAYBOOK_SOURCE_CONFLICT
```

```text
Optimistic concurrency failure
        ↓
APPLICATION_STATE_CONFLICT
```

Unknown constraint failures remain infrastructure failures.

The Application layer must not inspect vendor-specific SQL error codes directly.

---

# Delivery Errors

## Purpose

Delivery errors represent how Application outcomes are presented to a user or caller.

Version 1 delivery is primarily:

```text
apps/cli
```

The CLI must not redefine the underlying error meaning.

## CLI Error Responsibilities

The CLI:

* Maps Application categories to exit codes.
* Renders safe human-readable messages.
* Produces structured JSON errors.
* Hides stack traces by default.
* Shows diagnostic details only in an approved debug mode.
* Preserves stable Application error codes.
* Includes correlation identity when useful.
* Avoids printing secret values.

## Human-Readable Error Shape

Conceptual output:

```text
Error: Playbook source is disabled.
Code: PLAYBOOK_SOURCE_NOT_ENABLED
Correlation: 019...
```

Additional guidance may be shown when safe:

```text
Enable the source before starting synchronization.
```

## JSON Error Shape

Conceptual structure:

```json
{
  "success": false,
  "error": {
    "code": "PLAYBOOK_SOURCE_NOT_ENABLED",
    "category": "precondition_failed",
    "message": "The Playbook source must be enabled before synchronization can start.",
    "details": {
      "playbookSourceId": "..."
    },
    "correlationId": "..."
  }
}
```

## JSON Error Rules

* `code` is stable.
* `category` is stable within the delivery contract.
* `message` is safe for users.
* `details` contains only safe, documented values.
* `correlationId` supports diagnostics.
* Stack traces are excluded.
* Raw causes are excluded.
* Empty optional properties should be omitted consistently.

---

# Unexpected Internal Errors

## Definition

An unexpected internal error is a failure not represented by an approved expected error path.

Examples:

* Null or undefined value in an impossible internal state.
* Unhandled library behavior.
* Programming bug.
* Broken persistence mapping assumption.
* Invalid dependency wiring.
* Corrupted historical state.

## Boundary Handling

Unexpected errors should be caught at the outer delivery boundary.

The boundary must:

1. Generate or preserve CorrelationId.
2. Log the complete internal diagnostic safely.
3. Return a generic user-facing error.
4. Avoid exposing internal implementation details.
5. Exit or recover according to the command context.

Candidate public code:

```text
INTERNAL_ERROR
```

Candidate public message:

```text
An unexpected internal error occurred.
```

## Debug Behavior

An explicit local debug mode may display more diagnostics.

It must still redact:

* Secrets.
* Credentials.
* Authorization headers.
* Sensitive configuration values.

Debug mode must not change the stable error code.

---

# Error Structure

## Common Conceptual Fields

Expected errors may use a shared conceptual shape:

```text
code
category
message
details
retryable
cause
```

Not every layer should expose every field publicly.

## Code

Stable machine-readable identifier.

Rules:

* Uppercase snake case.
* Describes the failure, not the implementation class.
* Must be unique enough within the project.
* Must not include package names unnecessarily.
* Must not be generated dynamically from messages.

## Category

Broad classification used for mapping behavior.

Examples:

```text
validation
not_found
conflict
precondition_failed
external_failure
infrastructure_failure
timeout
unavailable
unexpected
```

## Message

Human-readable safe summary.

Rules:

* Clear and actionable where possible.
* No secrets.
* No raw library message dependency.
* No stack trace.
* No unstable machine parsing.

## Details

Optional structured safe metadata.

Examples:

```text
currentStatus
requiredStatus
resourceId
validationCode
retryAfterSeconds
field
conflictingName
```

## Retryable

Indicates whether repeating the operation may succeed without changing business input.

Possible values:

* `true`.
* `false`.
* `unknown`.

The implementation may use a boolean plus absence, or an explicit classification.

## Cause

Internal cause information.

Rules:

* Used for logging and diagnostics.
* Not serialized to normal CLI JSON output.
* May preserve the original exception through standard error cause mechanisms.
* Must not change the public code.

---

# Retryability

## Retryable Errors

Candidate retryable failures:

* Notion rate limiting.
* Temporary Notion unavailability.
* Network timeout.
* Transient database connection failure.
* Temporary file lock.
* Optimistic concurrency conflict when the use case can safely reload.
* Temporary storage unavailability.

## Non-Retryable Errors

Candidate non-retryable failures:

* Invalid input.
* Missing required resource.
* Archived Playbook.
* Disabled source.
* Invalid lifecycle transition.
* Duplicate SourceStableKey.
* Invalid Notion credentials.
* Access denied.
* Unsupported source type.
* Blocking validation findings.
* Idempotency conflict.

## Retry Policy Ownership

Retryability classification and retry policy are distinct.

The error may indicate that it is retryable.

The deciding layer determines whether to retry.

Examples:

* Notion adapter applies bounded technical retry for rate limits.
* Application decides whether a synchronization attempt should fail.
* Synchronization retry creates a new Synchronization Run.
* CLI does not silently retry state-changing commands indefinitely.

## No Hidden Retries

Retries must not:

* Hide repeated external usage.
* Overwrite attempt history.
* Create duplicate Aggregate records.
* Ignore idempotency.
* Extend beyond configured limits.
* Convert permanent failures into generic timeouts.

---

# Error Translation Flow

## Domain to Application

Example:

```text
Core:
PLAYBOOK_VERSION_NOT_VALIDATED
        ↓
Application:
PLAYBOOK_VERSION_NOT_ELIGIBLE
category: precondition_failed
```

The Application may preserve the domain code when it is already suitable for callers.

Translation is required only when the Application needs broader context or a stable use-case-level contract.

## Integration to Application

Example:

```text
Notion:
NOTION_RATE_LIMITED
retryable: true
        ↓
Application:
PLAYBOOK_SOURCE_RATE_LIMITED
category: external_failure
```

The Application must not expose raw Notion SDK exceptions.

## Infrastructure to Application

Example:

```text
Infrastructure:
DATABASE_CONSTRAINT_VIOLATION
constraint: unique_active_source
        ↓
Application:
ENABLED_PLAYBOOK_SOURCE_CONFLICT
category: conflict
```

## Application to CLI

Example:

```text
Application:
PLAYBOOK_SOURCE_RATE_LIMITED
category: external_failure
retryable: true
        ↓
CLI:
human message
JSON error
external-failure exit code
```

---

# Error Translation Rules

## Preserve the Original Cause Internally

When translating, retain the safe technical cause for logging where supported.

## Do Not Double-Log Expected Errors

Expected errors should normally be logged once at the boundary responsible for operational visibility.

Repeated logging at every translation layer creates noise.

## Add Context Without Changing Meaning

A translator may add:

* Operation.
* Resource identifier.
* Failure stage.
* Retryability.
* Safe external request reference.

It must not change a permanent failure into a retryable one without evidence.

## Unknown Errors Stay Unknown

A translator must not guess that an unknown database or SDK exception represents a specific business conflict.

Unknown failures should become an appropriate unexpected or infrastructure error.

---

# Result Versus Exception Strategy

## Direction

Version 1 should use explicit result types for expected Application use-case outcomes.

Exceptions remain appropriate for:

* Unexpected failures.
* Broken internal assumptions.
* Technical exceptions caught and translated by adapters.
* Construction failures when the selected Value Object pattern uses controlled exceptions internally.

## Application Boundary

Use-case handlers should conceptually return:

```text
Result<SuccessOutput, ApplicationError>
```

The exact TypeScript implementation will be defined separately.

## Domain Boundary

The domain may use one consistent pattern:

* Result-based factories and transitions.
* Controlled domain exceptions.
* A hybrid where creation returns Result and impossible internal failures throw.

The project must choose one dominant pattern before implementation.

OpenCode must not mix patterns arbitrarily between Aggregates.

## Prohibited Pattern

Do not use exceptions as normal control flow for every expected absence or conflict across asynchronous application code without a documented convention.

---

# Error Code Ownership

## Core Owns

Codes representing domain invariants and transitions.

Examples:

```text
PLAYBOOK_ALREADY_ARCHIVED
SYNCHRONIZATION_RUN_ALREADY_TERMINAL
PLAYBOOK_VERSION_NOT_VALIDATED
DUPLICATE_SOURCE_STABLE_KEY
```

## Application Owns

Codes representing use-case outcomes and resource coordination.

Examples:

```text
PLAYBOOK_NOT_FOUND
PLAYBOOK_NAME_CONFLICT
ACTIVE_SYNCHRONIZATION_RUN_CONFLICT
IDEMPOTENCY_CONFLICT
```

## Notion Owns

Codes representing Notion communication and mapping failures.

Examples:

```text
NOTION_RATE_LIMITED
NOTION_ROOT_NOT_FOUND
NOTION_RESPONSE_INVALID
```

## Infrastructure Owns

Codes representing technical adapter failures.

Examples:

```text
DATABASE_CONNECTION_FAILED
SNAPSHOT_STORAGE_WRITE_FAILED
CHECKSUM_CALCULATION_FAILED
```

## CLI Owns

The CLI should normally not invent new underlying failure codes.

It may own delivery-only codes such as:

```text
CLI_ARGUMENT_INVALID
CLI_OUTPUT_SERIALIZATION_FAILED
```

---

# Validation Errors Versus Validation Findings

These concepts must remain distinct.

## Input Validation Error

The user or caller supplied invalid command input.

Example:

```text
INVALID_PLAYBOOK_ID
```

The use case does not begin.

## Domain Error

A domain operation violates an invariant.

Example:

```text
PLAYBOOK_VERSION_NOT_VALIDATED
```

## Validation Finding

The content of a Playbook Version failed a validation rule.

Example:

```text
WORKFLOW_STEP_REQUIRED
```

This is persisted as version-validation data.

It is not necessarily represented as an Application error until an operation such as publication is attempted.

## Publication Failure

Attempting publication with blocking findings produces an Application or Domain error such as:

```text
PLAYBOOK_VERSION_BLOCKING_FINDINGS_PRESENT
```

The detailed content issues remain Validation Findings.

---

# Concurrency Errors

## Optimistic Concurrency

A persistence update may fail because another operation changed the record revision.

Infrastructure code:

```text
DATABASE_CONCURRENCY_CONFLICT
```

Application translation:

```text
APPLICATION_STATE_CONFLICT
```

Candidate safe message:

```text
The resource changed while the operation was being processed. Reload it and retry.
```

## Business Conflict

An optimistic concurrency conflict is not the same as:

* Duplicate Playbook name.
* Active source conflict.
* Active synchronization conflict.

Known constraint violations should receive their specific conflict codes.

## Retry

The Application may reload and retry only when:

* The operation is idempotent.
* Reapplying it is safe.
* Retry count is bounded.
* The Aggregate revalidates all invariants.

---

# Configuration Errors

Configuration errors normally occur at startup or composition time.

Candidate codes:

```text
CONFIGURATION_INVALID
CONFIGURATION_VALUE_MISSING
CONFIGURATION_VALUE_INVALID
NOTION_CREDENTIAL_CONFIGURATION_MISSING
DATABASE_CONFIGURATION_INVALID
SNAPSHOT_STORAGE_CONFIGURATION_INVALID
```

## Rules

* Show the configuration key when safe.
* Never show the secret value.
* Fail fast when required configuration is invalid.
* Do not allow Core to receive partially validated runtime configuration.
* CLI `config validate` may display all detected safe configuration issues together.

---

# Error Logging Levels

Recommended mapping:

## Debug

* Internal retry attempt.
* Safe adapter diagnostics.
* Validation rule execution context.
* Mapped external status details.

## Information

* Expected no-change outcomes when operationally useful.
* Successful recovery after a retry.
* Command completion summary.

## Warning

* Retryable external failure.
* Unsupported non-blocking source content.
* Stale synchronization run detected.
* Validation warnings.
* Expected conflict that may require user action.

## Error

* Command failed due to external or infrastructure failure.
* Synchronization Run failed.
* Snapshot storage failed.
* Unexpected internal error.

Expected validation and not-found outcomes should not automatically be logged as Error unless their operational context justifies it.

---

# Secret Redaction

## Redaction Targets

At minimum, redact:

* Notion token.
* Database password.
* Full connection string.
* Authorization headers.
* Cookie values.
* Secret environment variables.
* Credential-provider responses.

## Safe Referencing

Instead of logging a secret:

```text
credentialReference: notion-primary
```

The reference itself must still be reviewed for sensitivity.

## Error Cause Sanitization

Raw external error messages may contain request information.

Before including them in details or logs:

* Inspect known SDK behavior.
* Remove authorization data.
* Avoid logging full request objects.
* Truncate large response bodies.
* Prefer structured safe fields.

---

# Error Serialization

## Requirements

Application errors intended for delivery must be serializable.

Serialization must:

* Preserve code.
* Preserve category.
* Preserve safe message.
* Preserve safe details.
* Preserve retryability.
* Exclude raw cause.
* Exclude stack trace.
* Produce deterministic field names.

## Date and Identifier Values

* Identifiers use canonical strings.
* Timestamps use ISO 8601 UTC strings.
* Durations use explicitly named units.
* Undefined optional fields are omitted.

## Diagnostic Metadata

Metadata values should be limited to JSON-safe primitives and bounded structures.

Do not serialize:

* Error objects.
* Database records.
* SDK responses.
* Arbitrary class instances.
* Circular structures.

---

# Package Responsibilities

## Shared

May contain:

* Generic Result primitives.
* Generic base error typing.
* Safe JSON metadata types.
* Retryability classification.

Must not contain:

* Domain-specific error codes.
* Notion error codes.
* Database error translation.

## Core

Owns:

* Domain error codes.
* Domain error structures.
* Invariant violation outcomes.
* Domain-safe error details.

## Application

Owns:

* Application error categories.
* Use-case error contracts.
* Domain-to-Application translation where needed.
* Repository and port failure abstractions.
* Stable use-case outcomes.

## Config

Owns:

* Configuration validation errors.
* Redacted configuration diagnostics.

## Infrastructure

Owns:

* Database, transaction, storage and technical error translation.
* Vendor-specific error recognition.
* Mapping known technical constraints to infrastructure error codes.

## Notion

Owns:

* Notion SDK error recognition.
* External status normalization.
* Rate-limit and retry metadata.
* Safe source-integration errors.

## CLI

Owns:

* Error rendering.
* Exit-code mapping.
* JSON serialization.
* Debug-display behavior.
* Final unexpected-error boundary.

---

# Testing Requirements

## Domain Error Tests

Test:

* Invalid transitions produce stable codes.
* Details identify current and requested state safely.
* Messages contain no technical implementation details.
* Valid operations do not produce errors.
* Error code values do not change accidentally.

## Application Error Tests

Test:

* Not-found records map correctly.
* Workspace mismatches do not leak existence across Workspaces.
* Domain errors map correctly.
* Known uniqueness conflicts map to specific codes.
* Unknown infrastructure errors remain infrastructure failures.
* Idempotency conflicts are detected.

## Integration Error Tests

For Notion:

* Authentication failure.
* Access denied.
* Root not found.
* Rate limit.
* Timeout.
* Invalid response.
* Unsupported non-blocking content.
* Unexpected SDK error.

Tests must verify that tokens and request headers do not appear in serialized errors.

## Infrastructure Error Tests

Test:

* Known database constraints.
* Concurrency conflicts.
* Connection failure.
* Storage write failure.
* Missing payload.
* Checksum mismatch.
* Unknown driver failure.

## CLI Error Tests

Test:

* Human-readable rendering.
* JSON rendering.
* Stable code.
* Category.
* CorrelationId.
* Secret redaction.
* Stack trace hidden by default.
* Debug behavior.
* Exit-code mapping after it is defined.

## Unexpected Error Tests

Test that an unexpected exception:

* Is logged.
* Returns `INTERNAL_ERROR`.
* Does not expose its stack trace normally.
* Preserves correlation identity.
* Produces a non-success exit.

---

# Initial Stable Error Categories

Version 1 approves these Application-facing categories:

```text
validation
not_found
conflict
precondition_failed
external_failure
infrastructure_failure
unavailable
timeout
idempotency_conflict
unexpected
```

A new category requires a clear behavioral distinction.

Do not add categories merely to mirror vendor error taxonomies.

---

# Initial Stable Error Codes

The complete list will grow during implementation.

The first implementation must include only codes required by the implemented behavior.

At minimum, the first domain slice is expected to require:

```text
INVALID_IDENTIFIER
WORKSPACE_NAME_REQUIRED
WORKSPACE_NAME_INVALID
WORKSPACE_ALREADY_ARCHIVED
WORKSPACE_NOT_ARCHIVED
WORKSPACE_NOT_FOUND
PLAYBOOK_NAME_REQUIRED
PLAYBOOK_NAME_INVALID
PLAYBOOK_NAME_CONFLICT
PLAYBOOK_ALREADY_ARCHIVED
PLAYBOOK_NOT_ARCHIVED
PLAYBOOK_NOT_FOUND
PLAYBOOK_VERSION_NOT_ELIGIBLE
```

Additional codes must be introduced alongside:

* Their owning package.
* Tests.
* The behavior that produces them.
* Safe delivery mapping when applicable.

---

# Prohibited Error Practices

Version 1 must not:

* Return raw Notion SDK errors from Application.
* Return raw database-driver errors to CLI.
* Parse human-readable messages to determine behavior.
* Use one generic error code for all expected failures.
* Include credentials in error metadata.
* Log the same expected error in every layer.
* Use stack traces as normal CLI output.
* silently catch and ignore failures.
* Convert all database constraint violations into the same conflict.
* Mark permanent validation errors as retryable.
* Throw plain strings.
* Return `null` to represent every failure.
* expose ORM records through error details.
* use HTTP status codes inside Core or Application.
* let CLI exit-code concerns shape domain errors.

---

# Decisions Deferred

The following decisions remain deferred:

* Exact TypeScript Result implementation.
* Whether domain factories return Result or controlled domain exceptions.
* Final shared base error class or interface.
* Numeric CLI exit codes.
* HTTP status mappings.
* Error localization.
* Persistence schema for operational failure records.
* Full Notion retry policy.
* Centralized external observability integration.
* Error aggregation format for batch operations.

These decisions must remain compatible with the principles in this document.

---

# Approved Version 1 Direction

Version 1 will use:

* Stable machine-readable error codes.
* Explicit Application error categories.
* Domain errors owned by Core.
* Use-case errors owned by Application.
* Notion errors normalized inside the Notion package.
* Database and storage errors normalized inside Infrastructure.
* Safe translation between layers.
* Explicit retryability.
* Structured safe metadata.
* Correlation-aware logging.
* Human-readable and JSON CLI errors.
* Generic handling for unexpected internal failures.
* Strict secret redaction.
* Validation Findings separate from command errors.

---

# Completion Criteria

The error model is ready for implementation when:

* Expected failures have clear layer ownership.
* Raw technical exceptions cannot cross public boundaries.
* Error codes remain stable independently from messages.
* Retryable and non-retryable failures are distinguishable.
* Validation Findings remain separate from Application errors.
* CLI can render errors safely.
* Unexpected failures have an outer boundary.
* Secrets are excluded from messages and metadata.
* Package responsibilities are explicit.
* Required testing scenarios are defined.
