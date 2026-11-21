import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabasePool } from '../../src/adapters/postgres-pool.ts';
import { createLinkRepository } from '../../src/repositories/links.ts';
import { createLinks } from '../../src/services/links.ts';
import { postgresFixture } from './postgres-fixture.ts';
import { originalDestination, stubCache } from '../support.ts';

test('a fresh schema has no matching link', async t => {
  const { databaseUrl, cleanup } = await postgresFixture(t);
  const pool = createDatabasePool(databaseUrl);
  cleanup.push(() => pool.end());
  const repository = await createLinkRepository(pool);
  const { cache, cached } = stubCache();
  const links = createLinks({ repository, cache });
  assert.equal(await links.resolve('docs'), null);
  assert.equal(cached.size, 0);
});

test('a duplicate insert preserves the original link across connections', async t => {
  const { databaseUrl, cleanup } = await postgresFixture(t);
  const writerPool = createDatabasePool(databaseUrl);
  try {
    const writer = await createLinkRepository(writerPool);
    assert.equal(await writer.insert('docs', originalDestination), true);
    assert.equal(await writer.insert('docs', 'https://duplicate.example/docs'), false);
  } finally {
    await writerPool.end();
  }

  const pool = createDatabasePool(databaseUrl);
  cleanup.push(() => pool.end());
  const repository = await createLinkRepository(pool);
  const { cache, cached } = stubCache();
  const links = createLinks({ repository, cache });
  assert.equal(await links.resolve('docs'), originalDestination);
  assert.equal(cached.get('redirect:docs'), originalDestination);
});
