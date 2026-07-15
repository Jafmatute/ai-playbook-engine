import type { Instant } from '../instant.js';
import type { PlaybookSourceId, PlaybookId, WorkspaceId } from '../identifiers.js';
import type { PlaybookSourceType } from './playbook-source-type.js';
import type { PlaybookSourceStatus } from './playbook-source-status.js';
import type { PlaybookSourceExternalRootReference } from './playbook-source-external-root-reference.js';
import type { PlaybookSourceConfigurationReference } from './playbook-source-configuration-reference.js';
import type {
  CreatePlaybookSourceInput,
  PlaybookSourceState,
} from './playbook-source-contracts.js';

export class PlaybookSource {
  readonly #state: PlaybookSourceState;

  private constructor(state: PlaybookSourceState) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  static create(input: CreatePlaybookSourceInput): PlaybookSource {
    return new PlaybookSource({
      playbookSourceId: input.playbookSourceId,
      workspaceId: input.workspaceId,
      playbookId: input.playbookId,
      type: input.type,
      status: 'enabled',
      externalRootReference: input.externalRootReference,
      configurationReference: input.configurationReference,
      createdAt: input.createdAt,
    });
  }

  get id(): PlaybookSourceId {
    return this.#state.playbookSourceId;
  }

  get workspaceId(): WorkspaceId {
    return this.#state.workspaceId;
  }

  get playbookId(): PlaybookId {
    return this.#state.playbookId;
  }

  get type(): PlaybookSourceType {
    return this.#state.type;
  }

  get status(): PlaybookSourceStatus {
    return this.#state.status;
  }

  get externalRootReference(): PlaybookSourceExternalRootReference {
    return this.#state.externalRootReference;
  }

  get configurationReference(): PlaybookSourceConfigurationReference {
    return this.#state.configurationReference;
  }

  get createdAt(): Instant {
    return this.#state.createdAt;
  }
}
