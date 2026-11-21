import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, originalDestination } from './support.ts';

test('a cache miss reads the repository and fills the cache', async () => {
  const { links, cached } = fixture();
  assert.equal(await links.resolve('docs'), originalDestination);
  assert.equal(cached.get('redirect:v2:docs'), originalDestination);
});

test('a warm cache serves the destination without consulting the repository', async () => {
  const { links, cached, records } = fixture();
  cached.set('redirect:v2:docs', originalDestination);
  records.clear();
  assert.equal(await links.resolve('docs'), originalDestination);
});

test('an unknown slug returns null without filling the cache', async () => {
  const { links, cached } = fixture();
  assert.equal(await links.resolve('missing'), null);
  assert.equal(cached.size, 0);
});

test('a cache outage falls back to the repository', async () => {
  const { links, cached } = fixture({ cacheAvailable: false });
  assert.equal(await links.resolve('docs'), originalDestination);
  assert.equal(cached.size, 0);
});
