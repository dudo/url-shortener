import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, newDestination, originalDestination } from './support.ts';

test('retargeting updates the repository and invalidates the warm entry', async () => {
  const { links, records, cached } = fixture();
  assert.equal(await links.resolve('docs'), originalDestination);
  assert.equal(cached.get('redirect:v2:docs'), originalDestination);
  assert.equal(await links.retarget('docs', newDestination), true);
  assert.equal(records.get('docs'), newDestination);
  assert.equal(cached.has('redirect:v2:docs'), false);
  assert.equal(await links.resolve('docs'), newDestination);
});

test('retargeting an unknown slug does not create a link', async () => {
  const { links, records } = fixture();
  assert.equal(await links.retarget('missing', newDestination), false);
  assert.equal(records.has('missing'), false);
  assert.equal(records.get('docs'), originalDestination);
});

test('retargeting still writes to the repository with the cache unavailable', async () => {
  const { links, records } = fixture({ cacheAvailable: false });
  assert.equal(await links.retarget('docs', newDestination), true);
  assert.equal(records.get('docs'), newDestination);
  assert.equal(await links.resolve('docs'), newDestination);
});
