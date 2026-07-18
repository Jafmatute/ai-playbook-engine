export const VERSION = 1;

export const UP = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NULL,
  CONSTRAINT workspaces_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT workspaces_active_no_archived_at CHECK (
    NOT (status = 'active' AND archived_at IS NOT NULL)
  ),
  CONSTRAINT workspaces_archived_requires_archived_at CHECK (
    NOT (status = 'archived' AND archived_at IS NULL)
  ),
  CONSTRAINT workspaces_updated_at_gte_created_at CHECK (updated_at >= created_at),
  CONSTRAINT workspaces_archived_at_gte_created_at CHECK (
    archived_at IS NULL OR archived_at >= created_at
  ),
  CONSTRAINT workspaces_updated_at_gte_archived_at CHECK (
    archived_at IS NULL
    OR updated_at >= archived_at
  )
);

CREATE TABLE IF NOT EXISTS playbooks (
  playbook_id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NULL,
  active_version_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NULL,
  CONSTRAINT playbooks_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT playbooks_active_no_archived_at CHECK (
    NOT (status = 'active' AND archived_at IS NOT NULL)
  ),
  CONSTRAINT playbooks_archived_requires_archived_at CHECK (
    NOT (status = 'archived' AND archived_at IS NULL)
  ),
  CONSTRAINT playbooks_updated_at_gte_created_at CHECK (updated_at >= created_at),
  CONSTRAINT playbooks_archived_at_gte_created_at CHECK (
    archived_at IS NULL OR archived_at >= created_at
  ),
  CONSTRAINT playbooks_updated_at_gte_archived_at CHECK (
    archived_at IS NULL
    OR updated_at >= archived_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_playbooks_workspace_normalized_name
  ON playbooks (workspace_id, normalized_name)
  WHERE status <> 'archived';

CREATE INDEX IF NOT EXISTS idx_playbooks_list
  ON playbooks (workspace_id, normalized_name, playbook_id);
`;
