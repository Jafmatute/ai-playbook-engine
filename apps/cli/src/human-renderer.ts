import type { WorkspaceOutput, PlaybookOutput } from '@ai-playbook-engine/application';
import type { Page } from '@ai-playbook-engine/application';

export function renderWorkspace(output: WorkspaceOutput): string {
  const lines: string[] = [
    'Workspace:',
    `  ID:          ${output.workspaceId}`,
    `  Name:        ${output.name}`,
    `  Status:      ${output.status}`,
    `  Description: ${output.description ?? '(none)'}`,
    `  Created At:  ${output.createdAt}`,
  ];

  if (output.archivedAt !== null) {
    lines.push(`  Archived At: ${output.archivedAt}`);
  }

  return lines.join('\n');
}

export function renderWorkspaceInitialized(output: WorkspaceOutput): string {
  const lines: string[] = [
    renderWorkspace(output),
    '',
    `Set the environment variable:`,
    `  AI_PLAYBOOK_ENGINE_WORKSPACE_ID=${output.workspaceId}`,
  ];

  return lines.join('\n');
}

export function renderPlaybook(output: PlaybookOutput): string {
  const lines: string[] = [
    'Playbook:',
    `  ID:                ${output.playbookId}`,
    `  Name:              ${output.name}`,
    `  Status:            ${output.status}`,
    `  Description:       ${output.description ?? '(none)'}`,
    `  Active Version ID: ${output.activeVersionId ?? '(none)'}`,
    `  Created At:        ${output.createdAt}`,
  ];

  if (output.archivedAt !== null) {
    lines.push(`  Archived At: ${output.archivedAt}`);
  }

  return lines.join('\n');
}

export function renderPlaybookList(page: Page<PlaybookOutput>): string {
  if (page.items.length === 0) {
    return 'No playbooks found.';
  }

  const lines: string[] = [
    'Playbooks:',
    '  ID                                    Name          Status    Active Version',
    '  ' + '-'.repeat(80),
  ];

  for (const pb of page.items) {
    const id = pb.playbookId.padEnd(36).slice(0, 36);
    const name = pb.name.padEnd(20).slice(0, 20);
    const status = pb.status.padEnd(8).slice(0, 8);
    const version = pb.activeVersionId?.slice(0, 8) ?? '(none)';
    lines.push(`  ${id}  ${name}  ${status}  ${version}`);
  }

  lines.push('');
  lines.push(
    `Page: ${page.offset + 1}-${page.offset + page.items.length} of ${page.totalCount ?? '?'}`,
  );

  return lines.join('\n');
}
