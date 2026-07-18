export const VERSION = 2;

export const UP = `
ALTER TABLE playbooks
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT playbooks_revision_positive CHECK (revision >= 1);
`;
