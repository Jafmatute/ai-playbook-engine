import type { RawConfig } from '@ai-playbook-engine/config';
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
import type { MigrationResult, MigrationFailedError } from '@ai-playbook-engine/infrastructure';

import {
  InitializeWorkspaceHandler,
  GetCurrentWorkspaceHandler,
  CreatePlaybookHandler,
  GetPlaybookHandler,
  ListPlaybooksHandler,
} from '@ai-playbook-engine/application';

export interface Services {
  readonly pool: DatabasePool;
  readonly initializeWorkspace: InitializeWorkspaceHandler;
  readonly getCurrentWorkspace: GetCurrentWorkspaceHandler;
  readonly createPlaybook: CreatePlaybookHandler;
  readonly getPlaybook: GetPlaybookHandler;
  readonly listPlaybooks: ListPlaybooksHandler;
  readonly migrate: () => Promise<Result<MigrationResult, MigrationFailedError>>;
}

export interface BuildServicesError {
  readonly kind: 'config';
  readonly error: { readonly code: string; readonly message: string; readonly details: unknown };
}

export function buildServices(
  config: RawConfig,
  cliWorkspaceIdOverride?: string,
): Result<Services, BuildServicesError> {
  const dbUrlResult = requireDatabaseUrl(config);
  if (!dbUrlResult.success) {
    return err({ kind: 'config', error: dbUrlResult.error });
  }

  const pool = new DatabasePool({ connectionString: dbUrlResult.value });

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

  const listPlaybooks = new ListPlaybooksHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
  );

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
