export const VERSION = 3;

export const UP = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_playbooks_workspace_playbook_id
    ON playbooks (workspace_id, playbook_id);

  CREATE TABLE IF NOT EXISTS playbook_sources (
    playbook_source_id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
    playbook_id UUID NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    external_root_reference TEXT NOT NULL,
    configuration_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    last_successful_synchronization_run_id UUID NULL,
    last_successful_synchronization_at TIMESTAMPTZ NULL,
    last_failed_synchronization_run_id UUID NULL,
    last_failed_synchronization_at TIMESTAMPTZ NULL,
    CONSTRAINT playbook_sources_playbook_owner_fk FOREIGN KEY (workspace_id, playbook_id)
      REFERENCES playbooks (workspace_id, playbook_id),
    CONSTRAINT playbook_sources_type_check CHECK (type IN ('notion')),
    CONSTRAINT playbook_sources_status_check CHECK (status IN ('enabled', 'disabled')),
    CONSTRAINT playbook_sources_external_root_reference_check CHECK (
      CHAR_LENGTH(external_root_reference) BETWEEN 1 AND 512
      AND external_root_reference = BTRIM(external_root_reference)
    ),
    CONSTRAINT playbook_sources_configuration_reference_check CHECK (
      CHAR_LENGTH(configuration_reference) BETWEEN 1 AND 512
      AND configuration_reference = BTRIM(configuration_reference)
    ),
    CONSTRAINT playbook_sources_success_metadata_check CHECK (
      (last_successful_synchronization_run_id IS NULL) = (last_successful_synchronization_at IS NULL)
    ),
    CONSTRAINT playbook_sources_failure_metadata_check CHECK (
      (last_failed_synchronization_run_id IS NULL) = (last_failed_synchronization_at IS NULL)
    ),
    CONSTRAINT playbook_sources_success_after_created_check CHECK (
      last_successful_synchronization_at IS NULL OR last_successful_synchronization_at >= created_at
    ),
    CONSTRAINT playbook_sources_failure_after_created_check CHECK (
      last_failed_synchronization_at IS NULL OR last_failed_synchronization_at >= created_at
    ),
    CONSTRAINT playbook_sources_distinct_outcome_runs_check CHECK (
      last_successful_synchronization_run_id IS NULL
      OR last_failed_synchronization_run_id IS NULL
      OR last_successful_synchronization_run_id <> last_failed_synchronization_run_id
    )
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_playbook_sources_one_enabled_per_playbook
    ON playbook_sources (workspace_id, playbook_id) WHERE status = 'enabled';

  CREATE INDEX IF NOT EXISTS idx_playbook_sources_list_by_playbook
    ON playbook_sources (workspace_id, playbook_id, created_at DESC, playbook_source_id ASC);
`;
