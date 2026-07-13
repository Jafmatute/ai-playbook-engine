# AI Playbook Engine — Configuration Contracts

## Purpose

This document defines the configuration model for AI Playbook Engine version 1.

It establishes:

- Configuration ownership.
- Configuration sources.
- Source precedence.
- Startup validation.
- Secret references.
- Redaction rules.
- Environment-specific behavior.
- Package boundaries.
- Configuration diagnostics.
- Testing requirements.

The objective is to ensure that runtime configuration is:

- Centralized.
- Typed.
- Validated.
- Explicit.
- Secure.
- Independent from domain behavior.
- Consistent across CLI, future API and future Worker applications.

This document does not define:

- Final environment-variable names for every future module.
- Cloud secret-management services.
- Production deployment configuration.
- Kubernetes manifests.
- CI/CD secret configuration.
- Authentication settings.
- SaaS tenant configuration.

---

# Configuration Principles

## Configuration Is Runtime Input

Configuration provides values required to assemble and operate the application.

Examples:

- Application environment.
- PostgreSQL connection.
- Snapshot storage location.
- Notion credential reference.
- Logging level.
- Synchronization limits.
- CLI output defaults.

Configuration must not define business truth that belongs to persisted domain state.

Examples of data that must not exist only as runtime configuration:

- Playbook name.
- Playbook lifecycle status.
- Active Playbook Version.
- Synchronization Run state.
- Validation Findings.
- Knowledge Items.

## Domain Independence

Core must not:

- Read environment variables.
- Import Config.
- Parse connection strings.
- Know `.env` files.
- Know Notion token names.
- Read process-level globals.
- Depend on deployment environments.

Application must receive already validated values or abstractions.

## Fail Fast

Required configuration must be validated before normal application operations begin.

The application should not start partially configured and fail later during unrelated use cases.

Examples:

- Invalid database URL fails startup.
- Missing snapshot storage root fails startup when storage is required.
- Missing Notion credential may fail only commands requiring Notion when optional startup mode is explicitly supported.
- Invalid synchronization limits fail validation before synchronization starts.

## Configuration Must Be Typed

After validation, consuming packages receive typed configuration objects.

They must not repeatedly parse:

- Strings into numbers.
- Strings into booleans.
- Paths.
- Durations.
- Enumerated values.
- UUIDs.

Parsing occurs once in Config.

## Secrets Are Not Normal Configuration Values

A secret value may enter the process through a configuration source, but it must be handled through a restricted secret boundary.

Normal configuration diagnostics must expose:

- Whether a secret is configured.
- Which credential reference is selected.
- Which source supplied it when safe.

They must not expose the actual secret.

---

# Package Ownership

## `packages/config`

Owns:

- Configuration schemas.
- Source loading.
- Source precedence.
- Parsing.
- Validation.
- Default values.
- Redacted diagnostics.
- Configuration error codes.
- Typed runtime configuration contracts.

## `apps/*`

Composition roots:

- Invoke the Config loader.
- Receive validated configuration.
- Construct adapters and use cases.
- Decide which optional capabilities are required for the current command or application mode.

Applications must not parse environment variables independently.

## `packages/infrastructure`

Consumes validated configuration for:

- PostgreSQL.
- Snapshot storage.
- Logging.
- Identifier implementations.
- Personal Workspace resolution.

Infrastructure does not read environment variables directly.

## `packages/notion`

Consumes validated Notion adapter configuration.

It does not read `process.env`.

## `packages/application`

Must not depend on Config.

Application receives:

- Ports.
- Validated primitive limits.
- Explicit policies.
- Application options.

It must not receive the complete global runtime configuration object when only one value is needed.

## `packages/core`

Does not depend on Config.

---

# Configuration Sources

Version 1 supports these conceptual sources:

1. Built-in safe defaults.
2. Configuration file.
3. Environment variables.
4. Explicit CLI overrides for approved non-secret values.
5. Direct test configuration.

Not every source must be implemented immediately.

---

# Built-In Defaults

Built-in defaults are allowed only for values that are:

- Safe.
- Environment-independent.
- Non-secret.
- Operational rather than business-critical.
- Clearly documented.

Candidate defaults:

- Log level in local development.
- CLI output mode.
- Maximum list page size.
- Temporary-file cleanup interval.
- Notion retry count within a conservative bound.

Prohibited defaults:

- Database credentials.
- Notion token.
- Production storage path.
- Workspace identifier distributed as a magic constant.
- Destructive behavior.
- Automatic publication.
- Automatic activation.

---

# Configuration File

## Version 1 Direction

A local configuration file may be supported after the initial implementation if it improves usability.

Environment variables remain the minimum required source.

Candidate future file names:

```text
ai-playbook-engine.config.json
ai-playbook-engine.config.yaml
```

The format must not be selected until implementation requires it.

## Rules

A configuration file must:

- Be explicitly located or discovered through documented rules.
- Be validated with the same schema as other sources.
- Avoid containing secrets by default.
- Support comments only when the selected format safely supports them.
- Not silently override explicit CLI values.
- Not be searched recursively across arbitrary directories.

## Secret Values

Real secrets should preferably remain outside committed configuration files.

If a local file contains secrets:

- It must be excluded from Git.
- Its permissions must be reviewed.
- Diagnostics must redact it.
- `.env.example` or sample configuration must use fake placeholders.

---

# Environment Variables

## Ownership Rule

Only `packages/config` reads environment variables directly.

The approved technical boundary is:

```text
process.env
   ↓
Config loader
   ↓
Validated runtime configuration
   ↓
Composition root
   ↓
Adapters and application options
```

## Naming Convention

Environment variables use a consistent project prefix:

```text
AI_PLAYBOOK_ENGINE_
```

Candidate variables:

```text
AI_PLAYBOOK_ENGINE_ENV
AI_PLAYBOOK_ENGINE_DATABASE_URL
AI_PLAYBOOK_ENGINE_SNAPSHOT_STORAGE_ROOT
AI_PLAYBOOK_ENGINE_NOTION_TOKEN
AI_PLAYBOOK_ENGINE_NOTION_CREDENTIAL_REF
AI_PLAYBOOK_ENGINE_WORKSPACE_ID
AI_PLAYBOOK_ENGINE_LOG_LEVEL
AI_PLAYBOOK_ENGINE_CLI_OUTPUT
AI_PLAYBOOK_ENGINE_SYNC_MAX_DEPTH
AI_PLAYBOOK_ENGINE_SYNC_MAX_OBJECTS
AI_PLAYBOOK_ENGINE_SYNC_TIMEOUT_MS
```

Final names may be refined during implementation.

## Rules

- Names use uppercase snake case.
- Units appear in the variable name when ambiguity exists.
- Boolean values use documented accepted forms.
- Empty strings do not count as valid required values.
- Surrounding whitespace is handled explicitly.
- Unknown project-prefixed variables may produce warnings in strict validation mode.
- Deprecated variables must produce diagnostics before removal.

---

# Explicit CLI Overrides

CLI flags may override configuration only for approved non-secret operational values.

Candidate examples:

```text
--output json
--log-level debug
--sync-max-depth 10
```

CLI overrides must not normally accept:

- Raw database passwords.
- Raw Notion tokens.
- Full connection strings that could appear in shell history.
- Permanent Workspace ownership changes.
- Domain lifecycle state.

## Rules

- CLI override scope is the current invocation.
- It does not mutate persisted configuration.
- It has higher precedence than environment or file values.
- It must pass the same validation rules.
- Secret overrides require an explicit later security decision.

---

# Test Configuration

Tests may construct validated configuration directly.

Test configuration must:

- Use fake credentials.
- Avoid reading developer machine environment by default.
- Be deterministic.
- Isolate file-system paths.
- Use test database settings.
- Prevent accidental access to production or personal Notion resources.

Live integration tests must require an explicit opt-in flag.

---

# Configuration Precedence

The approved precedence, from lowest to highest, is:

```text
Built-in defaults
        ↓
Configuration file
        ↓
Environment variables
        ↓
Explicit CLI overrides
        ↓
Direct test injection
```

A higher-precedence source replaces the same logical setting from a lower-precedence source.

## Merge Rules

Nested configuration objects must be merged by documented logical fields.

A source must not replace an entire configuration section accidentally when it provides only one property.

## Source Tracking

The Config package should be able to report the source of each non-secret effective value when diagnostic mode is enabled.

Example:

```text
logLevel: debug
source: cli_override
```

For secrets, diagnostics may report:

```text
notionCredential:
  configured: true
  source: environment
```

The value remains hidden.

---

# Runtime Configuration Structure

The validated configuration should be divided into focused sections.

Conceptual shape:

```text
ApplicationConfig
DatabaseConfig
SnapshotStorageConfig
NotionConfig
LoggingConfig
CliConfig
SynchronizationConfig
PersonalWorkspaceConfig
```

A single unstructured map is prohibited.

---

# ApplicationConfig

## Candidate Fields

- Application environment.
- Application name.
- Application version.
- Runtime mode.
- Strict configuration mode.
- Optional diagnostic mode.

## Application Environment

Initial values:

- Development.
- Test.
- Production.

The serialized representation may use:

```text
development
test
production
```

## Rules

- Environment must be explicit or default safely to Development for local CLI use.
- Production must never inherit unsafe development defaults.
- Tests must use Test explicitly.
- Domain behavior must not branch directly on application environment.

---

# DatabaseConfig

## Candidate Fields

- Connection URL or structured connection settings.
- Pool minimum.
- Pool maximum.
- Connection timeout.
- Statement timeout.
- Migration mode.
- Optional SSL behavior.
- Application name for PostgreSQL sessions.

## Rules

- Database URL is sensitive.
- Diagnostics must redact credentials.
- Pool sizes must be positive and bounded.
- Minimum must not exceed maximum.
- Timeouts use explicit units.
- Production SSL behavior must not be disabled silently.
- Migration execution must be explicit.
- Core and Application never receive DatabaseConfig.

## Connection String Redaction

A diagnostic representation may show:

```text
postgresql://user:***@localhost:5432/ai_playbook_engine
```

It must not show the actual password.

---

# SnapshotStorageConfig

## Candidate Fields

- Logical storage implementation type.
- Local storage root.
- Maximum payload size.
- Checksum verification policy.
- Temporary-file suffix or subdirectory.
- Stale temporary-file age.
- Optional orphan safety interval.

## Version 1 Implementation Type

Initial value:

```text
local
```

## Rules

- Root path is required for local storage.
- Root path must be normalized and validated.
- Relative paths must be resolved through an explicit documented base.
- Application diagnostics should not expose the physical path unless local diagnostic mode allows it.
- Payload-size limits must be positive.
- Cleanup intervals must be bounded.
- Snapshot storage must not use the repository root implicitly without configuration.

---

# NotionConfig

## Candidate Fields

- Credential reference.
- Resolved token supplied only to adapter construction.
- API version when required.
- Request timeout.
- Maximum retry count.
- Base retry delay.
- Maximum retry delay.
- User-agent metadata.
- Optional request concurrency limit.

## Rules

- Token is required only for commands that access Notion, unless the complete CLI composition always initializes Notion.
- Credential reference and secret value remain distinct.
- Token must not appear in normal typed configuration diagnostics.
- Retry values must be bounded.
- Request timeout must be positive.
- Base URL override is prohibited in normal production use unless testing or a future proxy requires it.
- Notion configuration must not define Playbook source roots; those belong to persisted PlaybookSource records.

## Credential Reference

A local installation may use a logical reference such as:

```text
notion-primary
```

The reference identifies which configured secret should be resolved.

The persisted PlaybookSource stores the reference, not the token.

---

# LoggingConfig

## Candidate Fields

- Log level.
- Output format.
- Pretty-printing mode.
- Destination.
- Redaction behavior.
- Include correlation identifiers.
- Optional file output.

## Initial Log Levels

- Debug.
- Information.
- Warning.
- Error.

Serialized values may be:

```text
debug
info
warn
error
```

## Rules

- Production defaults must not use Debug.
- JSON structured logging is preferred for machine processing.
- Pretty output may be enabled for local development.
- Secret redaction is always enabled.
- Core does not consume LoggingConfig.
- Logging configuration must not alter domain outcomes.

---

# CliConfig

## Candidate Fields

- Default output mode.
- Color behavior.
- Verbosity.
- Debug display.
- Table page size.
- Interactive prompts enabled or disabled.

## Output Modes

Initial values:

- Human.
- JSON.

## Rules

- JSON output must remain stable and non-interactive.
- Debug display does not disable secret redaction.
- Commands used in automation must be able to disable prompts.
- Color may be disabled when output is redirected.
- CLI defaults are delivery concerns and must not enter Application or Core.

---

# SynchronizationConfig

## Candidate Fields

- Maximum traversal depth.
- Maximum source objects.
- Maximum total blocks.
- Maximum payload size.
- Request timeout.
- Maximum technical retries.
- Retry delay bounds.
- Progress update frequency.
- Stale-running threshold.
- Unsupported-content policy.

## Rules

- Limits must be positive and bounded.
- Unlimited values are prohibited unless explicitly represented and justified.
- Technical retry count must not create unbounded CLI execution.
- Unsupported-content policy must not silently discard content.
- These settings may be snapshotted into SynchronizationRun source configuration metadata.
- Changes affect future runs only.
- Historical runs retain the values used.

## Business Versus Operational Policy

Configuration may define operational bounds.

It must not redefine domain lifecycle.

Examples:

Allowed:

- Maximum request retries.
- Maximum traversal depth.

Not allowed:

- Whether a Failed run becomes Completed.
- Whether validation automatically publishes.
- Whether an Archived Playbook may synchronize.

---

# PersonalWorkspaceConfig

## Purpose

Support current Workspace resolution in personal mode.

## Candidate Fields

- Configured WorkspaceId.
- Bootstrap behavior.
- Whether automatic initialization is permitted.
- Optional expected Workspace name for diagnostics.

## Rules

- Config may contain a canonical WorkspaceId string.
- Infrastructure converts it into the typed WorkspaceId.
- Application verifies that the Workspace exists and is usable.
- Core never reads it.
- The identifier must not be duplicated across arbitrary files.
- A missing configured Workspace must produce a clear initialization requirement.
- Configuration must not create Workspace domain state silently unless the explicit bootstrap use case is invoked.

## Preferred Version 1 Behavior

After initialization:

- The generated WorkspaceId is persisted.
- The local configuration references it.
- CurrentWorkspaceProvider resolves it.
- WorkspaceRepository verifies it.

---

# Secret Resolution

## Purpose

Separate secret references from secret values.

## Conceptual Flow

```text
PlaybookSource.credentialReference
        ↓
Application or composition request
        ↓
Secret resolver
        ↓
Resolved secret value
        ↓
Notion adapter construction or invocation
```

## Version 1 Direction

Version 1 may resolve a Notion secret from an environment variable.

The design must still preserve the conceptual separation between:

- CredentialReference.
- Secret value.
- Adapter configuration.

## SecretResolver Contract

A future Application or technical port may conceptually provide:

```text
resolveSecret(credentialReference)
```

The exact ownership will be defined before implementation.

## Rules

- Secret values are short-lived where practical.
- Secret values are never persisted in domain repositories.
- Secret values are never included in Application outputs.
- Secret values are never included in normal logs.
- Unknown references produce a stable configuration or credential error.
- Secret resolution must not occur in Core.
- Test resolvers use clearly fake values.

---

# Startup Validation

## Validation Phases

### Phase 1 — Source Collection

Collect values from:

- Defaults.
- Optional configuration file.
- Environment.
- CLI overrides.

### Phase 2 — Parsing

Convert raw strings into:

- Numbers.
- Booleans.
- Enumerated values.
- Durations.
- Paths.
- Canonical identifier strings.

### Phase 3 — Schema Validation

Check:

- Required values.
- Ranges.
- Formats.
- Cross-field constraints.
- Environment-specific requirements.

### Phase 4 — Safe Normalization

Normalize:

- Paths.
- Case-insensitive values.
- Output modes.
- Log levels.
- UUID casing.
- Optional empty values.

### Phase 5 — Typed Configuration Creation

Return immutable typed configuration.

## Cross-Field Validation Examples

- Database pool minimum cannot exceed maximum.
- Retry base delay cannot exceed maximum delay.
- Snapshot maximum payload must not exceed an approved process limit.
- Production cannot use an unsafe database SSL setting without explicit approval.
- Personal WorkspaceId must be valid when bootstrap mode is disabled.
- JSON CLI mode cannot require interactive prompts.

---

# Lazy Capability Validation

Not every command requires every external capability.

Examples:

- `workspace show` may require database but not Notion.
- `config validate` may validate all sections.
- `source verify` requires Notion.
- `knowledge list` requires database but not Notion.
- `sync start` requires database, storage and Notion.

## Design Direction

The CLI may use one of two approaches:

### Full Startup Validation

Validate all configuration before any command runs.

Advantages:

- Simpler composition.
- Problems found early.

Disadvantages:

- Commands unrelated to Notion fail when Notion is not configured.

### Capability-Aware Validation

Validate common configuration first, then command-specific sections.

Advantages:

- Better local usability.
- Commands require only relevant capabilities.

Disadvantages:

- More composition complexity.

## Approved Version 1 Direction

Use capability-aware validation.

Common startup validation includes:

- Application.
- Logging.
- CLI.

Command-specific composition validates:

- Database.
- Snapshot storage.
- Notion.
- Personal Workspace.

A command must declare its required capabilities.

---

# Configuration Immutability

Validated runtime configuration is immutable for the lifetime of one application process.

Version 1 does not support live configuration reload.

Changes require:

- Updating the source.
- Starting a new CLI process.

## Reasoning

CLI processes are short-lived.

Live reload would add complexity without value.

Future API and Worker reload behavior requires a separate decision.

---

# Configuration Diagnostics

## `config validate`

Version 1 should support a CLI operation equivalent to:

```text
config validate
```

It reports:

- Valid sections.
- Invalid sections.
- Missing required values.
- Deprecated keys.
- Safe effective values.
- Source of each value when useful.
- Whether secrets are configured.

It must not reveal secret values.

## `system status`

A future command may report operational readiness:

- Database reachable.
- Snapshot storage writable.
- Workspace resolvable.
- Notion credential configured.
- Notion connection verified when explicitly requested.

Configuration validity and external connectivity must remain distinct.

## Diagnostic Statuses

Candidate statuses:

- Valid.
- Invalid.
- Missing.
- Not Required.
- Configured.
- Redacted.
- Unverified.

---

# Redacted Configuration View

## Purpose

Provide safe diagnostics without exposing secrets.

## Conceptual Example

```json
{
  "environment": "development",
  "database": {
    "url": "postgresql://user:***@localhost:5432/ai_playbook_engine",
    "poolMin": 1,
    "poolMax": 10
  },
  "snapshotStorage": {
    "type": "local",
    "rootConfigured": true,
    "maximumPayloadBytes": 52428800
  },
  "notion": {
    "credentialReference": "notion-primary",
    "tokenConfigured": true,
    "requestTimeoutMs": 30000
  },
  "workspace": {
    "workspaceIdConfigured": true
  }
}
```

## Rules

- Secret fields never expose raw values.
- Password-bearing URLs are redacted.
- Physical paths may be hidden or shortened in non-debug mode.
- Unknown arbitrary values must not be reflected without review.
- Redacted output must be safe for bug reports.

---

# Configuration Error Codes

Candidate codes:

```text
CONFIGURATION_INVALID
CONFIGURATION_VALUE_MISSING
CONFIGURATION_VALUE_INVALID
CONFIGURATION_SOURCE_UNREADABLE
CONFIGURATION_FILE_NOT_FOUND
CONFIGURATION_FILE_INVALID
CONFIGURATION_OVERRIDE_INVALID
DATABASE_CONFIGURATION_INVALID
SNAPSHOT_STORAGE_CONFIGURATION_INVALID
NOTION_CONFIGURATION_INVALID
NOTION_CREDENTIAL_CONFIGURATION_MISSING
LOGGING_CONFIGURATION_INVALID
CLI_CONFIGURATION_INVALID
SYNCHRONIZATION_CONFIGURATION_INVALID
PERSONAL_WORKSPACE_CONFIGURATION_INVALID
UNKNOWN_CONFIGURATION_KEY
DEPRECATED_CONFIGURATION_KEY
```

## Error Details

Safe details may include:

- Configuration key.
- Section.
- Expected format.
- Allowed values.
- Minimum or maximum.
- Source name.

They must not include the rejected secret value.

---

# Environment-Specific Rules

## Development

May allow:

- Pretty logs.
- Local storage paths.
- Local PostgreSQL.
- More verbose diagnostics.
- Optional automatic `.env` loading.

Must still preserve secret redaction.

## Test

Must:

- Avoid loading developer `.env` by default.
- Use isolated temporary storage.
- Use test database configuration.
- Use fake credentials.
- Disable interactive CLI behavior.
- Produce deterministic values.

## Production

Must:

- Require explicit database configuration.
- Require explicit storage configuration.
- Avoid Debug logging by default.
- Avoid unsafe TLS defaults.
- Avoid implicit `.env` discovery unless deployment explicitly uses it.
- Fail on deprecated or unknown critical keys in strict mode.
- Never auto-initialize domain state silently.

---

# `.env` Files

## Version 1 Local Development

A local `.env` file may be supported for developer convenience.

Rules:

- `.env` is ignored by Git.
- `.env.example` is committed.
- `.env.example` contains no real secrets.
- Loading behavior is explicit and limited to approved environments.
- Test execution does not load `.env` automatically unless explicitly requested.
- Production behavior does not assume `.env` exists.

## `.env.example`

Must document:

- Variable name.
- Purpose.
- Required or optional.
- Safe example.
- Unit.
- Allowed values.
- Related command capability.

Secret examples use placeholders:

```text
AI_PLAYBOOK_ENGINE_NOTION_TOKEN=secret_your_test_token_here
```

Never use a real token.

---

# Precedence Conflict Diagnostics

When multiple sources provide the same value, diagnostics may report:

```text
effective source: cli_override
overrode: environment
```

For secrets, report only source names.

A lower-precedence invalid value may be ignored when a higher-precedence valid value replaces it, but strict diagnostic mode may still warn.

---

# Unknown Configuration Keys

## Purpose

Detect typos and obsolete settings.

## Rules

- Unknown keys with the project prefix should produce a warning in Development.
- Production strict mode may treat unknown keys as errors.
- Non-project environment variables are ignored.
- Deprecated keys produce a dedicated warning or error.
- Suggestions may be offered when a known key is similar.

Example:

```text
AI_PLAYBOOK_ENGINE_LOG_LEVL
```

could suggest:

```text
AI_PLAYBOOK_ENGINE_LOG_LEVEL
```

The implementation must avoid exposing unrelated environment variables.

---

# Configuration Versioning

## Schema Version

The configuration model may have an internal schema version.

Versioning supports:

- Deprecation.
- Migration.
- Diagnostics.
- Future configuration files.

## Rules

- Environment-variable configurations do not require users to provide a schema version initially.
- Configuration-file formats should include a version when introduced.
- Breaking configuration changes require migration documentation.
- Deprecated settings must not disappear without notice.
- Persisted historical domain records do not depend on current runtime configuration except through recorded snapshots of relevant operational values.

---

# Recording Runtime Configuration in History

Historical operations must preserve relevant effective operational values.

Examples for SynchronizationRun:

- Maximum traversal depth.
- Parser version.
- Retry policy version.
- External root reference.
- Source settings.
- Credential reference identifier.

Do not persist:

- Secret token.
- Database URL.
- Full global ApplicationConfig.

## Rule

Persist only the configuration required to explain or reproduce the operation.

Historical configuration snapshots belong to the relevant operational record, not to the Config package.

---

# Configuration and Domain Policies

Runtime configuration must not override documented domain decisions.

Prohibited examples:

```text
AUTO_PUBLISH_AFTER_VALIDATION=true
ALLOW_MULTIPLE_ENABLED_SOURCES=true
ALLOW_EDIT_PUBLISHED_VERSION=true
RESET_FAILED_SYNCHRONIZATION=true
```

Such behavior is a domain decision and cannot be enabled through configuration without prior architectural approval.

Configuration may tune an approved policy only when the allowed range is documented.

---

# Construction and Dependency Injection

Composition roots receive validated configuration and construct dependencies.

Conceptual flow:

```text
loadConfiguration()
        ↓
validate required capability sections
        ↓
create logger
        ↓
create database connection
        ↓
create repositories
        ↓
create snapshot storage
        ↓
create Notion adapter
        ↓
create application use cases
        ↓
execute CLI command
```

## Rules

- Configuration objects are passed explicitly.
- No global mutable configuration singleton.
- No service locator.
- No package reads configuration after composition unless explicitly injected.
- Tests can replace configuration easily.

---

# Configuration Object Scope

Consumers should receive the smallest relevant configuration object.

Preferred:

```text
LocalSnapshotStorage receives SnapshotStorageConfig.
```

Avoid:

```text
LocalSnapshotStorage receives CompleteApplicationConfig.
```

This reduces coupling and accidental secret exposure.

---

# Logging Configuration Safely

The logger may receive redaction paths or policies.

The Config loader must not log raw configuration before redaction is active.

Startup sequence should:

1. Create a minimal safe bootstrap logger.
2. Load and validate configuration.
3. Create the configured logger.
4. Log redacted startup diagnostics.

A configuration failure must still be reported safely.

---

# Testing Requirements

## Configuration Parsing Tests

Test:

- Required fields.
- Optional fields.
- Defaults.
- Number parsing.
- Boolean parsing.
- Enum parsing.
- UUID parsing.
- Duration parsing.
- Empty strings.
- Surrounding whitespace.
- Invalid formats.
- Range constraints.

## Precedence Tests

Test:

- Environment overrides file.
- CLI overrides environment.
- Defaults apply only when no source supplies a value.
- Test injection has highest precedence.
- Nested fields merge correctly.
- Secret values remain redacted.

## Cross-Field Validation Tests

Test:

- Database pool bounds.
- Retry delay ordering.
- Production restrictions.
- Workspace bootstrap rules.
- CLI JSON and interactive compatibility.
- Snapshot size and process limits.

## Capability Validation Tests

Test:

- Workspace-only command without Notion.
- Knowledge query without Notion.
- Synchronization command missing Notion.
- Synchronization command missing storage.
- Config validation across all sections.

## Redaction Tests

Test that diagnostics never expose:

- Notion token.
- Database password.
- Full connection string.
- Secret environment value.
- Authorization metadata.

## Environment Isolation Tests

Test:

- Unit tests do not load developer `.env`.
- Production mode does not use unsafe Development defaults.
- Test paths use temporary directories.
- Live Notion tests require explicit opt-in.

---

# Architecture Rules

The following are prohibited:

- `process.env` access outside Config.
- Core importing Config.
- Application importing Config.
- Notion loading environment variables.
- Infrastructure constructing its own global configuration.
- CLI commands reading secrets directly.
- Passing complete configuration objects everywhere.
- Logging configuration before redaction.
- Using configuration to bypass domain invariants.
- Persisting raw secrets.
- Committing real `.env` files.
- Using developer machine defaults in tests.
- Silently accepting invalid numeric values.

---

# Version 1 Initial Configuration Set

The first implementation is expected to require configuration equivalent to:

## Common

- Application environment.
- Log level.
- CLI output mode.

## Database

- PostgreSQL connection URL.
- Pool maximum.
- Connection timeout.

## Snapshot Storage

- Local storage root.
- Maximum payload size.

## Personal Workspace

- Current WorkspaceId after initialization.

## Notion

- Credential reference.
- Token.
- Request timeout.
- Maximum retries.

## Synchronization

- Maximum traversal depth.
- Maximum source objects.
- Maximum payload size.
- Stale-running threshold.

Only settings required by implemented behavior should be added.

---

# Deferred Decisions

The following remain deferred:

- Configuration-file format.
- Cloud secret manager.
- Encrypted local secret store.
- Interactive configuration wizard.
- Live configuration reload.
- API-specific configuration.
- Worker and queue configuration.
- AI-provider configuration.
- Tenant-specific runtime configuration.
- Remote feature flags.
- Dynamic policy management.
- Centralized configuration service.

These future decisions must preserve the package and security boundaries defined here.

---

# Approved Version 1 Direction

Version 1 will use:

- `packages/config` as the only environment-reading package.
- Typed immutable configuration.
- Capability-aware validation.
- Environment variables as the minimum source.
- Optional local `.env` support for Development.
- Explicit source precedence.
- Redacted diagnostics.
- Separate secret references and values.
- Focused configuration sections.
- Explicit units and bounds.
- No live reload.
- No global mutable configuration singleton.
- No domain behavior controlled by undocumented feature flags.
- `.env.example` with fake values.
- Direct test configuration injection.

---

# Completion Criteria

Configuration contracts are ready for implementation when:

- Configuration ownership is explicit.
- Environment access is isolated.
- Source precedence is defined.
- Required sections are typed and validated.
- Command capability requirements can be expressed.
- Secrets cannot enter normal diagnostics.
- Personal Workspace resolution is centralized.
- Historical operations can record relevant effective settings.
- Production, Development and Test behavior are distinguishable.
- Tests can construct configuration without developer environment leakage.
