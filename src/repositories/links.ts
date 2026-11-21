import type { Pool } from 'pg';

export async function createLinkRepository(database: Pick<Pool, 'query'>) {
  await database.query('SELECT slug, destination FROM links LIMIT 0');

  return {
    async get(slug: string) {
      const result = await database.query<{ destination: string }>(
        'SELECT destination FROM links WHERE slug = $1', [slug],
      );
      return result.rows[0]?.destination ?? null;
    },
    async insert(slug: string, destination: string) {
      const result = await database.query(
        'INSERT INTO links (slug, destination) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING',
        [slug, destination],
      );
      return result.rowCount === 1;
    },
    async update(slug: string, destination: string) {
      const result = await database.query(
        'UPDATE links SET destination = $2 WHERE slug = $1', [slug, destination],
      );
      return result.rowCount === 1;
    },
  };
}
