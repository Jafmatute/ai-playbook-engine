export const VERSION = 4;

export const UP = `
ALTER TABLE playbook_sources
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT playbook_sources_revision_positive CHECK (revision >= 1);
`;
