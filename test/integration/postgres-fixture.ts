import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { TestContext } from 'node:test';
import { Client } from 'pg';

export async function postgresFixture(t: TestContext) {
  const baseUrl = process.env.TEST_DATABASE_URL;
  if (!baseUrl) throw new Error('Set TEST_DATABASE_URL to a test Postgres instance.');

  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Client({ connectionString: baseUrl, connectionTimeoutMillis: 2000 });
  await admin.connect();
  const cleanup: Array<() => void | Promise<void>> = [() => admin.end()];
  t.after(async () => {
    for (const dispose of cleanup.reverse()) await dispose();
  });

  await admin.query(`CREATE SCHEMA ${schema}`);
  cleanup.push(async () => { await admin.query(`DROP SCHEMA ${schema} CASCADE`); });
  await admin.query(`SET search_path TO ${schema}`);
  await admin.query(await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8'));

  const databaseUrl = new URL(baseUrl);
  databaseUrl.searchParams.set('options', `-c search_path=${schema}`);
  return { databaseUrl: databaseUrl.href, cleanup };
}
