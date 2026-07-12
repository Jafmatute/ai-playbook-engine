# AI Playbook Engine — Ubiquitous Language

## Purpose

This document defines the initial ubiquitous language of AI Playbook Engine.

Its purpose is to establish consistent terminology before designing:

* Entities.
* Value objects.
* Aggregates.
* Application use cases.
* Persistence models.
* API contracts.
* CLI commands.
* Automation workflows.

The terms defined here describe the Engine domain.

They do not describe the internal structure of Notion, a specific database schema or a specific AI provider.

## Language Rules

The same term must represent the same concept across:

* Architecture documentation.
* Domain code.
* Application use cases.
* API contracts.
* CLI commands.
* Tests.
* Reports.

Different concepts must not share the same name merely because they are technically similar.

External terminology must be translated into the internal language before entering the domain.

For example:

* A Notion page is not automatically a Playbook.
* A Notion database row is not automatically a Knowledge Item.
* An AI provider response is not automatically an Execution Result.
* A repository directory is not automatically a Project Snapshot.

## Core Concepts

### Workspace

A Workspace is the ownership and isolation boundary for personal or future tenant-owned data.

In the initial personal version, the Workspace represents the owner's operating space.

A Workspace does not currently represent:

* A user account.
* An organization membership.
* A role.
* A subscription.
* An authentication session.

Future SaaS capabilities may associate users and organizations with a Workspace.

### Playbook

A Playbook is the logical representation of an AI engineering methodology managed by the Engine.

It identifies a body of knowledge that may contain:

* Methodologies.
* Workflows.
* Decision criteria.
* Prompt definitions.
* Audit definitions.
* Experiments.
* Case studies.
* Model guidance.

The Playbook stored in Notion is the editorial source.

The Playbook inside the Engine is the internal identity and lifecycle representation of that source.

A Playbook is not a single Notion page.

### Playbook Source

A Playbook Source describes where the editorial content of a Playbook comes from.

The initial source type is Notion.

A Playbook Source may contain:

* Source type.
* External identifiers.
* Connection configuration references.
* Root page or database identifiers.
* Synchronization settings.

A Playbook Source does not contain normalized domain knowledge.

### Playbook Version

A Playbook Version is an immutable, identifiable representation of a Playbook at a specific point in time.

It exists to support:

* Reproducibility.
* Historical comparison.
* Validation.
* Publication.
* Auditing.
* Execution traceability.

An Execution must reference the Playbook Version used to produce its result.

A Playbook Version must not change after it becomes executable.

Corrections require a new version.

### Active Playbook Version

The Active Playbook Version is the version selected as the default for new executions.

Activating a version does not delete or alter previous versions.

Historical executions continue referencing the version originally used.

### Draft Playbook Version

A Draft Playbook Version is a version that has been created but is not yet approved for execution.

It may still require:

* Structural validation.
* Semantic validation.
* Reference resolution.
* Human review.

A Draft Playbook Version must not be used by production executions unless explicitly allowed by a future development mode.

### Published Playbook Version

A Published Playbook Version is a validated, immutable version eligible for execution.

Publishing is a domain transition.

A version must satisfy the required validation rules before publication.

### Archived Playbook Version

An Archived Playbook Version is retained for history but is not eligible to become the default version for new executions without an explicit restoration process.

Archiving does not invalidate historical results.

## Synchronization Concepts

### Synchronization

Synchronization is the process of retrieving content from a Playbook Source and registering the retrieved state inside the Engine.

Synchronization does not directly publish a Playbook Version.

The synchronization process must preserve the distinction between:

* External source content.
* Raw retrieved content.
* Normalized knowledge.
* Executable Playbook versions.

### Synchronization Run

A Synchronization Run represents one attempt to synchronize a Playbook Source.

It records operational information such as:

* Start time.
* Completion time.
* Status.
* Source.
* Retrieved items.
* Detected changes.
* Errors.
* Retry information.

A Synchronization Run is an operational process record.

It is not itself a Playbook Version.

### Synchronization Snapshot

A Synchronization Snapshot is the immutable raw or source-aligned representation produced by a successful Synchronization Run.

It preserves enough source information to:

* Reprocess content.
* Compare source states.
* Trace normalized knowledge back to the source.
* Diagnose synchronization issues.

A Synchronization Snapshot may contain Notion-specific structures because it belongs to the synchronization boundary.

Notion-specific structures must not enter the domain knowledge model directly.

### Source Reference

A Source Reference identifies the external origin of synchronized content.

It may include:

* Source system.
* External object identifier.
* Parent identifier.
* Last edited timestamp.
* Source URL metadata.
* Block or record position.

A Source Reference supports traceability but does not define business meaning.

### Change Set

A Change Set describes the differences detected between synchronization states.

Possible changes include:

* Added source items.
* Updated source items.
* Removed source items.
* Moved source items.
* Relationship changes.

A Change Set is not automatically accepted as a new published version.

## Knowledge Concepts

### Knowledge Item

A Knowledge Item is a normalized unit of Playbook knowledge understood by the Engine.

A Knowledge Item belongs to a specific Playbook Version.

It has:

* A stable internal identity.
* A knowledge type.
* Normalized content.
* Source references.
* Validation state.
* Relationships to other Knowledge Items.

A Knowledge Item must not expose Notion SDK types.

### Knowledge Type

A Knowledge Type identifies the semantic role of a Knowledge Item.

Initial candidate types include:

* Methodology.
* Workflow.
* Prompt Definition.
* Audit Definition.
* Decision Matrix.
* Criterion.
* Experiment.
* Case Study.
* Model Guidance.

This list is provisional until each category is modeled in detail.

### Methodology

A Methodology is a structured engineering approach defined by the Playbook.

It may describe:

* Objectives.
* Scope.
* Principles.
* Activities.
* Inputs.
* Outputs.
* Quality criteria.
* Applicable contexts.

A Methodology may reference one or more Workflows.

### Workflow

A Workflow is an ordered or conditionally connected set of Steps designed to achieve an engineering objective.

A Workflow may include:

* Deterministic steps.
* Human review steps.
* AI-assisted steps.
* Validation steps.
* Decision steps.

A Workflow Definition belongs to the Playbook.

A Workflow Execution is a runtime instance and belongs to the Execution domain.

### Step Definition

A Step Definition describes one unit of work inside a Workflow.

It defines what should happen, but it is not an executed action.

A Step Definition may specify:

* Required inputs.
* Expected outputs.
* Execution type.
* Preconditions.
* Completion criteria.
* Failure behavior.
* References to Prompt Definitions or Decision Criteria.

### Prompt Definition

A Prompt Definition is a versioned Playbook instruction intended for an AI-assisted step.

It may contain:

* Purpose.
* Instruction template.
* Required variables.
* Expected output structure.
* Constraints.
* Evaluation criteria.
* Compatible capabilities.

A Prompt Definition is not a provider request.

A provider request is created at runtime from a Prompt Definition plus execution context.

### Criterion

A Criterion is a rule or condition used to evaluate, classify, accept, reject or rank something.

A Criterion may be:

* Deterministic.
* Evidence-based.
* AI-assisted.
* Quantitative.
* Qualitative.

A Criterion must specify what is being evaluated and how its result is interpreted.

### Decision Matrix

A Decision Matrix is a structured set of criteria and alternatives used to support a Decision.

It may define:

* Alternatives.
* Criteria.
* Weights.
* Constraints.
* Eligibility rules.
* Scoring rules.
* Tie-breaking rules.

A Decision Matrix is Playbook knowledge.

A Decision is a runtime outcome produced by applying it.

### Audit Definition

An Audit Definition describes how a target should be evaluated.

It may specify:

* Audit purpose.
* Applicable target types.
* Required evidence.
* Criteria.
* Severity rules.
* Finding categories.
* Completion conditions.

An Audit Definition belongs to a Playbook Version.

An Audit is the runtime evaluation performed from that definition.

### Experiment

An Experiment is a documented evaluation of a hypothesis, technique, workflow, model or provider.

It may include:

* Hypothesis.
* Setup.
* Inputs.
* Observations.
* Results.
* Limitations.
* Conclusions.

Experiments provide evidence but do not automatically become binding rules.

### Case Study

A Case Study is a documented application of Playbook knowledge to a real or representative scenario.

It may provide:

* Context.
* Problem.
* Approach.
* Decisions.
* Results.
* Lessons.

A Case Study supports understanding and guidance but is not necessarily executable.

### Model Guidance

Model Guidance describes known suitability, limitations or recommendations for AI models or model capabilities.

It may refer to:

* Task types.
* Required capabilities.
* Quality observations.
* Cost considerations.
* Latency considerations.
* Context limitations.
* Tool-use requirements.

Model Guidance is distinct from live provider metadata.

## Project Concepts

### Project

A Project is a target registered in the Engine for analysis, execution or auditing.

A Project may represent:

* A software repository.
* A local source-code directory.
* A product initiative.
* A document set.
* An architecture.
* A requirements package.

A Project is a logical identity.

Its contents may change over time.

### Project Source

A Project Source describes where project artifacts are obtained.

Examples may include:

* Local directory.
* Git repository.
* Uploaded archive.
* Remote repository integration.

A Project Source belongs to infrastructure and integration boundaries.

### Project Snapshot

A Project Snapshot is an immutable representation of relevant project state at a specific point in time.

It exists to make executions reproducible.

A Project Snapshot may include:

* Commit reference.
* File inventory.
* Selected file contents.
* Metadata.
* Configuration.
* Documentation.
* Generated inspection results.

An Execution should reference a Project Snapshot rather than an undefined moving project state when reproducibility is required.

### Artifact

An Artifact is a discrete item included in a Project Snapshot or supplied as execution input.

Examples:

* Source file.
* Configuration file.
* Architecture document.
* Test report.
* Requirements document.
* Diff.
* Build result.

An Artifact must have an identifiable type and origin.

### Evidence

Evidence is information used to support an Audit Finding, Criterion Evaluation or Decision.

Evidence may originate from:

* Project Artifacts.
* Execution outputs.
* Deterministic analysis.
* AI-assisted analysis.
* Human input.
* External metadata.

Evidence must remain traceable to its origin.

## Execution Concepts

### Execution

An Execution is a runtime attempt to perform a defined Workflow or Engine operation using specific inputs and a specific Playbook Version.

An Execution records:

* Workspace.
* Playbook Version.
* Workflow or operation.
* Input references.
* Project Snapshot when applicable.
* Configuration.
* Status.
* Steps.
* Outputs.
* Errors.
* Timing.
* AI provider usage.

An Execution is not the same as a Workflow Definition.

### Execution Request

An Execution Request represents the validated intention to start an Execution.

It specifies:

* Requested operation.
* Playbook Version or version-selection policy.
* Input.
* Target context.
* Runtime options.

An Execution Request is not yet an Execution result.

### Execution Plan

An Execution Plan is the runtime-resolved sequence of work derived from a Workflow Definition and the current inputs.

It may resolve:

* Conditional steps.
* Required capabilities.
* Input bindings.
* Dependencies.
* Execution order.

An Execution Plan belongs to one Execution.

### Step Execution

A Step Execution is the runtime instance of a Step Definition.

It records:

* Step identity.
* Status.
* Input.
* Output.
* Attempts.
* Errors.
* Timing.
* Provider invocation references when applicable.

### Execution Status

Execution Status represents the lifecycle state of an Execution.

Initial candidate states include:

* Pending.
* Running.
* Completed.
* Failed.
* Cancelled.

Additional states such as Paused or Partially Completed must only be added when supported by real behavior.

### Execution Result

An Execution Result is the final domain outcome of an Execution.

It may contain:

* Structured outputs.
* Recommendations.
* Findings.
* Generated artifacts.
* Summary.
* Completion metadata.

An Execution Result must be distinguishable from raw provider output.

### Deterministic Step

A Deterministic Step produces its result from defined rules or software logic without requiring generative AI judgment.

Examples:

* Schema validation.
* File matching.
* Rule evaluation.
* Score calculation.
* Reference resolution.

### AI-Assisted Step

An AI-Assisted Step delegates a bounded task to an AI provider through the AI Gateway.

The Engine remains responsible for:

* Building the request.
* Selecting required capabilities.
* Validating the response.
* Recording usage.
* Applying domain rules to the normalized result.

An AI provider does not control the Execution lifecycle.

### Human Review Step

A Human Review Step requires explicit human evaluation or approval.

Human review is distinct from an AI recommendation.

The initial version may defer interactive review behavior, but the concept must not be modeled as an AI step.

## Audit Concepts

### Audit

An Audit is a runtime evaluation of a target using an Audit Definition from a specific Playbook Version.

An Audit references:

* Target.
* Project Snapshot or input snapshot.
* Audit Definition.
* Playbook Version.
* Execution information.
* Findings.
* Evidence.
* Status.

### Audit Finding

An Audit Finding is a specific result indicating a detected condition, risk, deficiency, observation or improvement opportunity.

A Finding may contain:

* Title.
* Description.
* Category.
* Severity.
* Evidence.
* Criterion reference.
* Recommendation.
* Status.

A Finding must be traceable to the Audit Definition and evidence that produced it.

### Finding Severity

Finding Severity expresses the significance or impact of an Audit Finding.

The severity scale must be defined by the relevant Audit Definition or a shared Playbook policy.

The domain must not assume a universal severity scale before one is approved.

### Finding Status

Finding Status represents the lifecycle of a Finding after detection.

Candidate states may include:

* Open.
* Accepted.
* Resolved.
* Dismissed.

The final lifecycle will be defined during Audit domain modeling.

### Audit Evidence

Audit Evidence is Evidence specifically associated with an Audit Finding or evaluated Criterion.

AI-generated statements without source traceability must not be treated as sufficient evidence by default.

## Decision Concepts

### Decision

A Decision is a recorded runtime outcome produced by evaluating alternatives against Playbook criteria.

A Decision may select:

* A model.
* A provider.
* A workflow.
* A methodology.
* A strategy.
* An implementation approach.

A Decision must preserve the criteria and Playbook Version used.

### Decision Request

A Decision Request defines the question, alternatives, constraints and context to evaluate.

### Alternative

An Alternative is one candidate considered by a Decision.

An Alternative may be eligible, rejected, ranked or selected.

### Criterion Evaluation

A Criterion Evaluation is the result of applying a Criterion to an Alternative or target.

It may contain:

* Result.
* Score.
* Evidence.
* Explanation.
* Confidence.
* Evaluation method.

### Recommendation

A Recommendation is an advised course of action produced by Decision Support.

A Recommendation is not automatically a binding Decision.

The system must preserve whether the outcome was:

* Deterministically selected.
* AI-recommended.
* Human-approved.
* Automatically applied.

### Decision Outcome

A Decision Outcome records the selected or rejected alternatives and the reason for the result.

It must distinguish factual evidence from generated explanation.

## AI Provider Concepts

### AI Provider

An AI Provider is an external or local service capable of executing AI requests.

Examples may include commercial APIs or self-hosted systems.

The domain must not depend on provider-specific SDK types.

### Model

A Model is an AI capability offered by an AI Provider.

A Model identity must include enough provider context to avoid ambiguity.

A model name alone may not be globally unique.

### Model Capability

A Model Capability describes a function or constraint relevant to model selection.

Examples:

* Text generation.
* Structured output.
* Tool use.
* Vision.
* Large context.
* Code generation.
* Reasoning.
* Embeddings.

Capabilities describe suitability, not guaranteed quality.

### Provider Configuration

Provider Configuration defines workspace-specific or runtime configuration required to use an AI Provider.

It may reference:

* Credential identifiers.
* Enabled models.
* Default timeouts.
* Usage restrictions.
* Provider-specific options.

Secrets must not be stored directly inside domain entities.

### AI Request

An AI Request is a provider-neutral runtime request produced by the Engine.

It may contain:

* Instructions.
* Input content.
* Required capabilities.
* Structured output expectations.
* Runtime constraints.
* Traceability metadata.

### AI Response

An AI Response is the normalized provider-neutral response returned by the AI Gateway.

It may contain:

* Generated content.
* Structured data.
* Usage metadata.
* Completion status.
* Provider references.
* Validation information.

Raw vendor responses remain inside the adapter boundary.

### Provider Invocation

A Provider Invocation is the operational record of one attempt to execute an AI Request through a provider and model.

It records:

* Provider.
* Model.
* Request reference.
* Attempt.
* Status.
* Usage.
* Latency.
* Errors.

A Provider Invocation is not an Execution.

One Execution may contain multiple Provider Invocations.

## Automation Concepts

### Automation

An Automation is a configured rule that invokes an application use case on a schedule or in response to an event.

Examples:

* Synchronize a Playbook.
* Validate the latest version.
* Execute an audit.
* Generate a report.

Automation must not contain business logic already owned by another module.

### Automation Run

An Automation Run records one invocation of an Automation.

It must preserve the Workspace and configuration that originated the work.

### Trigger

A Trigger defines when an Automation should run.

Initial trigger types may include:

* Schedule.
* Manual invocation.
* External event.

The final trigger model will be defined during Automation domain modeling.

## Reporting and Traceability Concepts

### Report

A Report is a presentation or export of authoritative domain results.

A Report may summarize:

* Executions.
* Audits.
* Findings.
* Decisions.
* Synchronization history.
* Provider usage.

A Report does not own the underlying business result.

### Trace

A Trace is the connected record of inputs, decisions, steps, provider invocations and outputs associated with an operation.

Traceability must allow the system to answer:

* Which Playbook Version was used?
* Which target state was analyzed?
* Which steps ran?
* Which model and provider were invoked?
* Which evidence supported the outcome?
* Which errors occurred?
* Can the result be reproduced?

### Usage Record

A Usage Record captures measurable consumption associated with an operation.

Examples:

* Input tokens.
* Output tokens.
* Requests.
* Duration.
* Estimated cost.
* Storage.
* Execution count.

Usage measurement does not imply billing.

## Terms That Must Remain Distinct

### Playbook vs Playbook Version

A Playbook is the long-lived identity.

A Playbook Version is an immutable state of that Playbook.

### Synchronization Snapshot vs Playbook Version

A Synchronization Snapshot represents retrieved external state.

A Playbook Version represents validated internal Playbook state.

### Workflow Definition vs Execution

A Workflow Definition describes intended behavior.

An Execution is one runtime attempt to perform it.

### Step Definition vs Step Execution

A Step Definition belongs to Playbook knowledge.

A Step Execution belongs to an Execution.

### Audit Definition vs Audit

An Audit Definition describes how evaluation should occur.

An Audit is one runtime evaluation.

### Decision Matrix vs Decision

A Decision Matrix is reusable Playbook knowledge.

A Decision is a runtime outcome.

### Project vs Project Snapshot

A Project is a changing logical target.

A Project Snapshot is an immutable captured state.

### Prompt Definition vs AI Request

A Prompt Definition is reusable Playbook knowledge.

An AI Request is a runtime provider-neutral request.

### AI Response vs Execution Result

An AI Response is one normalized response from a provider.

An Execution Result is the domain outcome of the complete execution.

### Recommendation vs Decision

A Recommendation advises.

A Decision records the selected outcome.

### Evidence vs Explanation

Evidence supports a result through traceable information.

An Explanation communicates reasoning or interpretation.

An explanation is not automatically evidence.

## Prohibited Ambiguous Terms

The following terms should not be used without qualification:

### Job

Use a more precise term:

* Automation Run.
* Synchronization Run.
* Execution.
* Worker task.

### Process

Use:

* Workflow.
* Execution.
* Synchronization.
* Automation.

### Result

Use:

* Execution Result.
* Audit Finding.
* Decision Outcome.
* AI Response.
* Validation Result.

### Configuration

Use:

* Provider Configuration.
* Playbook Source Configuration.
* Runtime Configuration.
* Automation Configuration.

### Version

Use:

* Playbook Version.
* Schema Version.
* Model Version.
* Application Version.

### Item

Use:

* Knowledge Item.
* Source Item.
* Artifact.
* Finding.
* Alternative.

## Open Domain Questions

The following questions remain intentionally unresolved:

* What exact Knowledge Types are supported in version 1?
* Is a Workflow an aggregate or part of a Playbook Version aggregate?
* How are Playbook Versions identified and numbered?
* What publication states are required?
* Which validation failures block publication?
* How are internal references represented?
* What is the final Execution state machine?
* Which Step types are supported in version 1?
* What is the final Audit severity model?
* Can Findings be manually created?
* Are Decisions always associated with Executions?
* Which Project source types are included initially?
* Which AI capabilities are modeled directly?
* How are provider credentials referenced securely?
* Which records are authoritative versus derived read models?

These questions will be resolved during aggregate and use-case modeling.

