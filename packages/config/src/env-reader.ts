export interface EnvReader {
  get(name: string): string | undefined;
}

export class ProcessEnvReader implements EnvReader {
  get(name: string): string | undefined {
    return process.env[name];
  }
}

export class MapEnvReader implements EnvReader {
  readonly #map: ReadonlyMap<string, string>;

  constructor(map: ReadonlyMap<string, string>) {
    this.#map = map;
  }

  get(name: string): string | undefined {
    return this.#map.get(name);
  }
}
