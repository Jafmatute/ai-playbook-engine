import pg from 'pg';

export class DatabasePool {
  readonly #pool: pg.Pool;

  constructor(connectionString: string) {
    this.#pool = new pg.Pool({
      connectionString,
      max: 5,
    });
  }

  get pool(): pg.Pool {
    return this.#pool;
  }

  async query(queryText: string, values?: readonly unknown[]): Promise<pg.QueryResult> {
    return this.#pool.query(queryText, values as pg.QueryConfigValues<unknown[]>);
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}
