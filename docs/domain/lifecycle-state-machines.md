# AI Playbook Engine — Lifecycle State Machines

## Purpose

This document defines the initial lifecycle state machines for:

- Synchronization Run.
- Playbook Version.
- Execution.

These state machines establish:

- Valid states.
- Valid transitions.
- Terminal states.
- Required transition data.
- Invalid transitions.
- Initial consistency rules.

They do not define:

- TypeScript enums.
- Database columns.
- API endpoints.
- Queue implementation.
- Retry infrastructure.
- Final error taxonomy.

The state machines must be refined through use-case modeling before implementation.

## General Lifecycle Rules

All lifecycle transitions must:

- Be explicit.
- Be validated by the Aggregate responsible for the state.
- Preserve transition timestamps.
- Preserve failure information.
- Avoid silently rewriting historical state.
- Be idempotent where application retries may repeat the same command.
- Reject transitions that contradict the current state.

Terminal states must not return to active states unless an explicit recovery model is defined.

Retries must not erase previous attempts.

A retry may:

- Create a new Aggregate.
- Create a new attempt inside an Aggregate.
- Resume an interrupted operation when explicitly supported.

The selected strategy must remain visible in the historical record.

---

# Synchronization Run Lifecycle

## Purpose

Synchronization Run represents one attempt to retrieve source content from a Playbook Source and produce a Synchronization Snapshot.

## States

### Pending

The run has been created but retrieval has not started.

Expected characteristics:

- Source has been selected.
- Workspace has been resolved.
- No retrieval work has started.
- No snapshot exists.
- No completion timestamp exists.

### Running

The run is actively retrieving or processing source-aligned content.

Expected characteristics:

- Start timestamp exists.
- Source identity is fixed.
- Progress may be recorded.
- Cursor or pagination metadata may exist.
- No terminal outcome has been recorded.

### Completed

The run completed successfully and produced a valid Synchronization Snapshot.

Expected characteristics:

- Completion timestamp exists.
- Snapshot identifier exists.
- Completion summary exists.
- No terminal error is active.
- Source retrieval is considered successful.

### Failed

The run ended unsuccessfully.

Expected characteristics:

- Completion timestamp exists.
- Failure information exists.
- No completed snapshot is associated.
- Partial retrieval data may exist for diagnostics but must not be treated as successful source state.

## State Diagram

```text
Pending
   │
   └── start ───────────────► Running

Running
   │
   ├── complete ────────────► Completed
   └── fail ────────────────► Failed
```

Terminal states:

- Completed.
- Failed.

## Valid Transitions

### Pending → Running

Command:

- Start synchronization.

Required conditions:

- Playbook Source exists.
- Source belongs to the same Workspace.
- Source is enabled.
- Required non-secret configuration is valid.
- Required credential reference exists.
- The run has not started previously.

Required transition data:

- Start timestamp.
- Source configuration snapshot or reference.
- Initial attempt metadata.

### Running → Completed

Command:

- Complete synchronization.

Required conditions:

- Retrieval finished successfully.
- A valid Synchronization Snapshot was created.
- Snapshot belongs to the same Workspace, source and run.
- Required completion metrics are available.
- Completion timestamp does not precede start timestamp.

Required transition data:

- Completion timestamp.
- Synchronization Snapshot identifier.
- Retrieved item counts.
- Change summary.
- Final cursor or source metadata where applicable.

### Running → Failed

Command:

- Fail synchronization.

Required conditions:

- A non-recoverable error occurred for the current attempt, or retry policy was exhausted.
- Failure has not already been recorded.

Required transition data:

- Completion timestamp.
- Structured failure information.
- Failure stage.
- Retryability classification.
- Provider or source error reference when applicable.

## Invalid Transitions

Examples:

- Completed → Running.
- Completed → Failed.
- Failed → Completed.
- Pending → Completed.
- Pending → Failed without an attempted start.
- Running → Pending.

## Retry Rule

A failed Synchronization Run must not be reset to Pending.

A retry creates a new Synchronization Run.

The new run may reference:

- The previous failed run.
- The same Playbook Source.
- Retry sequence metadata.

This preserves every attempt independently.

## Interrupted Run Recovery

Version 1 has no cancellation transition or CLI cancellation command. A process interrupted unexpectedly may leave a run Running until recovery explicitly marks it Failed. Recovery must preserve the run and never silently mark it Completed.

Cancellation remains a future option when synchronization has a Worker, durable queue and cooperative cancellation support.

## Progress Rule

Progress updates do not change the lifecycle state.

Possible progress information:

- Current page or cursor.
- Retrieved item count.
- Current stage.
- Last successful source request.
- Estimated remaining work, if available.

Progress data is operational and must not weaken Aggregate invariants.

## Idempotency Rule

Repeated completion commands with the same snapshot and completion data may be treated as idempotent.

A completion command with a different snapshot after the run is already Completed must be rejected.

Repeated failure commands may be idempotent only when they contain the same failure identity or equivalent terminal outcome.

---

# Playbook Version Lifecycle

## Purpose

Playbook Version represents an immutable candidate or published state of Playbook knowledge.

Its lifecycle separates:

- Creation.
- Validation.
- Publication.
- Archival.

Publication and activation remain separate concepts.

## States

### Draft

The version exists but has not entered formal validation.

Expected characteristics:

- Version identity exists.
- Playbook and Workspace ownership are fixed.
- Source snapshot is fixed.
- Normalized content may still be prepared.
- Version is not executable.

### Validating

The version is undergoing structural, semantic or reference validation.

Expected characteristics:

- Validation process has started.
- Version is not executable.
- Validation findings may be accumulated.
- Content must not be replaced during the same validation attempt without restarting the lifecycle.

### Validated

The version completed validation with no blocking findings and awaits an explicit publication decision.

Expected characteristics:

- Validation summary and finalized findings exist.
- Version is immutable and not executable.
- Publication has not occurred.

### Invalid

The version failed one or more blocking validations.

Expected characteristics:

- Validation result exists.
- Blocking issues are recorded.
- Version cannot be published.
- Version remains historical and traceable.

### Published

The validated version was explicitly published and is eligible for execution.

Expected characteristics:

- Publication timestamp exists.
- Validation summary exists.
- Content checksum is fixed.
- Normalized knowledge is immutable.
- Version may be activated by its Playbook through a separate operation.

### Archived

The version is retained for historical purposes but is not intended for new activation or execution selection.

Expected characteristics:

- Archive timestamp exists.
- Historical Executions remain valid.
- Content remains immutable.
- Existing references remain resolvable.

## State Diagram

```text
Draft
   │
   └── begin validation ───► Validating

Validating
   │
   ├── validation passed ──► Validated
   └── validation failed ──► Invalid

Validated
   │
   ├── publish ────────────► Published
   └── archive ────────────► Archived

Invalid
   │
   └── archive ────────────► Archived

Published
   │
   └── archive ────────────► Archived
```

Terminal state for version content:

- Validated, regarding content mutation.
- Published.
- Invalid.
- Archived.

`Published` is terminal regarding content mutation but not regarding archival.

## Valid Transitions

### Draft → Validating

Command:

- Begin Playbook Version validation.

Required conditions:

- Source snapshot exists.
- Snapshot belongs to the same Workspace and source lineage.
- Normalization completed.
- Content checksum exists.
- Required knowledge records are available.
- No validation is already active.

Required transition data:

- Validation start timestamp.
- Validator or schema version.
- Validation attempt identifier.

### Validating → Validated

Command:

- Complete Playbook Version validation successfully.

Required conditions:

- All blocking structural validations passed.
- All blocking semantic validations passed.
- Required references were resolved.
- Required knowledge categories exist.
- Content checksum matches the validated content.
- Validation result is complete.
- Validation Summary and finalized Validation Findings can be persisted atomically.

Required transition data:

- Validation summary.
- Normalization schema version.
- Content checksum.

### Validated → Published

Command:

- Publish Playbook Version.

Required conditions:

- Version status is Validated.
- Validation Summary exists and has zero blocking findings.
- Content checksum matches the validated content.
- Publication has not already occurred.

Required transition data:

- Publication timestamp.
- Optional publication actor or origin.

### Validating → Invalid

Command:

- Mark Playbook Version invalid.

Required conditions:

- At least one blocking validation failed.
- Validation attempt is complete or explicitly terminated.
- Blocking findings are preserved.

Required transition data:

- Validation completion timestamp.
- Validation summary.
- Blocking issue references.
- Validator or schema version.

### Invalid → Archived

Command:

- Archive Playbook Version.

Required conditions:

- Version is not active.
- No application policy requires keeping it selectable.
- Historical references remain preserved.

Required transition data:

- Archive timestamp.
- Archive reason.

### Validated → Archived

Command:

- Archive Playbook Version.

Required conditions and transition data are the same as for archiving an Invalid version.

### Published → Archived

Command:

- Archive Playbook Version.

Required conditions:

- The version is not currently active, or the application use case first selects another active version.
- Existing Executions remain able to resolve it.
- Archival does not alter its content.

Required transition data:

- Archive timestamp.
- Archive reason.

## Invalid Transitions

Examples:

- Draft → Published.
- Draft → Invalid without validation.
- Direct publication from Validating.
- Invalid → Published.
- Validated → Validating.
- Published → Draft.
- Published → Validating.
- Archived → Published.
- Archived → Draft.
- Validated or Published content mutation.
- Invalid content correction in place.

## Correction Rule

A Validated, Invalid or Published Playbook Version must not be repaired by mutating its normalized content.

Corrections require:

1. A new Synchronization Snapshot or controlled source input.
2. A new Playbook Version.
3. A new validation lifecycle.

This preserves historical reproducibility.

## Publication and Activation

Publication means:

- The version was explicitly released after validation.
- The version is executable.
- The version is immutable.

Activation means:

- The Playbook selects the version as the default for new executions.

Publishing does not automatically activate the version.

A future application use case may coordinate:

1. Publish version.
2. Activate version.

The two transitions remain governed by separate Aggregates:

- Playbook Version governs publication.
- Playbook governs activation.

## Active Version Constraint

A Playbook may only activate a Published Playbook Version that:

- Belongs to the same Playbook.
- Belongs to the same Workspace.
- Is not Archived.

Archiving an active version requires coordinated application behavior.

The preferred sequence is:

1. Activate another Published version.
2. Archive the previous version.

## Validation Retry Rule

The initial model does not allow:

```text
Invalid → Validating
```

A failed version remains immutable evidence of the failed attempt.

A corrected candidate becomes a new Playbook Version.

Validation findings are finalized at validation completion and cannot be edited. The authoritative Validation Summary belongs to the Playbook Version, while findings are stored separately; both must be persisted atomically. Zero blocking findings transition the version to Validated, not Published.

## Idempotency Rule

Publishing an already Published version with identical publication data may be idempotent.

Publishing it with a different checksum or validation result must be rejected.

Archiving an already Archived version may be idempotent when the same archive reason is supplied.

---

# Normalization Attempt Lifecycle

Normalization is separate from `PlaybookVersionStatus`. A new Playbook Version starts as Draft with normalization Pending; only Completed normalization permits validation. A normalization failure leaves the version Draft, and normalization cannot run after validation starts.

```text
Pending
   │
   └── start ───────────────► Running

Running
   │
   ├── complete ────────────► Completed
   └── fail ────────────────► Failed

Failed
   │
   └── retry ───────────────► new attempt in Running
```

Each retry creates a new normalization attempt and preserves prior attempts. Completed normalized output is immutable before validation begins.

---

# Execution Lifecycle

## Purpose

Execution represents one runtime attempt to perform a Workflow or Engine operation with fixed inputs and a fixed Playbook Version.

## States

### Pending

The Execution has been accepted but runtime processing has not started.

Expected characteristics:

- Execution identity exists.
- Workspace is fixed.
- Playbook Version is fixed.
- Workflow or operation is fixed.
- Input references are fixed.
- No step is actively running.

### Running

The Execution is actively processing one or more steps.

Expected characteristics:

- Start timestamp exists.
- Execution Plan is fixed or validly resolved.
- Step state is tracked.
- Provider Invocations may occur.
- Completion has not been recorded.

### Completed

The Execution satisfied its completion conditions and produced a valid Execution Result.

Expected characteristics:

- Completion timestamp exists.
- Final result exists.
- Required steps completed according to policy.
- No unresolved terminal failure remains.
- Result references are preserved.

### Failed

The Execution cannot continue or satisfy its completion conditions.

Expected characteristics:

- Completion timestamp exists.
- Failure information exists.
- Completed step history remains preserved.
- Partial outputs remain distinguishable from the final result.
- Retryability is explicitly classified.

### Cancelled

The Execution was intentionally stopped.

Expected characteristics:

- Completion timestamp exists.
- Cancellation information exists.
- Completed step history remains preserved.
- No final successful result is claimed.

## State Diagram

```text
Pending
   │
   ├── start ───────────────► Running
   └── cancel ──────────────► Cancelled

Running
   │
   ├── complete ────────────► Completed
   ├── fail ────────────────► Failed
   └── cancel ──────────────► Cancelled
```

Terminal states:

- Completed.
- Failed.
- Cancelled.

## Valid Transitions

### Pending → Running

Command:

- Start Execution.

Required conditions:

- Playbook Version exists and is Published.
- Playbook Version belongs to the same Workspace.
- Workflow or requested operation exists in that version.
- Project Snapshot, when required, exists and belongs to the same Workspace.
- Input validation passed.
- Required provider capabilities are resolvable when known before execution.
- Runtime configuration snapshot is fixed.
- Execution Plan is valid or can be resolved deterministically at start.

Required transition data:

- Start timestamp.
- Execution Plan or plan reference.
- Runtime configuration snapshot.
- Initial step state.

### Pending → Cancelled

Command:

- Cancel Execution.

Required conditions:

- Execution has not started.
- Cancellation is allowed by the application policy.

Required transition data:

- Cancellation timestamp.
- Cancellation reason.
- Cancellation origin.

### Running → Completed

Command:

- Complete Execution.

Required conditions:

- All required steps reached acceptable terminal states.
- Completion policy is satisfied.
- Required outputs exist.
- Final result passed validation.
- Completion timestamp does not precede start timestamp.
- No active step remains.
- No unresolved blocking failure remains.

Required transition data:

- Completion timestamp.
- Execution Result or result reference.
- Output summary.
- Usage summary.
- Final step summary.

### Running → Failed

Command:

- Fail Execution.

Required conditions:

- A blocking step failed.
- Retry policy was exhausted, or the failure is non-retryable.
- Required completion conditions cannot be satisfied.
- Failure has not already been recorded.

Required transition data:

- Completion timestamp.
- Structured failure information.
- Failed step reference when applicable.
- Retryability classification.
- Partial output summary.
- Usage accumulated before failure.

### Running → Cancelled

Command:

- Cancel Execution.

Required conditions:

- Cancellation was requested.
- The Engine has acknowledged the cancellation.
- No successful completion was already committed.

Required transition data:

- Cancellation timestamp.
- Cancellation reason.
- Cancellation origin.
- Last completed step.
- Partial usage and output summary.

## Invalid Transitions

Examples:

- Completed → Running.
- Completed → Failed.
- Failed → Completed.
- Cancelled → Running.
- Pending → Completed.
- Pending → Failed without start.
- Running → Pending.
- Replacement of the referenced Playbook Version after start.
- Replacement of the referenced Project Snapshot after start.

## Execution Input Immutability

The following data must become immutable when Execution starts:

- Workspace identity.
- Playbook Version identity.
- Workflow or operation identity.
- Project Snapshot identity.
- Input references.
- Runtime configuration snapshot.
- Initial model-selection outcome when selection occurs before execution.

Dynamic runtime outputs may be added, but original inputs must not be overwritten.

## Step Execution Lifecycle

Initial Step Execution states:

- Pending.
- Running.
- Completed.
- Failed.
- Skipped.
- Cancelled.

Candidate state diagram:

```text
Pending
   │
   ├── start ───────────────► Running
   ├── skip ────────────────► Skipped
   └── cancel ──────────────► Cancelled

Running
   │
   ├── complete ────────────► Completed
   ├── fail ────────────────► Failed
   └── cancel ──────────────► Cancelled
```

Terminal Step Execution states:

- Completed.
- Failed.
- Skipped.
- Cancelled.

## Step Rules

- A Step Execution belongs to exactly one Execution.
- A Step may start only when its dependencies are satisfied.
- A skipped Step must record the rule or condition that caused the skip.
- A completed Step must preserve validated output.
- A failed Step must preserve attempt and error information.
- A terminal Step must not silently return to Running.
- Retrying a Step must preserve previous attempts.
- An AI-Assisted Step must distinguish raw AI Response from validated step output.
- A deterministic Step must not be recorded as AI-assisted merely because AI generated part of its implementation.

## Step Retry Strategy

The Aggregate must preserve every attempt.

Two candidate implementations remain possible:

### Option A: Attempts inside Step Execution

```text
Step Execution
  ├── Attempt 1 — Failed
  ├── Attempt 2 — Failed
  └── Attempt 3 — Completed
```

### Option B: Separate Step Attempt records

This may be preferable when attempt data is large.

The final persistence choice is deferred.

The domain rule is fixed:

- Previous attempts are never overwritten.
- One Step Execution has at most one active attempt.
- Retry policy determines whether another attempt is allowed.

## Execution Retry Rule

A failed Execution is not reset to Pending.

A complete retry creates a new Execution.

The new Execution may reference:

- The previous Execution.
- The same Playbook Version.
- The same Project Snapshot.
- The same or adjusted runtime configuration.
- A retry reason.

This preserves independent execution history.

A future resume feature may continue the same Execution only when:

- The workflow explicitly supports resumability.
- Completed steps are reusable.
- State compatibility can be verified.
- The behavior is documented through a separate design decision.

Resume is not included in the initial lifecycle.

## Provider Failure Rule

A failed Provider Invocation does not automatically fail the Execution.

The Step or Execution policy determines whether to:

- Retry the same provider.
- Select a fallback model.
- Select a fallback provider.
- Mark the Step as failed.
- Continue with degraded output.
- Fail the Execution.

Provider failure and domain failure must remain separate.

## Cancellation Rule

Cancellation is cooperative.

A cancellation request does not prove that external provider work stopped immediately.

The Engine must preserve whether:

- Cancellation was requested.
- Cancellation was acknowledged.
- An external invocation continued.
- A late provider response was ignored.
- Usage occurred after the request.

The initial state machine records `Cancelled` only after cancellation is acknowledged by the Engine.

## Partial Result Rule

A Failed or Cancelled Execution may preserve partial outputs.

Partial outputs:

- Must be clearly labeled.
- Must not be exposed as the final successful Execution Result.
- May support diagnostics or future resumability.
- Must preserve source Step references.

## Idempotency Rule

Starting an already Running Execution may be treated as idempotent if the same start command identity is used.

Completing an already Completed Execution may be idempotent only if:

- The same result identity is supplied.
- The same completion metadata is supplied.
- No historical data would change.

A different result must be rejected.

---

# Cross-Lifecycle Coordination

## Synchronization to Playbook Version

A successful Synchronization Run produces a Synchronization Snapshot.

The expected orchestration is:

```text
Synchronization Run: Completed
        ↓
Create Draft Playbook Version
        ↓
Normalize knowledge
        ↓
Begin validation
        ↓
Validated or Invalid
        ↓
Publish explicitly when Validated
```

Completing synchronization must not automatically publish a Playbook Version.

## Playbook Version to Execution

An Execution may start only with a Published Playbook Version.

The expected selection flow is:

```text
Execution Request
        ↓
Resolve explicit or active Playbook Version
        ↓
Verify Published status
        ↓
Create Pending Execution
        ↓
Start Execution
```

A Draft, Validating, Validated, Invalid or Archived version must not be selected for a normal Execution.

## Publication to Activation

Publication and activation are separate transitions:

```text
Playbook Version: Validating
        ↓
Playbook Version: Validated
        ↓
Playbook Version: Published
        ↓
Application use case
        ↓
Playbook activates version
```

Failure to activate does not invalidate publication.

## Execution to Audit

An Audit may coordinate with an Execution.

Possible flow:

```text
Create Audit
    ↓
Start related Execution
    ↓
Collect criterion evaluations
    ↓
Create Findings
    ↓
Complete Audit
```

The Audit lifecycle will be defined in a later document.

The Audit must not derive its state exclusively from the Execution state without applying its own completion rules.

---

# Concurrency Rules

## Optimistic Concurrency

Lifecycle Aggregates are expected to use optimistic concurrency when persisted.

Each state-changing command should operate against a known Aggregate revision or version.

This prevents:

- Completing an already failed run.
- Starting an already cancelled Execution.
- Publishing a version concurrently with invalidation.
- Losing step progress through concurrent writes.

The persistence implementation is deferred.

## Single Active Operation

Initial rules:

- One Synchronization Run has one active lifecycle.
- One Playbook Version has at most one active validation attempt.
- One Execution has one active runtime lifecycle.
- One Step Execution has at most one active attempt.

Parallel workflow steps may run concurrently inside one Execution when the Execution Plan permits it.

Concurrency between steps must not allow contradictory updates to shared execution bindings.

---

# Timestamp Rules

All lifecycle timestamps must:

- Use a consistent system time representation.
- Be stored in UTC or another explicitly standardized format.
- Be assigned through an application or domain time abstraction where testability requires it.
- Preserve ordering constraints.

Required ordering examples:

```text
createdAt <= startedAt <= completedAt
validationStartedAt <= validationCompletedAt
publishedAt <= archivedAt
```

Missing timestamps must reflect lifecycle reality.

For example:

- Pending Execution has no `startedAt`.
- Running Execution has no `completedAt`.
- Draft Playbook Version has no `publishedAt`.

---

# Failure Information

Failures must be structured enough to distinguish:

- Domain validation failure.
- External integration failure.
- Provider failure.
- Timeout.
- Cancellation.
- Infrastructure failure.
- Invalid source data.
- Unsupported capability.
- Internal unexpected error.

A failure record should eventually support:

- Stable failure code.
- Human-readable message.
- Failure stage.
- Retryability.
- External error reference.
- Diagnostic metadata.
- Timestamp.

The final error model will be defined separately.

---

# Initial Decisions

The following lifecycle decisions are approved for continued design:

- Synchronization Run retries create new runs.
- Synchronization cancellation is outside version 1; interrupted runs may be recovered as Failed.
- Failed Executions are not reset.
- Full Execution retries create new Executions.
- Validated Playbook Versions are immutable and not executable.
- Published Playbook Versions are immutable.
- Invalid Playbook Versions are not repaired in place.
- Publishing and activating a Playbook Version are separate operations.
- Executions require a Published Playbook Version.
- Historical inputs remain immutable.
- Provider failure does not automatically equal Execution failure.
- Terminal states do not return to active states.
- Resume is deferred from the initial Execution lifecycle.

## Open Questions

- Can an Archived version be used through an explicit historical replay operation?
- Do source rate-limit pauses require a separate state?
- Should Execution support `Waiting` for human review?
- Should Execution support `Paused` for external dependencies?
- How are parallel Step updates merged safely?
- Which failure classes allow automatic retry?
- Does model fallback create a new Step Attempt or remain inside one attempt?
- Can a completed Step be recomputed during a retry?
- How are late provider responses handled after cancellation?
- Does an Execution Result live inside Execution or as a separate immutable record?

These questions will be resolved during use-case, workflow and persistence modeling.
