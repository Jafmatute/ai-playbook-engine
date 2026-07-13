# AI Playbook Engine — Storage Contracts

## Purpose

This document defines the storage contracts used by AI Playbook Engine version 1 for immutable synchronization snapshot payloads and related large artifacts.

It establishes:

- The separation between structured metadata and payload storage.
- Snapshot storage responsibilities.
- Atomic write behavior.
- Checksum verification.
- Deduplication boundaries.
- Storage references.
- Workspace isolation.
- Failure and recovery behavior.
- Orphaned payload handling.
- Security requirements.
- Testing expectations.

This document does not define:

- The final local directory layout.
- Cloud object-storage configuration.
- Database tables.
- Compression algorithms.
- Backup infrastructure.
- Snapshot-retention policies.
- Project artifact storage.
- User-uploaded file storage.

Version 1 uses local file storage through an abstraction that permits a future object-storage implementation.

---

# Storage Principles

## Metadata and Payload Are Separate

PostgreSQL stores authoritative structured metadata.

Snapshot storage holds the potentially large source-aligned payload.

Conceptual separation:

```text
PostgreSQL
├── SynchronizationSnapshotId
├── WorkspaceId
├── PlaybookSourceId
├── SynchronizationRunId
├── ContentChecksum
├── StorageReference
├── StorageFormat
├── Schema versions
├── Item counts
└── Timestamps

Snapshot Storage
└── Immutable serialized payload
```

The payload must not be stored directly inside Aggregate state.

## Snapshot Identity Is Independent from Location

`SynchronizationSnapshotId` identifies the domain record.

`StorageReference` identifies where its payload can be retrieved.

Moving a payload must not change:

- Snapshot identity.
- Snapshot checksum.
- Synchronization lineage.
- Playbook Version references.

## Storage Is Accessed Through a Port

Application code must access payload storage through an Application-owned contract.

It must not call:

- Node file-system APIs directly.
- Operating-system paths directly.
- Cloud SDKs directly.
- Infrastructure-specific storage classes directly.

## Payloads Are Immutable

Once a snapshot payload is committed successfully:

- It must not be overwritten.
- It must not be edited in place.
- It must not be replaced with different content under the same reference.
- Its checksum must remain valid.

Corrections require a new Synchronization Snapshot.

## Storage Failures Must Be Explicit

Storage failures must not be hidden or converted into successful snapshots.

A Synchronization Run cannot complete successfully unless:

- The payload was stored.
- The stored content can be associated with a StorageReference.
- The expected checksum was recorded.
- Snapshot metadata was persisted.
- The run was transitioned to Completed.

---

# Version 1 Storage Scope

Version 1 storage includes:

- Raw or source-aligned Synchronization Snapshot payloads.
- Optional intermediate serialized snapshot representations when required for reprocessing.
- Temporary files used during atomic write operations.
- Safe diagnostic metadata required for storage recovery.

Version 1 does not include:

- Project source-code artifacts.
- Generated reports.
- User uploads.
- AI provider files.
- Embedding indexes.
- Media processing.
- Cloud object storage.
- Retention and deletion policies.

---

# StorageReference

## Purpose

`StorageReference` is an opaque application and domain-safe reference to a stored payload.

It must not expose storage implementation assumptions.

## Characteristics

A StorageReference must:

- Be immutable from the perspective of normal application use.
- Be safe to persist.
- Be safe to serialize in internal diagnostics.
- Avoid containing credentials.
- Avoid exposing unrestricted local file paths.
- Resolve through the configured storage adapter.
- Remain stable across application restarts.

## Prohibited Representation

Application and Core contracts must not use:

```text
D:\Dev\code\IA\ai-playbook-engine\data\snapshots\payload.json
```

as the public StorageReference.

Instead, use an opaque logical reference such as:

```text
snapshots/019.../payload.json
```

or another implementation-neutral key.

The Infrastructure adapter maps that key to an actual local path.

## Reference Validation

A StorageReference must reject:

- Empty values.
- Absolute paths when logical references are required.
- Parent-directory traversal.
- Null bytes.
- Invalid separators.
- Unsupported schemes.
- References outside the configured storage root.

---

# Snapshot Payload

## Purpose

The Snapshot Payload preserves the exact source-aligned state retrieved during synchronization.

It must support:

- Reprocessing.
- Source comparison.
- Traceability.
- Parser regression testing.
- Diagnosis of mapping failures.
- Verification of normalized knowledge lineage.

## Payload Characteristics

A payload must be:

- Immutable.
- Canonically serializable.
- Versioned by schema.
- Checksum-verifiable.
- Independent from active Notion SDK objects.
- Readable after application restart.
- Bounded by configured size limits.
- Safe to process without executing embedded content.

## Recommended Format

Version 1 should use a JSON-compatible serialized format.

The payload may include:

- Source metadata.
- External object identifiers.
- Object types.
- Parent relationships.
- Properties.
- Rich-text structures.
- Block hierarchy.
- Retrieval diagnostics.
- Unsupported-object placeholders.
- Source last-edited timestamps.

The stored representation must not require the Notion SDK to deserialize.

## Raw Versus Source-Aligned

The stored payload does not need to be a byte-for-byte copy of every SDK response.

It may be a deterministic source-aligned representation produced by the Notion adapter.

However, it must preserve enough information to:

- Reconstruct normalization inputs.
- Re-run supported parsing.
- Trace normalized items back to source objects.
- Diagnose unsupported structures.
- Detect meaningful source changes.

---

# SnapshotStorage Contract

## Ownership

The interface belongs in:

```text
packages/application
```

The local file implementation belongs in:

```text
packages/infrastructure
```

## Conceptual Operations

### Write Payload

```text
writeSnapshotPayload(input)
```

Conceptual input:

- WorkspaceId.
- SynchronizationSnapshotId.
- Expected ContentChecksum.
- Storage format.
- Schema version.
- Canonical payload bytes or serializable representation.
- CorrelationId when operational context is required.

Conceptual output:

- StorageReference.
- Stored byte size.
- Verified checksum.
- Deduplication indicator when relevant.
- Storage metadata safe for persistence.

### Read Payload

```text
readSnapshotPayload(storageReference, expectedChecksum)
```

Conceptual output:

- Payload bytes or parsed source-aligned representation.
- Actual checksum.
- Storage metadata.

### Verify Payload

```text
verifySnapshotPayload(storageReference, expectedChecksum)
```

Conceptual output:

- Exists.
- Checksum matches.
- Byte size.
- Verification timestamp.

### Check Existence

```text
exists(storageReference)
```

This supports diagnostics and recovery.

It must not replace checksum verification when correctness matters.

## No General Delete

Version 1 does not expose a normal application-level delete operation.

Deletion requires a future retention or cleanup policy.

An internal temporary-file cleanup operation may exist inside Infrastructure.

---

# Atomic Write Behavior

## Requirement

A failed or interrupted write must not leave a partial payload visible as a committed snapshot.

## Approved Write Pattern

The local storage adapter should conceptually:

1. Validate the logical StorageReference target.
2. Create required directories safely.
3. Serialize or receive canonical payload bytes.
4. Calculate or verify the expected checksum.
5. Write to a temporary file in the target storage area.
6. Flush and close the temporary file.
7. Verify the temporary file checksum.
8. Atomically move or rename the temporary file to the final location.
9. Return the committed StorageReference.
10. Remove temporary files when failures occur.

## Visibility Rule

Readers must only access the final committed path.

Temporary paths must not be returned as StorageReference values.

## Existing Target

If the final target already exists:

- Read or verify the existing checksum.
- If the checksum matches, treat the operation as idempotent.
- If the checksum differs, return a storage conflict.
- Never overwrite different content silently.

## Platform Considerations

Atomic rename behavior may differ across operating systems and filesystems.

The implementation must:

- Keep temporary and final files on the same filesystem.
- Use a rename or move operation with documented atomic expectations.
- Handle Windows file-lock behavior.
- Avoid copy-then-delete as the assumed atomic operation.
- Include integration tests on the supported local environment where practical.

---

# Checksum Rules

## Authoritative Checksum

The application supplies or coordinates the expected `ContentChecksum`.

The Storage adapter verifies that the stored bytes match it.

## Checksum Stages

Recommended flow:

```text
Canonical payload
      ↓
Calculate checksum
      ↓
Write temporary file
      ↓
Calculate checksum from stored bytes
      ↓
Compare
      ↓
Commit final file
```

## Mismatch

A checksum mismatch must fail the operation with:

```text
SNAPSHOT_STORAGE_CHECKSUM_MISMATCH
```

The payload must not be considered committed.

## Read Verification

When reading payload for:

- Normalization.
- Reprocessing.
- Snapshot comparison.
- Recovery.

the caller may require checksum verification.

Version 1 should verify checksum before normalization.

## Algorithm Metadata

Snapshot metadata must preserve:

- Checksum algorithm.
- Canonicalization or payload schema version when required.
- Checksum value.

The algorithm must not be inferred only from checksum length.

---

# Deduplication

## Domain Decision

Every successful Synchronization Run produces its own Synchronization Snapshot metadata record.

Payload storage may deduplicate identical content internally.

## Deduplication Boundary

Deduplication is a Storage implementation optimization.

It must not change the domain relationship:

```text
one successful run
    ↓
one snapshot metadata record
```

Several snapshot records may reference the same immutable physical payload only when the storage abstraction preserves correctness.

## Approved Strategies

### Strategy A — No Physical Deduplication

Each Snapshot gets its own payload.

Advantages:

- Simplest.
- Clear ownership.
- Simple cleanup.

Disadvantages:

- Duplicate storage.

### Strategy B — Content-Addressed Payload

Payload key derives partly from checksum.

Several Snapshots may reference the same payload.

Advantages:

- Efficient storage.
- Natural idempotency.

Disadvantages:

- Future deletion requires reference tracking.
- Storage layout becomes checksum-aware.
- Corruption may affect several snapshots.

## Version 1 Recommendation

Use a content-aware but snapshot-addressable layout without implementing shared-reference deletion semantics.

An example conceptual key:

```text
snapshots/{workspaceId}/{snapshotId}/{checksum}.json
```

This does not deduplicate across Snapshot IDs.

A later optimization may introduce a content-addressed object store.

Version 1 should prioritize correctness over storage optimization.

## Idempotent Same-Snapshot Write

Writing the same Snapshot payload again with the same checksum may return the existing reference.

Writing the same Snapshot identity with different content must fail.

---

# Storage Key Generation

## Ownership

Infrastructure owns concrete storage-key generation.

Application supplies domain identifiers and storage intent.

## Conceptual Inputs

- WorkspaceId.
- SynchronizationSnapshotId.
- ContentChecksum.
- Storage format.

## Requirements

Generated keys must:

- Be deterministic for the same Snapshot when idempotency is required.
- Stay inside the configured root.
- Avoid raw user-controlled path segments.
- Use canonical identifier strings.
- Avoid reserved operating-system names.
- Use a bounded depth.
- Not expose credentials.
- Not use Playbook names or titles as path identity.

## Example Conceptual Layout

```text
storage-root/
└── workspaces/
    └── {workspaceId}/
        └── synchronization-snapshots/
            └── {snapshotId}/
                └── payload.json
```

This is guidance, not a public contract.

---

# Workspace Isolation

## Logical Isolation

Storage keys must include Workspace ownership directly or through a storage namespace.

A Workspace must not be able to resolve another Workspace's payload through normal contracts.

## Read Rule

A read operation should validate:

- StorageReference format.
- Expected Workspace context where part of the contract.
- Snapshot metadata ownership before storage access.
- Final resolved path remains under the configured Workspace namespace.

## Information Disclosure

A cross-Workspace or invalid reference should return a not-found or invalid-reference outcome appropriate to the Application contract.

It must not expose the physical path of another Workspace.

## Future SaaS Compatibility

Version 1 local storage is not complete tenant-grade physical isolation.

The abstraction must permit future implementations using:

- Object-storage prefixes.
- Tenant-specific buckets.
- Separate encryption keys.
- Separate storage accounts.

---

# Transaction Boundary with PostgreSQL

File storage and PostgreSQL do not share one atomic transaction.

The application must coordinate them explicitly.

## Snapshot Completion Flow

Recommended flow:

1. Retrieve and canonicalize source payload.
2. Calculate checksum.
3. Allocate SynchronizationSnapshotId.
4. Write and verify payload in SnapshotStorage.
5. Begin PostgreSQL transaction.
6. Insert Synchronization Snapshot metadata.
7. Transition Synchronization Run to Completed.
8. Update Playbook Source success metadata.
9. Commit PostgreSQL transaction.

## Failure Before Storage Commit

If retrieval, serialization or checksum calculation fails:

- No final payload should exist.
- Synchronization Run becomes Failed.
- No Snapshot metadata is inserted.

## Failure During Storage Write

If the storage write fails:

- No Snapshot metadata is inserted.
- Synchronization Run becomes Failed.
- Temporary files are cleaned where possible.
- Failure information identifies the storage stage.

## Failure After Storage Commit but Before Database Commit

This creates a possible orphaned payload.

The application must:

- Fail the database transaction.
- Mark or later recover the Synchronization Run safely.
- Record enough context for orphan detection.
- Avoid deleting the payload blindly if database commit status is uncertain.

## Failure After Database Commit

The Snapshot is authoritative.

Later read or checksum failures are storage-integrity incidents.

---

# Orphaned Payloads

## Definition

An orphaned payload exists in storage but has no authoritative SynchronizationSnapshot metadata record.

Possible causes:

- Database transaction failure after successful storage write.
- Process termination between storage and database commit.
- Manual storage copying.
- Failed cleanup.

## Recovery Strategy

Version 1 should support an Infrastructure-level diagnostic scan.

Conceptual operation:

```text
findOrphanedSnapshotPayloads()
```

The normal Application API does not need to expose this initially.

## Orphan Identification

A candidate payload is orphaned when:

- It matches the managed storage-key pattern.
- No authoritative Snapshot metadata references it.
- It is not a known temporary file.
- It is older than a configured safety interval.

## Safety Interval

Do not classify very recent files as orphaned because a database transaction may still be completing.

## Cleanup Rule

Automatic deletion is deferred.

Version 1 may:

- Report orphaned payloads.
- Log safe details.
- Provide a future administrative cleanup command.
- Move confirmed orphaned files into quarantine when explicitly approved.

## Quarantine

A future safe cleanup strategy may:

1. Move the payload to a quarantine area.
2. Preserve checksum and original reference.
3. Wait through a retention interval.
4. Delete only after explicit confirmation.

---

# Missing Payloads

## Definition

Snapshot metadata exists, but the referenced payload does not.

This is a storage-integrity failure.

## Behavior

Reading the Snapshot should produce:

```text
SNAPSHOT_STORAGE_NOT_FOUND
```

The system must not:

- Recreate content silently from current Notion state.
- Point the Snapshot to a different payload.
- Mark the historical Snapshot as valid.
- Continue normalization.

## Diagnostics

Record safely:

- SnapshotId.
- StorageReference.
- WorkspaceId.
- Expected checksum.
- Operation.
- CorrelationId.

Do not expose the physical path in normal CLI output.

---

# Corrupted Payloads

## Definition

A payload exists, but:

- Its checksum does not match.
- It cannot be deserialized.
- Its storage format is invalid.
- Its schema version is unsupported.

## Behavior

The system must fail before normalization or comparison.

Candidate errors:

```text
SNAPSHOT_STORAGE_CHECKSUM_MISMATCH
SNAPSHOT_STORAGE_SERIALIZATION_FAILED
SNAPSHOT_SCHEMA_UNSUPPORTED
```

## Historical Integrity

Corrupted historical payloads must not be overwritten automatically.

Recovery may require:

- Restoring from backup.
- Re-synchronizing into a new Snapshot.
- Controlled administrative repair.

A new synchronization does not repair the historical Snapshot.

---

# Temporary Files

## Purpose

Temporary files support atomic writes.

## Requirements

Temporary files must:

- Use a managed naming convention.
- Be stored inside the configured storage root.
- Avoid exposing source titles.
- Not be returned as StorageReference.
- Be removed after successful commit.
- Be removed after failure when safe.
- Be eligible for stale-file recovery.

## Stale Temporary Files

Version 1 may include startup or diagnostic cleanup for temporary files older than a configured interval.

Cleanup must not remove:

- Final committed payloads.
- Recently active temporary files.
- Unknown files outside the managed pattern.

---

# Serialization Contract

## Canonical Serialization

The serialized payload must be deterministic for the same source-aligned input and schema version.

Canonical rules must define:

- Stable object-key ordering.
- Stable collection ordering where semantic ordering exists.
- UTF-8 encoding.
- LF line endings when textual.
- Unicode normalization.
- Timestamp representation.
- Omission of undefined fields.
- Explicit handling of null values.
- Numeric serialization.
- Unsupported-content representation.

## Pretty Printing

Pretty printing may improve diagnostics but can affect checksums.

The canonical serializer must choose one stable format.

Human-readable formatting must not vary by environment.

## Schema Version

Every payload must identify its storage or snapshot schema version.

The schema version allows:

- Compatible reading.
- Reprocessing decisions.
- Controlled migrations.
- Rejection of unsupported representations.

---

# Compression

## Version 1 Decision

Compression is not required initially.

## Conditions for Introduction

Compression may be added when:

- Representative snapshots are materially large.
- Storage or I/O becomes a measured problem.
- Streaming decompression can be implemented safely.
- Checksum semantics are clearly defined.

## Checksum Semantics

If compression is introduced later, the system must specify whether checksum applies to:

- Canonical uncompressed content.
- Stored compressed bytes.
- Both.

A change requires explicit migration and compatibility rules.

---

# Size Limits

## Purpose

Protect the local system from unbounded payload writes and reads.

## Candidate Limits

Configuration may define:

- Maximum total snapshot size.
- Maximum individual source object size.
- Maximum block count.
- Maximum traversal depth.
- Maximum in-memory serialization size.

## Behavior

Exceeding a limit must produce a stable error.

Candidate codes:

```text
SNAPSHOT_PAYLOAD_TOO_LARGE
SOURCE_OBJECT_LIMIT_EXCEEDED
SOURCE_TRAVERSAL_LIMIT_EXCEEDED
```

## Streaming

Version 1 may use in-memory serialization only if representative snapshot sizes remain bounded.

If real Playbook size makes this unsafe, the storage contract should support streaming.

The domain model must not assume that the entire payload is always loaded into memory.

---

# File-System Security

## Root Directory

The local storage adapter receives one validated root directory from Config.

It must:

- Resolve it to a canonical path.
- Create it when permitted.
- Verify write access.
- Refuse unsafe or invalid paths.
- Avoid following untrusted path components.

## Path Traversal

All logical references must be resolved safely.

After resolution, the final path must remain within the configured root.

Reject:

```text
../
..\
absolute paths
drive changes
UNC paths when unsupported
null bytes
unexpected URI schemes
```

## Symbolic Links

Symlink behavior must be considered explicitly.

Preferred version 1 direction:

- Do not follow symlinks that escape the configured storage root.
- Validate resolved real paths where supported.
- Document limitations on Windows junctions and symlinks.
- Keep managed directories under application control.

## File Permissions

Version 1 should use restrictive permissions supported by the operating system.

The system must not claim uniform Unix-style permission behavior on Windows.

Sensitive credentials must never be stored in snapshot payloads.

---

# Secret and Sensitive Data Rules

## Credentials

Snapshot payloads must not contain:

- Notion integration tokens.
- Authorization headers.
- Database credentials.
- Environment secret values.

## Source Content

Playbook content itself may be private.

Logs must not include full payloads by default.

Error metadata should use:

- Object identifiers.
- Counts.
- Safe excerpts only when explicitly bounded.
- Checksums.
- Schema versions.

## CLI

Normal CLI output must not print the raw complete Snapshot payload unless a specific diagnostic command is later approved.

A future export command must clearly state its behavior.

---

# Storage Errors

## Candidate Codes

```text
SNAPSHOT_STORAGE_CONFIGURATION_INVALID
SNAPSHOT_STORAGE_REFERENCE_INVALID
SNAPSHOT_STORAGE_WRITE_FAILED
SNAPSHOT_STORAGE_READ_FAILED
SNAPSHOT_STORAGE_NOT_FOUND
SNAPSHOT_STORAGE_CONFLICT
SNAPSHOT_STORAGE_CHECKSUM_MISMATCH
SNAPSHOT_STORAGE_SERIALIZATION_FAILED
SNAPSHOT_STORAGE_SCHEMA_UNSUPPORTED
SNAPSHOT_PAYLOAD_TOO_LARGE
SNAPSHOT_TEMPORARY_FILE_CLEANUP_FAILED
SNAPSHOT_ORPHAN_DETECTED
```

## Retryability

Potentially retryable:

- Temporary write lock.
- Transient file-system unavailable.
- Temporary read failure.
- Temporary disk access issue.

Normally non-retryable without intervention:

- Invalid StorageReference.
- Checksum mismatch.
- Unsupported schema.
- Payload too large.
- Different content already committed under the same Snapshot identity.
- Path outside storage root.

## Disk Capacity

Insufficient disk space should translate to a storage write failure with safe diagnostic classification when detectable.

The normal message must not expose unrelated file-system paths.

---

# SnapshotStorage Result Model

Conceptual successful write result:

```text
SnapshotWriteResult
- StorageReference
- ContentChecksum
- ByteSize
- StorageFormat
- SchemaVersion
- WasAlreadyPresent
```

Conceptual verification result:

```text
SnapshotVerificationResult
- Exists
- ChecksumMatches
- ActualChecksum
- ByteSize
- StorageFormat
- SchemaVersion
```

The exact TypeScript types will be defined in Application contracts.

---

# Idempotency

## Same Snapshot and Same Content

Repeated write with:

- Same SnapshotId.
- Same canonical content.
- Same checksum.
- Same format and schema.

may return the prior StorageReference.

## Same Snapshot and Different Content

Must fail with:

```text
SNAPSHOT_STORAGE_CONFLICT
```

## Same Content and Different Snapshot

Version 1 may store a separate payload.

Physical deduplication is optional and must remain invisible to domain behavior.

---

# Read Consistency

## Read-After-Write

After a successful write result is returned, the adapter must support reading the committed payload.

## Partial Visibility

Readers must not observe:

- Temporary files.
- Partially written payloads.
- Files before checksum verification.

## Concurrent Readers

Immutable final payloads may be read concurrently.

## Concurrent Writers

Only one final payload may be committed for one Snapshot identity.

Conflicting writers must not use last-write-wins behavior.

---

# Recovery of Interrupted Synchronization

## Running Run with Final Payload but No Snapshot Metadata

Possible after process interruption.

Recovery should:

1. Detect stale Running Synchronization Run.
2. Determine whether a managed payload exists for its intended Snapshot identity, when that identity was allocated.
3. Verify checksum and available staging metadata.
4. Avoid completing the run automatically unless all authoritative conditions are proven.
5. Prefer marking the run Failed and reporting the payload as orphaned.
6. Allow later controlled cleanup.

## Reasoning

Automatically reconstructing missing metadata risks:

- Associating the wrong payload.
- Missing source summary data.
- Hiding an incomplete transaction.
- Violating auditability.

Version 1 favors explicit failure and diagnostic recovery.

---

# Snapshot Storage Metadata

PostgreSQL snapshot metadata should eventually preserve:

- SynchronizationSnapshotId.
- WorkspaceId.
- PlaybookSourceId.
- SynchronizationRunId.
- StorageReference.
- Storage format.
- Storage schema version.
- Content checksum algorithm.
- Content checksum value.
- Byte size.
- Source item counts.
- Created timestamp.
- Optional payload deduplication metadata.
- Optional storage verification timestamp.

The exact relational model will be defined during data modeling.

---

# Storage Adapter Configuration

Version 1 local storage configuration should include:

- Storage root directory.
- Temporary-file suffix or managed subdirectory.
- Maximum payload size.
- Optional stale temporary-file age.
- Optional checksum verification behavior for reads.
- Optional file-sync behavior where supported.

Configuration must be:

- Validated at startup.
- Redacted safely.
- Independent from Core.
- Injected into Infrastructure.
- Documented in `.env.example` later.

---

# Package Responsibilities

## Core

Owns:

- SynchronizationSnapshot identity.
- ContentChecksum semantics.
- StorageReference Value Object when treated as domain-safe metadata.
- Snapshot immutability rules.

Core does not perform file operations.

## Application

Owns:

- SnapshotStorage port.
- Snapshot write and read orchestration.
- Compensation and recovery workflow contracts.
- Application-facing storage errors.
- Transaction coordination with repositories.

## Config

Owns:

- Validated local-storage configuration.
- Safe diagnostic representation.

## Infrastructure

Owns:

- Local file storage implementation.
- Path generation.
- Atomic write mechanics.
- Checksum verification over stored bytes.
- Temporary-file management.
- Orphan scanning.
- Safe file-system error translation.

## Notion

Produces source-aligned payload input.

It does not write files directly.

## CLI

Invokes Application use cases and renders safe storage errors.

It does not resolve storage paths directly.

---

# Testing Requirements

## Unit Tests

Test:

- StorageReference validation.
- Storage-key generation.
- Path traversal rejection.
- Canonical serialization.
- Checksum calculation input consistency.
- Idempotent write decision.
- Conflict detection.
- Size-limit enforcement.

## Integration Tests

Using a temporary directory, test:

- Successful atomic write.
- Read-after-write.
- Checksum verification.
- Same Snapshot and same content.
- Same Snapshot and different content.
- Missing payload.
- Corrupted payload.
- Temporary-file cleanup.
- Concurrent write attempts.
- Workspace path isolation.
- Invalid StorageReference.
- Process-like interruption between temporary write and rename where practical.

## Contract Tests

Every SnapshotStorage implementation must pass common tests for:

- Write.
- Read.
- Verify.
- Existence.
- Immutability.
- Idempotency.
- Conflict behavior.
- Error translation.

## Recovery Tests

Test:

- Orphan detection.
- Recent files excluded by safety interval.
- Stale temporary-file detection.
- Metadata without payload.
- Payload without metadata.
- Corrupted orphan payload.
- No automatic deletion.

## Security Tests

Test:

- Traversal attempts.
- Absolute-path injection.
- Mixed path separators.
- Symlink or junction escape where supported.
- Secret values absent from error serialization.
- Physical paths absent from normal Application errors.

---

# Architecture Rules

The following are prohibited:

- Core importing Node file-system APIs.
- Application constructing local paths.
- Notion writing Snapshot files.
- CLI opening Snapshot files directly.
- Persistence repository storing arbitrary payload bytes without the Storage port.
- Storage adapter changing Synchronization Run state.
- Storage adapter inserting Snapshot metadata into PostgreSQL.
- Domain using StorageReference as Snapshot identity.
- Snapshot completion without successful storage verification.

---

# Version 1 Operational Commands

The following future CLI operations may use these contracts:

```text
sync start
snapshot show
snapshot compare
system status
```

Possible future diagnostic operations:

```text
storage verify
storage scan-orphans
storage scan-temporary
```

Diagnostic and cleanup commands are not required until their Application use cases are explicitly designed.

No direct file-management command should bypass repository and storage contracts.

---

# Deferred Decisions

The following remain deferred:

- Exact local directory layout.
- Whether JSON payloads are pretty-printed.
- Streaming write implementation.
- Compression.
- Shared content-addressed deduplication.
- Automatic orphan cleanup.
- Retention policies.
- Snapshot deletion.
- Cloud object-storage provider.
- Encryption at rest beyond operating-system and infrastructure controls.
- Backup and restore.
- Storage migration tooling.
- Project artifact storage.
- Report storage.

These decisions must preserve the contracts and immutability rules defined here.

---

# Approved Version 1 Direction

Version 1 will use:

- PostgreSQL for authoritative Snapshot metadata.
- Local file storage for immutable payloads.
- Application-owned SnapshotStorage contract.
- Infrastructure-owned local adapter.
- Opaque StorageReference values.
- Canonical JSON-compatible payloads.
- Atomic temporary-write plus rename behavior.
- Checksum verification before commit and before normalization.
- One metadata Snapshot per successful Synchronization Run.
- No required physical deduplication.
- Explicit orphan detection.
- No automatic payload deletion.
- Workspace-aware storage namespaces.
- Strict path validation.
- Safe error translation.
- Contract and integration tests.

---

# Completion Criteria

Storage contracts are ready for implementation when:

- Snapshot metadata and payload responsibilities are separate.
- StorageReference is opaque and safe.
- Atomic write behavior is defined.
- Checksum verification is mandatory at correctness boundaries.
- Duplicate and conflicting writes are distinguishable.
- Database and storage coordination failures are understood.
- Orphaned and missing payload behavior is explicit.
- Workspace isolation is preserved.
- Security and path rules are documented.
- Local and future object-storage adapters can implement the same conceptual port.
