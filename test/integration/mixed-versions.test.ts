import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { fixture, newDestination, originalDestination, patch, redirect } from './support.ts';

const previousDir = process.env.PREVIOUS_DIR ?? '.previous';
assert.ok(existsSync(previousDir), 'Check out the previous release in .previous or set PREVIOUS_DIR.');
const load = (path: string) => import(pathToFileURL(resolve(previousDir, 'src', path)).href);
const [app, links, routes] = await Promise.all([
  load('app.ts'),
  load('services/links.ts'),
  load('routes/links.ts'),
]);
const previous = { ...app, ...links, ...routes };

test('both versions serve the new destination after an acknowledged edit', async t => {
  const { origin, previousOrigin, database, cache } = await fixture(t, previous);
  assert.ok(previousOrigin);

  assert.equal(await redirect(previousOrigin), originalDestination);
  assert.equal(await redirect(origin), originalDestination);
  assert.equal(await cache.get('redirect:docs'), originalDestination);
  assert.equal(await cache.get('redirect:v2:docs'), originalDestination);

  assert.equal((await patch(origin, newDestination)).status, 204);
  assert.equal(await database.get('docs'), newDestination);
  assert.equal(await redirect(origin), newDestination);
  assert.equal(await redirect(previousOrigin), newDestination, 'The previous release served a stale redirect');
});
