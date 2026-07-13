# AI Playbook Engine — Initial Aggregate Boundaries

## Purpose

This document defines the initial aggregate candidates and consistency boundaries of AI Playbook Engine.

It does not define:

- Database tables.
- ORM models.
- API payloads.
- TypeScript classes.
- Final persistence strategy.

The objective is to determine:

- Which concepts own business invariants.
- Which state must change atomically.
- Which concepts belong inside the same consistency boundary.
- Which relationships must use identifiers instead of direct object graphs.
- Which concepts remain provisional until additional domain discovery is completed.

## Aggregate Design Principles

An Aggregate is a consistency boundary.

It is not:

- A folder.
- A module.
- A database schema.
- A group of related tables.
- A complete object graph loaded into memory.

Each Aggregate must have:

- One Aggregate Root.
- Explicit invariants.
- Controlled state transitions.
- A clear ownership boundary.
- References to other Aggregates through identifiers.

Transactions should normally modify only one Aggregate.

Cross-Aggregate behavior must be coordinated through:

- Application services.
- Domain services when justified.
- Domain events.
- Process managers or orchestration in future phases.

Aggregates must remain as small as possible while preserving required consistency.

## Initial Aggregate Map

```text
Workspace
   │
   ├── Playbook
   │     └── references Playbook Versions
   │
   ├── Playbook Version
   │     └── references Synchronization Snapshot
   │
   ├── Playbook Source
   │     └── references Synchronization Runs
   │
   ├── Project
   │     └── references Project Snapshots
   │
   ├── Execution
   │     └── owns Step Executions
   │
   ├── Audit
   │     └── owns Audit Findings
   │
   ├── Decision
   │     └── owns Criterion Evaluations
   │
   ├── Provider Configuration
   │
   └── Automation
         └── references Automation Runs
```

This map represents ownership and references, not final object composition.

## Aggregate: Workspace

### Aggregate Root

`Workspace`

### Purpose

Workspace represents the ownership and isolation boundary for personal and future tenant-owned data.

The initial system has one personal Workspace, but the domain must not assume that only one Workspace can ever exist.

### Candidate State

A Workspace may contain:

- Workspace identity.
- Name.
- Status.
- Creation timestamp.
- Optional operational metadata.

The first version should keep this Aggregate minimal.

### Invariants

- A Workspace must have a stable identity.
- A Workspace must have a valid lifecycle status.
- A disabled or archived Workspace must not initiate new tenant-owned operations unless explicitly restored.
- Workspace identity must not change.
- Ownership of another Aggregate must not be silently transferred to a different Workspace.

### Not Owned by Workspace Aggregate

The Workspace Aggregate must not directly contain collections of:

- Playbooks.
- Projects.
- Executions.
- Audits.
- Decisions.
- Automations.
- Provider configurations.

Those are separate Aggregates associated through `workspaceId`.

Loading a Workspace must not require loading all tenant-owned data.

### Initial Scope

The initial implementation may resolve one preconfigured Workspace.

It must not yet include:

- Users.
- Memberships.
- Roles.
- Invitations.
- Billing.
- Authentication.

## Aggregate: Playbook

### Aggregate Root

`Playbook`

### Purpose

Playbook represents the long-lived identity and lifecycle of one AI engineering methodology consumed by the Engine.

It is independent from any one synchronized state.

### Candidate State

A Playbook may contain:

- Playbook identity.
- Workspace identity.
- Name.
- Description.
- Lifecycle status.
- Active Playbook Version identifier.
- Creation and update timestamps.

### Invariants

- A Playbook belongs to exactly one Workspace.
- Its identity and Workspace ownership are immutable.
- At most one Playbook Version may be selected as active at a time.
- The active version must belong to the same Playbook.
- The active version must be eligible for execution.
- An archived Playbook must not accept new versions or executions unless restored.
- Removing the active version must require either selecting another eligible version or leaving the Playbook without an active version through an explicit transition.

### Behaviors

Candidate domain behaviors include:

- Rename Playbook.
- Update description.
- Activate version.
- Remove active version.
- Archive Playbook.
- Restore Playbook.

### References

Playbook references Playbook Versions by identifier.

It must not own the complete collection of version contents.

### Why Playbook Version Is Separate

A Playbook may accumulate many immutable versions.

Keeping every version inside the Playbook Aggregate would create:

- An unbounded Aggregate.
- Large persistence operations.
- Increased contention.
- Unnecessary loading.
- Complex version history updates.

The Playbook controls which version is active, but each version has its own lifecycle and content boundary.

## Aggregate: Playbook Source

### Aggregate Root

`PlaybookSource`

### Purpose

Playbook Source represents a configured editorial source from which Playbook content is synchronized.

Notion is the initial source type, but the Aggregate should describe the source concept without exposing Notion SDK structures.

### Candidate State

A Playbook Source may contain:

- Source identity.
- Workspace identity.
- Playbook identity.
- Source type.
- External root reference.
- Configuration reference.
- Synchronization status.
- Last successful synchronization metadata.
- Enabled or disabled state.

### Invariants

- A Playbook Source belongs to exactly one Workspace.
- It must reference a Playbook in the same Workspace.
- Source identity and ownership are immutable.
- A disabled source must not start new Synchronization Runs.
- External root references must satisfy the requirements of the selected source type.
- Secrets must not be stored directly in the Aggregate.
- A source configuration must not expose vendor SDK objects to the domain.

### Behaviors

Candidate behaviors include:

- Enable source.
- Disable source.
- Update external root reference.
- Record successful synchronization.
- Record failed synchronization.
- Change non-secret synchronization settings.

### References

Playbook Source references:

- Playbook by identifier.
- Credential or secret configuration by an opaque reference.
- Synchronization Runs by identifier when needed for navigation.

It must not own the complete history of Synchronization Runs.

## Aggregate: Synchronization Run

### Aggregate Root

`SynchronizationRun`

### Purpose

Synchronization Run represents one attempt to retrieve content from a Playbook Source.

It owns the state transitions and operational outcome of that attempt.

### Candidate State

A Synchronization Run may contain:

- Run identity.
- Workspace identity.
- Playbook Source identity.
- Start and completion timestamps.
- Status.
- Cursor or continuation metadata.
- Retrieval counts.
- Detected change summary.
- Error information.
- Synchronization Snapshot identifier.
- Attempt or retry metadata.

### Initial Candidate Statuses

- Pending.
- Running.
- Completed.
- Failed.
- Cancelled.

Additional statuses must only be introduced when supported by actual behavior.

### Invariants

- A Synchronization Run belongs to the same Workspace as its Playbook Source.
- A run may start only once.
- A terminal run cannot return to a non-terminal status.
- A completed run must reference a Synchronization Snapshot.
- A failed or cancelled run must not claim a completed snapshot.
- Completion time must not precede start time.
- A run must preserve its source identity even if the source is later changed or disabled.
- Retry behavior must create a new attempt or preserve explicit attempt history; failures must not be silently overwritten.

### Behaviors

Candidate behaviors include:

- Start run.
- Record progress.
- Complete with snapshot.
- Fail with error.
- Cancel run.

### What the Aggregate Does Not Own

It does not own:

- The full raw snapshot payload.
- Playbook normalization.
- Publication of a Playbook Version.
- Source credentials.
- Scheduling policy.

Large source content should be persisted separately as a snapshot record or artifact associated by identifier.

## Aggregate: Synchronization Snapshot

### Aggregate Root

`SynchronizationSnapshot`

### Status

Provisional Aggregate candidate.

### Purpose

Synchronization Snapshot represents the immutable source-aligned state produced by a successful Synchronization Run.

### Candidate State

A snapshot may contain:

- Snapshot identity.
- Workspace identity.
- Playbook Source identity.
- Synchronization Run identity.
- Content checksum.
- Creation timestamp.
- Source metadata.
- Raw-content storage reference.
- Item count.
- Schema or parser version.

### Invariants

- A snapshot is immutable after creation.
- It belongs to exactly one successful Synchronization Run.
- It must preserve the same Workspace and source ownership as its run.
- Its checksum and storage reference must identify the exact captured content.
- It must not be modified when source content changes later.
- Vendor-specific raw structures must remain inside this boundary or infrastructure storage.

### Open Design Question

The snapshot may become:

- A lightweight Aggregate with external blob storage.
- An immutable persistence record.
- A domain entity managed by the Synchronization module.

The final choice depends on raw content size, persistence requirements and reprocessing needs.

## Aggregate: Playbook Version

### Aggregate Root

`PlaybookVersion`

### Purpose

Playbook Version represents an immutable executable state of a Playbook.

It is created from validated and normalized content associated with a Synchronization Snapshot.

### Candidate State

A Playbook Version may contain:

- Version identity.
- Workspace identity.
- Playbook identity.
- Synchronization Snapshot identity.
- Version label or sequence.
- Lifecycle status.
- Content checksum.
- Validation summary.
- Creation timestamp.
- Publication timestamp.
- Normalization schema version.

### Initial Candidate Statuses

- Draft.
- Validating.
- Invalid.
- Published.
- Archived.

The exact state machine remains subject to use-case modeling.

### Invariants

- A Playbook Version belongs to exactly one Playbook and Workspace.
- It must reference a Synchronization Snapshot from the same Workspace and source lineage.
- Executable content becomes immutable after publication.
- A Published version must have passed all blocking validations.
- An Invalid version cannot be published.
- Publication timestamp must exist only after publication.
- A version label or sequence must be unique within its Playbook.
- Archiving must not alter historical Executions.
- Corrections to published content require a new Playbook Version.
- Publishing a version does not automatically make it active unless explicitly coordinated by an application use case.

### Behaviors

Candidate behaviors include:

- Begin validation.
- Record validation result.
- Publish.
- Archive.

### Knowledge Content Ownership

The Playbook Version owns the identity and immutability boundary of its normalized knowledge.

However, it should not necessarily contain all Knowledge Items as an in-memory collection.

Knowledge Items may be persisted and queried separately while remaining immutable members of one Playbook Version.

This distinction will be refined during Knowledge domain modeling.

## Aggregate: Project

### Aggregate Root

`Project`

### Purpose

Project represents a long-lived target registered for analysis, auditing or execution.

### Candidate State

A Project may contain:

- Project identity.
- Workspace identity.
- Name.
- Description.
- Project type.
- Source configuration reference.
- Lifecycle status.
- Latest Project Snapshot identifier.
- Creation and update timestamps.

### Invariants

- A Project belongs to exactly one Workspace.
- Project identity and Workspace ownership are immutable.
- A Project Source must be valid for the Project type.
- An archived Project must not create new Project Snapshots or Executions unless restored.
- A latest snapshot reference must point to a snapshot belonging to the same Project.
- Secrets and repository credentials must not be stored directly in the Aggregate.

### References

Project references Project Snapshots by identifier.

It does not own the entire snapshot history.

## Aggregate: Project Snapshot

### Aggregate Root

`ProjectSnapshot`

### Purpose

Project Snapshot represents immutable project state used to make analysis reproducible.

### Candidate State

A Project Snapshot may contain:

- Snapshot identity.
- Workspace identity.
- Project identity.
- Source revision.
- Content checksum.
- Capture timestamp.
- Artifact manifest.
- Inspection metadata.
- Storage reference.
- Capture status.

### Invariants

- A Project Snapshot belongs to one Project and Workspace.
- Captured content is immutable after successful completion.
- The source revision or checksum must identify the analyzed state.
- Artifacts associated with the snapshot must belong to the same snapshot.
- A failed capture must not be treated as an executable snapshot.
- An Execution must not silently use a newer project state than the referenced snapshot.

### Artifact Ownership

The snapshot may own an Artifact manifest.

Large artifact content should normally be referenced through storage identifiers rather than embedded in the Aggregate.

## Aggregate: Execution

### Aggregate Root

`Execution`

### Purpose

Execution represents one runtime attempt to perform a Workflow or Engine operation.

It is the central consistency boundary for runtime orchestration.

### Candidate State

An Execution may contain:

- Execution identity.
- Workspace identity.
- Playbook Version identity.
- Workflow Definition or operation identity.
- Project Snapshot identity when applicable.
- Status.
- Input references.
- Runtime configuration snapshot.
- Step Executions.
- Final result reference or summary.
- Error information.
- Start and completion timestamps.
- Cancellation metadata.

### Owned Entities

Execution owns:

- Step Executions.
- Step attempt state where bounded.
- Runtime step dependencies.
- Execution-level input and output bindings.

Step Execution does not exist independently from its parent Execution.

### Initial Candidate Statuses

- Pending.
- Running.
- Completed.
- Failed.
- Cancelled.

### Invariants

- An Execution belongs to exactly one Workspace.
- Its Playbook Version must belong to the same Workspace.
- Its Project Snapshot, when present, must belong to the same Workspace.
- Execution inputs and selected versions become fixed when execution starts.
- A terminal Execution cannot return to a running state.
- Completed Execution must satisfy its completion conditions.
- Failed Execution must preserve failure information.
- Cancellation must not rewrite previous Step Execution history.
- Step dependencies must not be violated.
- A Step Execution must correspond to a Step Definition or explicitly defined runtime step.
- The final Execution Result must be distinguishable from raw provider responses.
- Provider failures must not automatically determine business failure without applying execution policy.

### Aggregate Size Concern

Long-running workflows may contain many steps and attempts.

The initial version may keep Step Executions inside the Aggregate if workflow sizes remain bounded.

If this becomes too large or creates concurrency problems, Step Execution persistence may be separated while preserving Execution as the lifecycle authority.

Such a change requires explicit design review.

## Aggregate: Audit

### Aggregate Root

`Audit`

### Purpose

Audit represents one evaluation of a target using an Audit Definition from a specific Playbook Version.

### Candidate State

An Audit may contain:

- Audit identity.
- Workspace identity.
- Audit Definition identity.
- Playbook Version identity.
- Target or Project Snapshot identity.
- Related Execution identity.
- Status.
- Findings.
- Summary.
- Start and completion timestamps.

### Owned Entities

Audit initially owns:

- Audit Findings.
- Finding evidence references.
- Finding lifecycle state.

An Audit Finding must not exist without an Audit.

### Invariants

- An Audit belongs to exactly one Workspace.
- Its Playbook Version, Audit Definition and target must belong to the same Workspace or be explicitly global.
- A Finding must reference a Criterion or Audit rule from the selected Playbook Version when applicable.
- Finding severity must comply with the selected Audit Definition or approved policy.
- Evidence references must be traceable.
- Completion requires all mandatory criteria to have a valid evaluation or an explicitly recorded inability to evaluate.
- Completed Audit results must not be silently rewritten.
- Finding lifecycle changes after completion must preserve history.

### Open Question

Finding remediation and lifecycle tracking may eventually require Audit Finding to become a separate Aggregate.

For version 1, it remains owned by Audit unless operational requirements prove otherwise.

## Aggregate: Decision

### Aggregate Root

`Decision`

### Purpose

Decision represents a recorded runtime evaluation of alternatives against Playbook criteria.

### Candidate State

A Decision may contain:

- Decision identity.
- Workspace identity.
- Playbook Version identity.
- Decision Matrix identity.
- Request context.
- Alternatives.
- Criterion Evaluations.
- Recommendation.
- Selected outcome.
- Approval mode.
- Status.
- Timing metadata.

### Owned Entities

Decision may own:

- Alternatives as runtime candidates.
- Criterion Evaluations.
- Ranking or scoring results.
- Recommendation.
- Outcome record.

### Invariants

- A Decision belongs to exactly one Workspace.
- Its Decision Matrix and Playbook Version must be compatible.
- Alternatives must remain identifiable throughout evaluation.
- A selected Alternative must be part of the evaluated set unless the outcome explicitly records an external human override.
- Deterministic results and AI-assisted recommendations must remain distinguishable.
- Evidence and generated explanation must not be conflated.
- Finalized Decisions must preserve the criteria and values used.
- Changing criteria requires a new Decision, not mutation of a finalized historical Decision.

### Status

The final Decision lifecycle remains unresolved until use-case modeling.

## Aggregate: Provider Configuration

### Aggregate Root

`ProviderConfiguration`

### Purpose

Provider Configuration represents workspace-level permission and operational settings for using one AI Provider.

### Candidate State

A Provider Configuration may contain:

- Configuration identity.
- Workspace identity.
- Provider type.
- Credential reference.
- Enabled state.
- Allowed model references.
- Default timeout policy.
- Usage restrictions.
- Non-secret provider options.

### Invariants

- A Provider Configuration belongs to exactly one Workspace.
- Secrets must be represented only by secure references.
- Disabling a provider prevents new invocations but does not alter historical records.
- Allowed models must belong to the configured provider.
- Provider-specific options must be validated before activation.
- Domain logic must not expose raw credentials.

### Separation from Model Catalog

Global provider and model capability metadata must not be owned by workspace Provider Configuration.

Workspace configuration determines availability and policy.

The model catalog describes known provider offerings and capabilities.

## Aggregate: Automation

### Aggregate Root

`Automation`

### Purpose

Automation represents a configured recurring or event-driven invocation of an application use case.

### Candidate State

An Automation may contain:

- Automation identity.
- Workspace identity.
- Name.
- Trigger definition.
- Target use case.
- Input configuration.
- Enabled state.
- Retry policy.
- Last-run metadata.
- Creation and update timestamps.

### Invariants

- An Automation belongs to exactly one Workspace.
- Its target operation must be a supported application use case.
- Trigger configuration must be valid for its trigger type.
- A disabled Automation must not create new Automation Runs.
- An Automation must preserve the Workspace that owns its generated work.
- Secrets must not be embedded in input configuration.
- Changes to an Automation must not rewrite historical Automation Runs.

### Automation Run

Automation Run is expected to be a separate Aggregate or operational record because:

- Run history can grow without bounds.
- Each run has its own lifecycle.
- Runs may be retried independently.
- Loading an Automation must not load its full history.

The final classification will be resolved during Automation modeling.

## Cross-Aggregate Consistency Rules

### Workspace Consistency

All tenant-owned references involved in one operation must belong to the same Workspace.

Examples:

- A Playbook Source and its Playbook.
- A Playbook Version and its Synchronization Snapshot.
- An Execution and its Playbook Version.
- An Execution and its Project Snapshot.
- An Audit and its Execution.
- A Decision and its Decision Matrix.

Cross-Workspace references are prohibited unless the referenced concept is explicitly global and read-only.

### Immutable Historical Inputs

Historical runtime Aggregates must preserve their original references.

Changing the active Playbook Version must not modify:

- Existing Executions.
- Existing Audits.
- Existing Decisions.
- Existing Reports.

Changing the latest Project Snapshot must not change the snapshot used by an existing Execution.

### Eventual Consistency

The following operations may require eventual consistency:

- Publishing a Playbook Version and activating it.
- Completing Synchronization and beginning normalization.
- Completing normalization and publishing a version.
- Completing an Execution and generating Reports.
- Completing an Audit and updating read models.
- Disabling a Provider Configuration and preventing queued invocations.
- Archiving a Workspace and stopping Automations.

Application orchestration must make intermediate states explicit.

### No Distributed Aggregate

The domain must not create an Aggregate that atomically owns:

- Workspace.
- Playbook.
- Playbook Source.
- Playbook Versions.
- Knowledge Items.
- Executions.
- Audits.

These concepts have separate lifecycles and growth characteristics.

## Commands and Aggregate Ownership

The following command candidates indicate the Aggregate responsible for enforcing the main invariant.

| Command                   | Aggregate              |
| ------------------------- | ---------------------- |
| Create workspace          | Workspace              |
| Archive workspace         | Workspace              |
| Register playbook         | Playbook               |
| Activate playbook version | Playbook               |
| Register playbook source  | Playbook Source        |
| Disable playbook source   | Playbook Source        |
| Start synchronization     | Synchronization Run    |
| Complete synchronization  | Synchronization Run    |
| Create playbook version   | Playbook Version       |
| Publish playbook version  | Playbook Version       |
| Archive playbook version  | Playbook Version       |
| Register project          | Project                |
| Create project snapshot   | Project Snapshot       |
| Start execution           | Execution              |
| Complete execution step   | Execution              |
| Cancel execution          | Execution              |
| Start audit               | Audit                  |
| Add audit finding         | Audit                  |
| Update finding status     | Audit                  |
| Request decision          | Decision               |
| Finalize decision         | Decision               |
| Configure AI provider     | Provider Configuration |
| Disable AI provider       | Provider Configuration |
| Create automation         | Automation             |
| Disable automation        | Automation             |

The table does not imply that every command maps directly to a public method.

Application use cases may coordinate validation across several Aggregates before invoking the authoritative Aggregate behavior.

## Repository Boundaries

Each Aggregate Root is expected to have its own repository contract when persistence is introduced.

Candidate repositories include:

- Workspace Repository.
- Playbook Repository.
- Playbook Source Repository.
- Synchronization Run Repository.
- Synchronization Snapshot Repository.
- Playbook Version Repository.
- Project Repository.
- Project Snapshot Repository.
- Execution Repository.
- Audit Repository.
- Decision Repository.
- Provider Configuration Repository.
- Automation Repository.

Repository interfaces belong to the application or domain boundary.

Repository implementations belong to infrastructure.

Repositories must not expose ORM types.

## Concepts Not Yet Confirmed as Aggregates

The following concepts must not be implemented as independent Aggregates yet:

- Knowledge Item.
- Methodology.
- Workflow Definition.
- Prompt Definition.
- Criterion.
- Decision Matrix.
- Audit Definition.
- Experiment.
- Case Study.
- Model Guidance.
- Artifact.
- Evidence.
- Report.
- Automation Run.
- Provider Invocation.
- Model Catalog Entry.

Their final classification depends on:

- Mutation behavior.
- Independent lifecycle.
- Consistency needs.
- Volume.
- Query patterns.
- Historical requirements.

Several of them may be immutable entities, versioned records or read models rather than Aggregate Roots.

## Initial Aggregate Decisions

The following Aggregate candidates are sufficiently stable for continued design:

- Workspace.
- Playbook.
- Playbook Source.
- Synchronization Run.
- Playbook Version.
- Project.
- Project Snapshot.
- Execution.
- Audit.
- Decision.
- Provider Configuration.
- Automation.

Synchronization Snapshot remains provisional but will be treated as an immutable independent boundary during further modeling.

## Open Questions

- Can more than one Playbook Source contribute to one Playbook Version?
- Can one Playbook Source serve multiple Playbooks?
- Is publication separate from activation in every workflow?
- Must Playbook Version numbering be sequential?
- Is a failed normalization represented in Playbook Version or in a separate process record?
- Are Knowledge Items immutable children of Playbook Version or independent versioned records?
- How much Step Execution state can remain safely inside Execution?
- Do long-running Executions require optimistic concurrency or leases?
- Can an Audit exist without an Execution?
- Can an Audit Finding be edited after completion?
- Does remediation require a separate Finding Aggregate?
- Can a Decision have no selected outcome?
- Are Provider Configurations environment-specific?
- Does one Automation trigger exactly one use case?
- Is Automation Run an Aggregate or an operational execution record?

These questions will be resolved through lifecycle and use-case modeling.
