# Slice 001 — Workspace and Playbook Management

## Requirements

- PostgreSQL database with a configurable connection string.
- Node.js >= 20.19.0, pnpm as package manager.
- The CLI binary is built from `apps/cli/src/main.ts` and compiled to `apps/cli/dist/`.

## Database URL

The CLI connects to PostgreSQL via the environment variable:

```
AI_PLAYBOOK_ENGINE_DATABASE_URL=postgresql://user:password@localhost:5432/ai_playbook_engine
```

> [!IMPORTANT]
>
> - `.env.example` is only a reference.
> - The Engine does NOT load `.env` files.
> - The variables must be set in the process environment (e.g. your shell environment).

## Build

Compile all packages and the CLI app:

```bash
pnpm build
```

This runs `tsc --build` from the root, which respects the project references defined in each `tsconfig.json`.

## Migration

Apply pending database migrations to bring the schema up to date:

```bash
pnpm cli -- database migrate
```

If migrations are already current, the CLI reports: `Migrations are up to date.`

## Initialize a Workspace

A workspace must be initialized before creating playbooks. Only one workspace is supported per database:

```bash
pnpm cli -- workspace initialize --name "My Workspace"
```

Optional `--description` flag:

```bash
pnpm cli -- workspace initialize --name "Engineering Hub" --description "Central knowledge base"
```

On success the CLI prints the workspace details and the environment variable to set.

## Configure Workspace ID

After initialization, set the workspace ID so subsequent commands know which workspace to use:

```bash
# Windows (PowerShell)
$env:AI_PLAYBOOK_ENGINE_WORKSPACE_ID = "<workspace-id>"

# macOS / Linux
export AI_PLAYBOOK_ENGINE_WORKSPACE_ID=<workspace-id>
```

You can also override the workspace ID per command:

```bash
pnpm cli -- --workspace-id <uuid> workspace show
```

## Show Current Workspace

Display the configured workspace details:

```bash
pnpm cli -- workspace show
```

## Create a Playbook

```bash
pnpm cli -- playbook create --name "My Playbook"
```

Optional `--description` flag:

```bash
pnpm cli -- playbook create --name "Onboarding Guide" --description "Steps for new team members"
```

## List Playbooks

```bash
pnpm cli -- playbook list
```

Supports filtering and pagination:

```bash
pnpm cli -- playbook list --status active --name-prefix "On" --offset 0 --limit 25
```

## Show a Playbook

```bash
pnpm cli -- playbook show --id <playbook-uuid>
```

## JSON Output

Append `--output json` to any command to receive machine-readable output:

```bash
pnpm cli -- --output json workspace show
pnpm cli -- --output json playbook list
```

Successful responses use the shape:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description.",
    "details": {}
  }
}
```

## Running Tests

### Unit Tests

Unit tests do not require a database and can be run with:

```bash
pnpm test:unit
```

Or run all unit tests across all workspace packages:

```bash
pnpm test
```

### Integration and E2E Tests

Integration and E2E tests require a real PostgreSQL database. Set the test database URL in your process environment:

```bash
# Windows (PowerShell)
$env:AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL = "postgresql://user:password@localhost:5432/ai_playbook_engine_test"

# macOS / Linux
export AI_PLAYBOOK_ENGINE_TEST_DATABASE_URL=postgresql://user:password@localhost:5432/ai_playbook_engine_test
```

Then run integration and E2E tests:

```bash
pnpm test:integration
pnpm test:e2e
```
