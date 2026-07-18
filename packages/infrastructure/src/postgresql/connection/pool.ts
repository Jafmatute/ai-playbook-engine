import pg from 'pg';
import type { DatabaseConfig } from '@ai-playbook-engine/config';

export type PostgresParameter = string | number | boolean | Date | null;

export class DatabasePool {
  readonly #pool: pg.Pool;

  constructor(config: DatabaseConfig) {
    this.#pool = new pg.Pool({
      connectionString: config.connectionString,
      max: 5,
    });
  }

  async query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
    queryText: string,
    values?: readonly PostgresParameter[],
  ): Promise<pg.QueryResult<Row>> {
    if (values === undefined) {
      return this.#pool.query<Row>(queryText);
    }

    return this.#pool.query<Row>(queryText, [...values]);
  }

  async connect(): Promise<pg.PoolClient> {
    return this.#pool.connect();
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}
