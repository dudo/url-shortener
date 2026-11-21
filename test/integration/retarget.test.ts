import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, newDestination, originalDestination, patch, redirect } from './support.ts';

test('an edit updates the repository and refreshes a warmed redirect', async t => {
  const { origin, database, cache } = await fixture(t);
  assert.equal(await redirect(origin), originalDestination);
  assert.equal(await cache.get('redirect:v2:docs'), originalDestination);
  assert.equal((await patch(origin, newDestination)).status, 204);
  assert.equal(await database.get('docs'), newDestination);
  assert.equal(await redirect(origin), newDestination);
});

test('edits reject invalid destinations and unknown slugs', async t => {
  const { origin, database } = await fixture(t);
  assert.equal((await patch(origin, '/relative')).status, 400);
  assert.equal((await patch(origin, newDestination, 'missing')).status, 404);
  assert.equal(await database.get('docs'), originalDestination);
});

test('an edit updates the repository when the cache is unavailable', async t => {
  const { origin, database, disconnectCache } = await fixture(t);
  disconnectCache();
  assert.equal((await patch(origin, newDestination)).status, 204);
  assert.equal(await database.get('docs'), newDestination);
  assert.equal(await redirect(origin), newDestination);
});

test('the edit route supports CORS preflight and rejects invalid JSON bodies', async t => {
  const { origin, database } = await fixture(t);
  const url = `${origin}/r/docs`;
  const options = await fetch(url, {
    method: 'OPTIONS',
    headers: { Origin: 'https://ui.example', 'Access-Control-Request-Method': 'PATCH' },
  });
  assert.equal(options.status, 204);
  assert.ok(options.headers.get('access-control-allow-methods')?.split(',').map(method => method.trim()).includes('PATCH'));

  const send = (body: string) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  assert.equal((await send('{"destination":')).status, 400);
  const oversize = JSON.stringify({ destination: 'https://new.example/' + 'a'.repeat(4096) });
  assert.equal((await send(oversize)).status, 413);
  assert.equal(await database.get('docs'), originalDestination);
});
