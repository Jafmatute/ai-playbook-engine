import type { RawConfig } from '@ai-playbook-engine/config';
import { requireDatabaseUrl } from '@ai-playbook-engine/config';
import { err, ok, type Result } from '@ai-playbook-engine/shared';

import {
  DatabasePool,
  SystemClock,
  CryptoWorkspaceIdGenerator,
  CryptoPlaybookIdGenerator,
  CryptoPlaybookSourceIdGenerator,
  ConfiguredCurrentWorkspaceProvider,
  PostgresWorkspaceRepository,
  PostgresPlaybookRepository,
  PostgresPlaybookSourceRepository,
  runMigrations,
} from '@ai-playbook-engine/infrastructure';
import type { MigrationResult, MigrationFailedError } from '@ai-playbook-engine/infrastructure';

import {
  InitializeWorkspaceHandler,
  GetCurrentWorkspaceHandler,
  CreatePlaybookHandler,
  RenamePlaybookHandler,
  ArchivePlaybookHandler,
  RestorePlaybookHandler,
  GetPlaybookHandler,
  ListPlaybooksHandler,
  RegisterPlaybookSourceHandler,
  GetPlaybookSourceHandler,
  ListPlaybookSourcesHandler,
} from '@ai-playbook-engine/application';

export interface Services {
  readonly pool: DatabasePool;
  readonly initializeWorkspace: InitializeWorkspaceHandler;
  readonly getCurrentWorkspace: GetCurrentWorkspaceHandler;
  readonly createPlaybook: CreatePlaybookHandler;
  readonly renamePlaybook: RenamePlaybookHandler;
  readonly archivePlaybook: ArchivePlaybookHandler;
  readonly restorePlaybook: RestorePlaybookHandler;
  readonly getPlaybook: GetPlaybookHandler;
  readonly listPlaybooks: ListPlaybooksHandler;
  readonly registerPlaybookSource: RegisterPlaybookSourceHandler;
  readonly getPlaybookSource: GetPlaybookSourceHandler;
  readonly listPlaybookSources: ListPlaybookSourcesHandler;
  readonly migrate: () => Promise<Result<MigrationResult, MigrationFailedError>>;
}

export interface BuildServicesError {
  readonly kind: 'config';
  readonly error: { readonly code: string; readonly message: string; readonly details: unknown };
}

export function buildServices(config: RawConfig): Result<Services, BuildServicesError> {
  const dbUrlResult = requireDatabaseUrl(config);
  if (!dbUrlResult.success) {
    return err({ kind: 'config', error: dbUrlResult.error });
  }

  const pool = new DatabasePool(dbUrlResult.value);

  const clock = new SystemClock();
  const workspaceIdGenerator = new CryptoWorkspaceIdGenerator();
  const playbookIdGenerator = new CryptoPlaybookIdGenerator();
  const playbookSourceIdGenerator = new CryptoPlaybookSourceIdGenerator();

  const currentWorkspaceProvider = new ConfiguredCurrentWorkspaceProvider(config.workspaceId);

  const workspaceRepository = new PostgresWorkspaceRepository(pool);
  const playbookRepository = new PostgresPlaybookRepository(pool);
  const playbookSourceRepository = new PostgresPlaybookSourceRepository(pool);

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

  const renamePlaybook = new RenamePlaybookHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    clock,
  );

  const archivePlaybook = new ArchivePlaybookHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    clock,
  );

  const restorePlaybook = new RestorePlaybookHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    clock,
  );

  const registerPlaybookSource = new RegisterPlaybookSourceHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    playbookSourceRepository,
    clock,
    playbookSourceIdGenerator,
  );

  const getPlaybookSource = new GetPlaybookSourceHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookSourceRepository,
  );

  const listPlaybookSources = new ListPlaybookSourcesHandler(
    currentWorkspaceProvider,
    workspaceRepository,
    playbookRepository,
    playbookSourceRepository,
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
    renamePlaybook,
    archivePlaybook,
    restorePlaybook,
    registerPlaybookSource,
    getPlaybookSource,
    listPlaybookSources,
    getPlaybook,
    listPlaybooks,
    migrate: () => runMigrations(pool),
  });
}
