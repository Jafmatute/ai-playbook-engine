export const workspaceStatuses = Object.freeze(['active', 'archived'] as const);

export type WorkspaceStatus = (typeof workspaceStatuses)[number];
