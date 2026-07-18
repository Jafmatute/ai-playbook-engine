import type { RawConfig, CliOutput } from '@ai-playbook-engine/config';
import { requireDatabaseUrl } from '@ai-playbook-engine/config';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  DatabasePool,
  SystemClock,
  CryptoWorkspaceIdGenerator,
  CryptoPlaybookIdGenerator,
  ConfiguredCurrentWorkspaceProvider,
  PostgresWorkspaceRepository,
  PostgresPlaybookRepository,
  runMigrations,
} from '@ai-playbook-engine/infrastructure';
import type { MigrationResult } from '@ai-playbook-engine/infrastructure';

import {
  InitializeWorkspaceHandler,
  GetCurrentWorkspaceHandler,
  CreatePlaybookHandler,
  GetPlaybookHandler,
  ListPlaybooksHandler,
} from '@ai-playbook-engine/application';
import type { PersistenceOperationFailedError } from '@ai-playbook-engine/application';

export interface Services {
  readonly pool: DatabasePool;
  readonly initializeWorkspace: InitializeWorkspaceHandler;
  readonly getCurrentWorkspace: GetCurrentWorkspaceHandler;
  readonly createPlaybook: CreatePlaybookHandler;
  readonly getPlaybook: GetPlaybookHandler;
  readonly listPlaybooks: ListPlaybooksHandler;
  readonly migrate: () => Promise<Result<MigrationResult, PersistenceOperationFailedError>>;
}

export function buildServices(
  config: RawConfig,
  cliOutput: CliOutput,
  cliWorkspaceIdOverride?: string,
): Result<Services, string> {
  const dbUrlResult = requireDatabaseUrl(config);
  if (!dbUrlResult.success) {
    return err(dbUrlResult.error.message);
  }

  const pool = new DatabasePool(dbUrlResult.value);

  const clock = new SystemClock();
  const workspaceIdGenerator = new CryptoWorkspaceIdGenerator();
  const playbookIdGenerator = new CryptoPlaybookIdGenerator();

  const effectiveWorkspaceId = cliWorkspaceIdOverride ?? config.workspaceId;
  const currentWorkspaceProvider = new ConfiguredCurrentWorkspaceProvider(effectiveWorkspaceId);

  const workspaceRepository = new PostgresWorkspaceRepository(pool);
  const playbookRepository = new PostgresPlaybookRepository(pool);

  const initializeWorkspace = new InitializeWorkspaceHandler(
    workspaceRepository,
    clock,
    workspaceIdGenerator,
  );

  const getCurrentWorkspace = new GetCurrentWorkspaceHandler(
    currentWorkspaceProvider,
    workspaceRepository,
  );

  const createPlaybook = new CreatePlaybookHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    clock,
    playbookIdGenerator,
  );

  const getPlaybook = new GetPlaybookHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
  );

  const listPlaybooks = new ListPlaybooksHandler(currentWorkspaceProvider, playbookRepository);

  return ok({
    pool,
    initializeWorkspace,
    getCurrentWorkspace,
    createPlaybook,
    getPlaybook,
    listPlaybooks,
    migrate: () => runMigrations(pool),
  });
}
