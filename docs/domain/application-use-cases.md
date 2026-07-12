# AI Playbook Engine — Initial Application Use Case Catalog

## Purpose

This document defines the initial application use cases of AI Playbook Engine.

The catalog establishes:

* The operations exposed by the application layer.
* The Aggregate responsible for each primary invariant.
* The coordination required between modules.
* The expected inputs and outcomes.
* The main failure conditions.
* The operations intentionally deferred from version 1.

This document does not define:

* HTTP endpoints.
* CLI syntax.
* Database transactions.
* TypeScript interfaces.
* DTO field names.
* Authentication or authorization.
* Final event schemas.

API, CLI, worker and automation entry points must invoke these use cases rather than implement business behavior directly.

## Application Layer Principles

Application use cases are responsible for orchestration.

They may:

* Resolve the current Workspace.
* Load Aggregates through repository contracts.
* Invoke domain behavior.
* Coordinate more than one Aggregate.
* Call external ports.
* Persist state changes.
* Publish domain or integration events.
* Return application-level results.

Application use cases must not:

* Contain vendor-specific SDK logic.
* Expose ORM models.
* Expose Notion structures.
* Expose raw AI provider responses.
* Implement HTTP or CLI formatting.
* Bypass Aggregate invariants.
* Silently select a Workspace.
* Mutate historical records to simplify retries.

## Common Input Context

Tenant-owned use cases are expected to receive or resolve:

* Workspace identity.
* Request or command identity for idempotency where needed.
* Invocation origin.
* Correlation or trace identity.
* Current timestamp through a time abstraction.
* Actor information when identity is introduced in the future.

The initial personal version may resolve one configured Workspace through a centralized mechanism.

The use cases must not embed a permanent default Workspace identifier.

## Common Outcome Types

Application outcomes should distinguish:

### Success

The requested operation completed and produced its expected result.

### Accepted

The operation was registered but processing continues asynchronously.

### No Change

The request was valid but did not produce a state change.

### Conflict

The current Aggregate state does not allow the requested operation.

### Validation Failure

The request or domain input does not satisfy required rules.

### Not Found

A required Aggregate or referenced resource does not exist in the expected Workspace.

### External Failure

A required external system failed.

### Infrastructure Failure

Persistence, queue, storage or another technical dependency failed.

These categories do not define the final error hierarchy.

---

# Workspace Use Cases

## Create Personal Workspace

### Purpose

Create the initial personal Workspace used by the Engine.

### Primary Aggregate

Workspace.

### Inputs

* Workspace name.
* Optional description.
* Initialization origin.

### Preconditions

* Personal mode has not already been initialized.
* The supplied name is valid.

### Main Flow

1. Verify that personal mode is not already initialized.
2. Create a Workspace.
3. Persist the Workspace.
4. Register it as the configured personal Workspace through infrastructure configuration.
5. Return the Workspace identity.

### Outcomes

* Workspace created.
* Initialization conflict.
* Validation failure.

### Notes

This is an installation or bootstrap use case.

It is not a general SaaS tenant-provisioning workflow.

## Get Current Workspace

### Purpose

Resolve the Workspace under which an operation should execute.

### Primary Responsibility

Application context resolution.

### Main Flow

1. Ask the centralized Workspace resolver for the current Workspace.
2. Verify that the Workspace exists.
3. Verify that its status permits the requested operation.
4. Return its identity and minimal context.

### Notes

The domain must not read environment variables directly.

## Archive Workspace

### Purpose

Prevent new tenant-owned operations while preserving history.

### Primary Aggregate

Workspace.

### Main Flow

1. Load the Workspace.
2. Verify that archival is permitted.
3. Archive the Workspace.
4. Persist the change.
5. Trigger or schedule deactivation of owned Automations.
6. Preserve all historical records.

### Deferred Behavior

* User notifications.
* Subscription cancellation.
* Data export.
* Tenant deletion.

---

# Playbook Use Cases

## Register Playbook

### Purpose

Create the long-lived internal identity of a Playbook.

### Primary Aggregate

Playbook.

### Inputs

* Workspace identity.
* Name.
* Description.
* Optional initial metadata.

### Preconditions

* Workspace permits creation.
* Name is valid.
* Uniqueness rules within the Workspace are satisfied.

### Main Flow

1. Resolve the Workspace.
2. Validate uniqueness.
3. Create the Playbook.
4. Persist it.
5. Return the Playbook identity.

### Outcomes

* Playbook created.
* Name conflict.
* Workspace unavailable.
* Validation failure.

## Rename Playbook

### Primary Aggregate

Playbook.

### Main Flow

1. Load the Playbook within the Workspace.
2. Validate the new name.
3. Check applicable uniqueness rules.
4. Rename through Aggregate behavior.
5. Persist the Playbook.

## Archive Playbook

### Purpose

Prevent new versions and normal executions without deleting history.

### Primary Aggregate

Playbook.

### Preconditions

* Playbook exists in the Workspace.
* Application policy permits archival.
* Active or pending processes are handled according to policy.

### Main Flow

1. Load the Playbook.
2. Determine whether an active version requires removal or retention.
3. Archive the Playbook.
4. Persist it.
5. Disable or reject new synchronization and execution operations.

### Notes

Archiving the Playbook does not archive every related record automatically.

## Restore Playbook

### Purpose

Return an archived Playbook to an operational state.

### Primary Aggregate

Playbook.

### Main Flow

1. Load the archived Playbook.
2. Verify restoration rules.
3. Restore it.
4. Persist the change.

## Activate Playbook Version

### Purpose

Select a Published Playbook Version as the default for new Executions.

### Primary Aggregate

Playbook.

### Referenced Aggregate

Playbook Version.

### Preconditions

* Playbook and version belong to the same Workspace.
* Version belongs to the Playbook.
* Version is Published.
* Version is not Archived.

### Main Flow

1. Load the Playbook.
2. Load the candidate Playbook Version.
3. Validate Workspace and ownership consistency.
4. Instruct the Playbook to activate the version.
5. Persist the Playbook.
6. Record the activation event.

### Outcome

* Version activated.
* No change when already active.
* Version not eligible.
* Ownership conflict.

## Clear Active Playbook Version

### Purpose

Remove the default version used by new Executions.

### Primary Aggregate

Playbook.

### Notes

This use case does not delete or archive the version.

New Executions requiring implicit version resolution must fail until another version is activated.

## Get Active Playbook Version

### Purpose

Resolve the version selected by a Playbook for new operations.

### Behavior

* Returns the active Published version.
* Does not automatically choose the most recent version.
* Does not publish a Draft version.
* Does not reactivate an Archived version.

---

# Playbook Source Use Cases

## Register Playbook Source

### Purpose

Associate an editorial source with a Playbook.

### Primary Aggregate

Playbook Source.

### Referenced Aggregate

Playbook.

### Inputs

* Workspace identity.
* Playbook identity.
* Source type.
* External root reference.
* Credential reference.
* Non-secret synchronization settings.

### Preconditions

* Playbook exists and is operational.
* Playbook belongs to the Workspace.
* Source type is supported.
* Source configuration is structurally valid.
* Credential reference exists or can be resolved.

### Main Flow

1. Load the Playbook.
2. Validate ownership and status.
3. Validate source configuration through a source-type validator.
4. Create the Playbook Source.
5. Persist it.
6. Return the source identity.

### Notes

No external synchronization is required during registration unless a later verification use case explicitly requests it.

## Update Playbook Source

### Purpose

Change editable source metadata without rewriting history.

### Primary Aggregate

Playbook Source.

### Editable Candidates

* External root reference.
* Credential reference.
* Non-secret settings.
* Display metadata.

### Restrictions

* Workspace ownership cannot change.
* Playbook ownership cannot change silently.
* Existing Synchronization Runs retain the source state used at creation.

## Enable Playbook Source

### Primary Aggregate

Playbook Source.

### Preconditions

* Required configuration is valid.
* Credential reference is resolvable.
* Parent Playbook is operational.

## Disable Playbook Source

### Primary Aggregate

Playbook Source.

### Result

New Synchronization Runs cannot start.

Existing historical runs remain unchanged.

Running work may be cancelled or allowed to finish according to application policy.

## Verify Playbook Source Connection

### Purpose

Verify external access without creating a complete Synchronization Run.

### External Port

Playbook source gateway.

### Main Flow

1. Load the Playbook Source.
2. Resolve the credential through secure infrastructure.
3. Request a bounded connectivity or access check.
4. Normalize the result.
5. Return a verification outcome.

### Notes

This is an operational use case.

It must not alter Playbook knowledge.

---

# Synchronization Use Cases

## Start Synchronization

### Purpose

Create and start a Synchronization Run for a Playbook Source.

### Primary Aggregate

Synchronization Run.

### Referenced Aggregate

Playbook Source.

### External Ports

* Playbook source gateway.
* Queue or execution dispatcher when asynchronous.

### Preconditions

* Workspace is operational.
* Source exists in the Workspace.
* Source is enabled.
* Parent Playbook is operational.
* Required configuration and credentials are resolvable.
* Concurrency policy permits another run.

### Main Flow

1. Load the Playbook Source.
2. Validate ownership and status.
3. Check whether concurrency policy allows a new run.
4. Create a Pending Synchronization Run.
5. Persist the run.
6. Dispatch synchronization processing.
7. Start the run when processing begins.
8. Return the run identity and accepted status.

### Concurrency Policy

The initial policy should prevent multiple active Synchronization Runs for the same source unless parallel synchronization becomes an explicit requirement.

## Process Synchronization Run

### Purpose

Retrieve all required source content and produce an immutable snapshot.

### Primary Aggregate

Synchronization Run.

### External Ports

* Playbook source gateway.
* Snapshot storage.
* Checksum service.
* Time provider.

### Main Flow

1. Load the Pending run and its source context.
2. Start the run.
3. Retrieve source content using pagination.
4. Record bounded progress.
5. Normalize only the source transport representation required for snapshot storage.
6. Calculate content checksum.
7. Create and store a Synchronization Snapshot.
8. Complete the run with the snapshot identity.
9. Update source success metadata through coordinated application behavior.
10. Emit synchronization-completed information.

### Failure Flow

1. Classify the failure.
2. Preserve diagnostic information.
3. Mark the run Failed.
4. Update source failure metadata when appropriate.
5. Do not create a successful snapshot.

## Cancel Synchronization Run

### Primary Aggregate

Synchronization Run.

### Main Flow

1. Load the run.
2. Verify it is Pending or Running.
3. Register the cancellation request.
4. Coordinate cancellation with the processing mechanism.
5. Mark the run Cancelled after acknowledgement.

### Initial Scope

Cancellation may be deferred from the first implementation if processing is sufficiently short-lived.

## Retry Synchronization

### Purpose

Create a new Synchronization Run based on a failed or cancelled run.

### Primary Aggregate

New Synchronization Run.

### Preconditions

* Original run is terminal.
* Source remains enabled and valid.
* Retry policy allows another attempt.

### Main Flow

1. Load the previous run and source.
2. Validate retry eligibility.
3. Create a new run referencing the previous run.
4. Dispatch the new run.

### Rule

The previous run is never reset.

## Get Synchronization Status

### Purpose

Return the current operational state of a run.

### Output Candidates

* Status.
* Start and completion timestamps.
* Progress summary.
* Snapshot identity when Completed.
* Failure summary when Failed.
* Retry eligibility.

## Compare Synchronization Snapshots

### Purpose

Produce a Change Set between two snapshots.

### External or Domain Service

Snapshot comparison service.

### Main Flow

1. Load both snapshot metadata records.
2. Validate Workspace and source compatibility.
3. Load source-aligned content from storage.
4. Compare identifiable source items.
5. Produce an immutable Change Set or comparison result.

### Notes

A Change Set does not create a Playbook Version automatically.

---

# Playbook Version Use Cases

## Create Draft Playbook Version

### Purpose

Create a new internal version candidate from a Synchronization Snapshot.

### Primary Aggregate

Playbook Version.

### Referenced Aggregates

* Playbook.
* Synchronization Snapshot.

### Preconditions

* Playbook exists and is operational.
* Snapshot belongs to the same Workspace.
* Snapshot belongs to a source associated with the Playbook.
* Snapshot has not already produced the same version candidate under the selected idempotency rule.

### Main Flow

1. Load the Playbook.
2. Load snapshot metadata.
3. Validate lineage and ownership.
4. Reserve or calculate a version identity or sequence.
5. Create a Draft Playbook Version.
6. Persist it.
7. Dispatch normalization.

### Open Rule

Whether one snapshot may create more than one version remains subject to later modeling.

## Normalize Playbook Version

### Purpose

Transform synchronized source content into internal knowledge structures.

### Primary Responsibility

Knowledge normalization application service.

### Referenced Aggregate

Playbook Version.

### External Ports

* Snapshot storage.
* Source-content parser.
* Knowledge persistence.
* Checksum service.

### Preconditions

* Version is Draft.
* Snapshot content is accessible.
* Parser version is known.

### Main Flow

1. Load the Draft version and snapshot content.
2. Parse source-specific structures.
3. Convert them into provider-neutral and Notion-neutral knowledge candidates.
4. Resolve stable internal identities where possible.
5. Store normalized knowledge associated with the version.
6. Store normalization metadata and checksum.
7. Mark the version ready for validation through the approved lifecycle model.

### Important Rule

Normalization must not publish or activate the version.

## Validate Playbook Version

### Purpose

Run structural, semantic and reference validation.

### Primary Aggregate

Playbook Version.

### Supporting Services

* Knowledge validator.
* Reference resolver.
* Validation rule registry.

### Main Flow

1. Load the Draft version.
2. Verify normalized knowledge exists.
3. Begin validation.
4. Execute structural validations.
5. Execute semantic validations.
6. Resolve required references.
7. Record validation findings.
8. Publish when all blocking validations pass, or mark Invalid when any blocking validation fails.

### Design Note

Publishing may remain a separate explicit use case even when validation passes.

The final separation will be decided before implementation.

## Publish Playbook Version

### Purpose

Make a successfully validated version eligible for Execution.

### Primary Aggregate

Playbook Version.

### Preconditions

* Version is Validating under the current state model.
* Validation is complete.
* No blocking issues exist.
* Content checksum matches validated knowledge.
* Required schema and parser versions are recorded.

### Main Flow

1. Load the version.
2. Load authoritative validation results.
3. Verify publication eligibility.
4. Publish the version.
5. Persist the transition.
6. Emit a version-published event.

### Rule

Publication does not activate the version.

## Mark Playbook Version Invalid

### Purpose

Preserve a failed validation outcome.

### Primary Aggregate

Playbook Version.

### Preconditions

* Validation completed with blocking issues.

### Main Flow

1. Load the version.
2. Verify blocking validation findings.
3. Mark the version Invalid.
4. Persist the validation summary.

## Archive Playbook Version

### Primary Aggregate

Playbook Version.

### Coordinated Aggregate

Playbook when the version is active.

### Main Flow

1. Load the version.
2. Determine whether it is active.
3. Reject archival or coordinate replacement of the active version.
4. Archive the version.
5. Preserve all historical references.

## List Playbook Versions

### Purpose

Return a query-oriented history of versions.

### Output Candidates

* Version identity.
* Sequence or label.
* Status.
* Snapshot reference.
* Validation summary.
* Publication timestamp.
* Active indicator.

### Notes

This is primarily a query use case and may use a read model.

---

# Knowledge Use Cases

## Get Knowledge Item

### Purpose

Retrieve one normalized Knowledge Item from a specific Playbook Version.

### Preconditions

* Version belongs to the Workspace.
* Item belongs to the version.
* Caller is permitted to read the version state.

## Search Knowledge

### Purpose

Query normalized knowledge by semantic and structural filters.

### Input Candidates

* Playbook Version.
* Knowledge Type.
* Tags or categories.
* Stable identifier.
* Text query.
* Relationship criteria.

### Notes

The first implementation may use deterministic indexed search.

Embeddings and semantic vector search are deferred until justified.

## Resolve Knowledge Reference

### Purpose

Resolve an internal reference from one Knowledge Item to another.

### Outcomes

* Resolved.
* Missing.
* Ambiguous.
* Incompatible type.
* Cross-version reference rejected.

## Get Workflow Definition

### Purpose

Retrieve an executable Workflow Definition from a Published Playbook Version.

### Preconditions

* Version is Published.
* Workflow exists.
* Workflow passed required validation.

## Get Audit Definition

### Purpose

Retrieve a validated Audit Definition.

## Get Decision Matrix

### Purpose

Retrieve a validated Decision Matrix.

## Validate Knowledge Structure

### Purpose

Run validators against normalized knowledge without necessarily changing Playbook Version lifecycle.

### Use

* Development diagnostics.
* Pre-publication validation.
* Migration validation.
* Parser regression testing.

---

# Project Use Cases

## Register Project

### Purpose

Create a logical analysis target.

### Primary Aggregate

Project.

### Inputs

* Workspace identity.
* Name.
* Project type.
* Description.
* Project Source configuration reference.

### Preconditions

* Workspace permits creation.
* Project type is supported.
* Source configuration is structurally valid.

## Update Project Metadata

### Primary Aggregate

Project.

### Allowed Changes

* Name.
* Description.
* Non-secret source metadata.

### Prohibited Changes

* Workspace ownership.
* Historical snapshot content.
* Existing Execution references.

## Archive Project

### Purpose

Prevent new snapshots and Executions while preserving history.

### Primary Aggregate

Project.

## Create Project Snapshot

### Purpose

Capture immutable project state for reproducible analysis.

### Primary Aggregate

Project Snapshot.

### Referenced Aggregate

Project.

### External Ports

* Project source gateway.
* Artifact storage.
* Checksum service.
* Project inspector.

### Main Flow

1. Load the Project.
2. Verify operational status.
3. Resolve project source credentials.
4. Capture source revision and selected artifacts.
5. Build the artifact manifest.
6. Calculate checksums.
7. Store large artifacts externally.
8. Complete and persist the immutable snapshot.
9. Update the Project's latest snapshot reference.

### Failure Rule

A failed capture must not become an executable Project Snapshot.

## Get Project Snapshot

### Purpose

Retrieve immutable snapshot metadata and artifact references.

## List Project Artifacts

### Purpose

Return the artifact manifest associated with a snapshot.

## Read Project Artifact

### Purpose

Retrieve one artifact through a controlled storage port.

### Rules

* Artifact must belong to the requested snapshot.
* Workspace scope must be validated.
* Size and content restrictions may apply.

---

# Execution Use Cases

## Request Execution

### Purpose

Validate an execution request and create a Pending Execution.

### Primary Aggregate

Execution.

### Referenced Concepts

* Playbook.
* Playbook Version.
* Workflow Definition or operation definition.
* Project Snapshot.
* Provider Configuration where known.

### Version Resolution

The request may specify:

* An explicit Published Playbook Version.
* A Playbook whose active version should be resolved.

The resolved version becomes fixed in the Execution.

### Main Flow

1. Resolve Workspace.
2. Resolve explicit or active Playbook Version.
3. Verify Published status.
4. Load the Workflow Definition or operation.
5. Validate target and inputs.
6. Resolve the required Project Snapshot when applicable.
7. Verify required capabilities are potentially available.
8. Create a Pending Execution.
9. Persist it.
10. Dispatch runtime processing.
11. Return Accepted with Execution identity.

## Start Execution

### Purpose

Transition a Pending Execution into active processing.

### Primary Aggregate

Execution.

### Main Flow

1. Load the Pending Execution.
2. Resolve and validate the Execution Plan.
3. Freeze runtime configuration.
4. Start the Execution.
5. Persist initial Step Executions.
6. Begin eligible steps.

## Process Execution Step

### Purpose

Execute one eligible Step Execution.

### Primary Aggregate

Execution.

### Supporting Ports

Depending on step type:

* Deterministic step handler.
* AI Gateway.
* Human review gateway in the future.
* Artifact reader.
* Knowledge query service.

### Main Flow

1. Load the Execution.
2. Verify Running status.
3. Verify step dependencies.
4. Start the Step Execution.
5. Execute the bounded step handler.
6. Validate the produced output.
7. Complete or fail the Step Execution.
8. Persist the updated Execution.
9. Schedule newly eligible steps.
10. Determine whether the Execution can complete or must fail.

### Concurrency Note

Parallel step processing requires optimistic concurrency and conflict handling.

## Complete Execution

### Purpose

Produce the final domain outcome after required steps finish.

### Primary Aggregate

Execution.

### Preconditions

* Required steps satisfy completion policy.
* Final output validation passes.
* No blocking failure remains.
* No active step remains.

### Main Flow

1. Build the Execution Result.
2. Validate the final result.
3. Complete the Execution.
4. Persist the terminal state.
5. Emit execution-completed information.
6. Trigger reporting or downstream workflows.

## Fail Execution

### Primary Aggregate

Execution.

### Preconditions

* Completion is impossible under current policy.
* Failure information is structured.
* Retry or fallback policy is exhausted or not applicable.

## Cancel Execution

### Primary Aggregate

Execution.

### Main Flow

1. Load the Execution.
2. Validate cancellable state.
3. Request cancellation of active processing.
4. Preserve completed step history.
5. Mark the Execution Cancelled after acknowledgement.

## Retry Execution

### Purpose

Create a new Execution based on a terminal failed or cancelled Execution.

### Main Flow

1. Load the previous Execution.
2. Validate retry eligibility.
3. Resolve whether the same Playbook Version and Project Snapshot remain valid.
4. Apply approved runtime configuration changes.
5. Create a new Pending Execution referencing the previous one.
6. Dispatch processing.

### Rule

The previous Execution is never reset.

## Get Execution Status

### Output Candidates

* Status.
* Current and completed steps.
* Progress summary.
* Failure summary.
* Usage summary.
* Start and completion timestamps.

## Get Execution Result

### Preconditions

* Execution is Completed.

### Behavior

Failed or Cancelled Executions may expose partial diagnostic outputs through a different query.

## Get Execution Trace

### Purpose

Return connected runtime traceability information.

### Output Candidates

* Playbook Version.
* Project Snapshot.
* Workflow.
* Step history.
* Provider Invocations.
* Evidence references.
* Errors.
* Usage.
* Timing.

---

# AI Gateway Use Cases

## Resolve AI Capability

### Purpose

Determine whether an enabled provider and model can satisfy required capabilities.

### Inputs

* Workspace.
* Required capabilities.
* Runtime constraints.
* Optional provider or model restrictions.

### Output

A provider-neutral capability resolution result.

### Rule

Capability resolution does not necessarily make the final model-selection Decision.

## Invoke AI Provider

### Purpose

Execute one normalized AI Request through an approved Provider Configuration.

### Application Responsibility

* Validate provider availability.
* Resolve secret reference.
* Apply timeout and retry policy.
* Call the adapter.
* Normalize the response.
* Record Provider Invocation metadata.
* Return a provider-neutral AI Response.

### Rule

This use case does not directly complete an Execution Step.

The calling step handler validates and interprets the response.

## Retry Provider Invocation

### Purpose

Create a new attempt while preserving previous invocation history.

### Candidate Strategies

* Same model and provider.
* Different model under the same provider.
* Fallback provider.

The allowed strategy is determined by execution policy.

## Get Provider Availability

### Purpose

Return enabled providers and allowed models for a Workspace.

## Configure AI Provider

### Primary Aggregate

Provider Configuration.

### Inputs

* Provider type.
* Credential reference.
* Enabled models.
* Non-secret options.
* Operational restrictions.

### Rule

Credential values must not pass through domain entities or query results.

## Disable AI Provider

### Primary Aggregate

Provider Configuration.

### Result

No new invocations may start through that configuration.

Historical Provider Invocations remain unchanged.

## Verify AI Provider Configuration

### Purpose

Perform a bounded external validation of credentials and provider access.

### Notes

Verification must avoid expensive model calls where a lower-cost capability check is available.

---

# Audit Use Cases

## Request Audit

### Purpose

Create an Audit for a target and selected Audit Definition.

### Primary Aggregate

Audit.

### Referenced Concepts

* Playbook Version.
* Audit Definition.
* Project Snapshot or other target snapshot.
* Related Execution.

### Main Flow

1. Resolve Workspace.
2. Resolve a Published Playbook Version.
3. Load the Audit Definition.
4. Validate target compatibility.
5. Create the Audit.
6. Create or request the related Execution.
7. Persist the Audit.
8. Return Accepted.

## Evaluate Audit Criterion

### Purpose

Evaluate one criterion and attach traceable evidence.

### Primary Aggregate

Audit.

### Supporting Services

* Deterministic evaluators.
* Execution step handlers.
* AI Gateway.
* Evidence resolver.

### Main Flow

1. Load the Audit and criterion.
2. Verify the criterion is pending and applicable.
3. Gather evidence.
4. Evaluate the criterion.
5. Validate the evaluation.
6. Create zero or more Findings.
7. Preserve evidence references.
8. Persist the Audit.

## Add Audit Finding

### Primary Aggregate

Audit.

### Preconditions

* Finding belongs to the Audit.
* Criterion reference is valid where required.
* Severity follows the Audit Definition.
* Evidence is traceable.

### Rule

Generated text without traceable evidence must not automatically become an authoritative Finding.

## Complete Audit

### Primary Aggregate

Audit.

### Preconditions

* All mandatory criteria were evaluated or explicitly marked unable to evaluate.
* Required evidence rules are satisfied.
* Findings are valid.
* Summary can be produced.

### Main Flow

1. Build the Audit summary.
2. Complete the Audit.
3. Persist the result.
4. Trigger report generation.

## Fail Audit

### Purpose

Record that the Audit could not satisfy its completion rules.

### Important Distinction

A related Execution may fail while the Audit still completes with an explicit unable-to-evaluate outcome, depending on Audit Definition policy.

## Update Finding Status

### Purpose

Track remediation or disposition after Audit completion.

### Primary Aggregate

Audit under the initial model.

### Candidate Statuses

* Open.
* Accepted.
* Resolved.
* Dismissed.

### Rule

Status changes must preserve history.

## Get Audit Results

### Output Candidates

* Audit summary.
* Findings.
* Evidence references.
* Criterion results.
* Playbook Version.
* Target snapshot.
* Related Execution.

## Export Audit Report

### Responsibility

Reporting module.

### Rule

The export does not modify the authoritative Audit.

---

# Decision Use Cases

## Request Decision

### Purpose

Evaluate alternatives using a Decision Matrix from a Published Playbook Version.

### Primary Aggregate

Decision.

### Inputs

* Workspace.
* Playbook Version or Playbook.
* Decision Matrix identity.
* Decision question.
* Alternatives.
* Constraints.
* Context and evidence.

### Main Flow

1. Resolve the Published Playbook Version.
2. Load the Decision Matrix.
3. Validate alternatives and required context.
4. Create the Decision.
5. Evaluate deterministic criteria.
6. Request AI-assisted evaluation only where defined.
7. Rank or filter alternatives.
8. Produce a Recommendation.
9. Finalize automatically or await explicit selection according to policy.

## Evaluate Decision Criterion

### Primary Aggregate

Decision.

### Result

One Criterion Evaluation containing:

* Result or score.
* Evidence.
* Explanation.
* Evaluation method.
* Confidence when applicable.

## Generate Recommendation

### Purpose

Produce a ranked or selected recommendation without claiming a binding Decision.

### Rule

The Recommendation must state whether it is:

* Deterministic.
* AI-assisted.
* Hybrid.

## Finalize Decision

### Purpose

Record the selected outcome.

### Preconditions

* Required criteria were evaluated.
* Candidate outcome is valid.
* Human override is explicit when it selects an unevaluated or lower-ranked Alternative.

### Main Flow

1. Validate the selected Alternative or override.
2. Record the Decision Outcome.
3. Preserve rejected alternatives and reasoning references.
4. Finalize the Decision.

## Get Decision Result

### Output Candidates

* Selected outcome.
* Recommendation.
* Ranking.
* Criterion Evaluations.
* Evidence.
* Evaluation methods.
* Playbook Version.

## Compare Alternatives

### Purpose

Return a query-oriented comparison without mutating a finalized Decision.

---

# Automation Use Cases

## Create Automation

### Primary Aggregate

Automation.

### Inputs

* Workspace.
* Name.
* Trigger definition.
* Target application use case.
* Input template.
* Retry policy.

### Preconditions

* Trigger type is supported.
* Target use case is allowed for automation.
* Input template is valid.
* No secrets are embedded directly.

## Enable Automation

### Preconditions

* Configuration is complete.
* Referenced resources exist.
* Target use case remains available.

## Disable Automation

### Result

No new Automation Runs are created.

Running operations follow their own lifecycle.

## Trigger Automation

### Purpose

Create one Automation Run and invoke the configured application use case.

### Main Flow

1. Load the enabled Automation.
2. Resolve the owning Workspace.
3. Materialize validated use-case input.
4. Create an Automation Run.
5. Invoke or dispatch the target use case.
6. Record accepted or failed invocation.
7. Preserve resulting operation identity.

### Rule

Automation must not invoke repositories directly.

## Retry Automation Run

### Purpose

Retry the invocation while preserving the original failed run.

## Get Automation History

### Responsibility

Query/read model.

---

# Reporting and Traceability Use Cases

## Generate Execution Report

### Purpose

Create a presentation of authoritative Execution data.

### Inputs

* Execution identity.
* Report format.
* Optional inclusion settings.

### Rule

The report must preserve references to the source Execution and its Playbook Version.

## Generate Audit Report

### Purpose

Present Audit summary, Findings and evidence.

## Generate Decision Report

### Purpose

Present alternatives, criteria, recommendation and outcome.

## Get Usage Summary

### Purpose

Aggregate measurable usage by:

* Workspace.
* Execution.
* Provider.
* Model.
* Time range.
* Operation type.

### Rule

Usage reporting does not introduce billing logic.

## Get Operational History

### Purpose

Query Synchronization Runs, Executions, Audits, Decisions and Automation Runs.

## Rebuild Read Model

### Purpose

Recreate derived query structures from authoritative domain records.

### Notes

This use case may be introduced only when separate read models exist.

---

# Cross-Module Orchestration Use Cases

## Synchronize and Create Draft Version

### Purpose

Provide a higher-level workflow without collapsing Aggregate boundaries.

### Sequence

1. Start Synchronization.
2. Wait for successful completion.
3. Read the resulting Synchronization Snapshot.
4. Create a Draft Playbook Version.
5. Dispatch normalization.
6. Return the created identities.

### Rule

Failure at one stage must preserve completed prior stages.

## Synchronize, Validate and Publish

### Purpose

Coordinate the complete content ingestion pipeline.

### Sequence

1. Synchronize source.
2. Create Draft version.
3. Normalize knowledge.
4. Validate version.
5. Publish when eligible.
6. Optionally request activation through an explicit parameter.

### Rule

Activation must remain explicit.

A failure must not silently activate a previous or incomplete version.

## Execute Project Workflow

### Sequence

1. Resolve or create a Project Snapshot.
2. Resolve Published Playbook Version.
3. Resolve Workflow Definition.
4. Request Execution.
5. Process Execution.
6. Return status or result.

## Run Project Audit

### Sequence

1. Resolve or create a Project Snapshot.
2. Resolve Audit Definition.
3. Create Audit.
4. Request related Execution.
5. Evaluate criteria.
6. Complete Audit.
7. Generate report when requested.

## Recommend AI Model

### Sequence

1. Load Model Guidance and Decision Matrix.
2. Load current provider availability.
3. Build Alternatives.
4. Request Decision.
5. Evaluate criteria.
6. Produce Recommendation.
7. Optionally finalize selection.

### Rule

Live provider availability and Playbook guidance remain separate inputs.

---

# Query Use Cases

Queries may use read models when they do not enforce state transitions.

Initial query candidates:

* List Workspaces.
* List Playbooks.
* Get Playbook details.
* List Playbook Sources.
* List Synchronization Runs.
* Get Synchronization Run details.
* List Playbook Versions.
* Get validation findings.
* Search Knowledge.
* List Projects.
* Get Project Snapshot.
* List Executions.
* Get Execution status.
* Get Execution trace.
* List Audits.
* Get Audit results.
* List Decisions.
* Get Decision result.
* List Provider Configurations without secrets.
* List Automations.
* Get Automation history.
* Get usage summary.

Read models must not become alternative sources of truth.

---

# Idempotency Candidates

The following commands are likely to require idempotency support:

* Create Personal Workspace.
* Start Synchronization.
* Complete Synchronization.
* Create Draft Playbook Version.
* Publish Playbook Version.
* Activate Playbook Version.
* Create Project Snapshot.
* Request Execution.
* Complete Execution Step.
* Complete Execution.
* Request Audit.
* Finalize Decision.
* Trigger Automation.
* Invoke AI Provider when retries may duplicate requests.

The final idempotency mechanism will be defined during application contract design.

---

# Transaction Boundaries

A single transaction should normally update one Aggregate.

Examples:

* Create Playbook.
* Complete Synchronization Run.
* Publish Playbook Version.
* Activate version in Playbook.
* Complete Execution Step.
* Add Audit Finding.
* Finalize Decision.

Cross-Aggregate workflows should use application orchestration.

Examples:

* Publish and activate a version.
* Complete Synchronization and update source metadata.
* Complete Project Snapshot and update latest snapshot.
* Complete Execution and trigger reporting.
* Archive Workspace and disable Automations.

The system must not require a distributed transaction across external systems.

---

# Deferred Use Cases

The following use cases are outside the initial personal version:

* Register user.
* Authenticate user.
* Invite Workspace member.
* Assign role.
* Transfer Workspace ownership.
* Create organization.
* Configure SSO.
* Provision tenant.
* Manage subscription.
* Enforce billing quota.
* Delete tenant data.
* Share Playbook publicly.
* Collaboratively edit Playbook knowledge.
* Automatically modify Notion methodology.
* Marketplace publication.
* Cross-Workspace data sharing.
* Human approval inbox.
* Interactive Execution resume.
* Physical database migration per tenant.

These capabilities require later domain and architectural decisions.

---

# Initial Version 1 Priorities

The first implementation should prioritize a minimal vertical slice.

Recommended order:

1. Resolve personal Workspace.
2. Register Playbook.
3. Register Notion Playbook Source.
4. Verify source connection.
5. Start and process Synchronization Run.
6. Store Synchronization Snapshot.
7. Create Draft Playbook Version.
8. Normalize a limited set of Knowledge Types.
9. Validate the Playbook Version.
10. Publish the Playbook Version.
11. Activate the version.
12. Query normalized knowledge through CLI.

Execution, AI providers, audits and decisions should follow after the ingestion pipeline is stable.

This order validates the core assumption of the product:

The Engine can reliably transform the Notion Playbook into versioned internal knowledge.

---

# Open Questions

* Which use cases must be synchronous in the first version?
* Will the initial worker use a durable queue or direct in-process dispatch?
* Is source connection verification mandatory before registration?
* May one Playbook have multiple active Playbook Sources?
* Can multiple sources contribute to one version?
* Which Knowledge Types are required for the first publishable version?
* Is validation automatically followed by publication?
* Should CLI allow explicit use of a Published but inactive version?
* Which operations require command identifiers for idempotency?
* How are long-running use cases exposed through API and CLI?
* Does Project Snapshot capture happen automatically when requesting an Execution?
* Is Audit always built on an Execution?
* Which Decision outcomes require human approval?
* How is provider fallback policy represented?
* When should reporting use projections rather than direct Aggregate queries?

These questions will be resolved before implementation of the affected modules.
