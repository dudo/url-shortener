import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createApp } from '../src/app.ts';
import { createLinkRoutes } from '../src/routes/links.ts';
import { fixture, originalDestination } from './support.ts';

async function request(method: string, path: string) {
  const app = createApp([createLinkRoutes(fixture().links)]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}${path}`, { method, redirect: 'manual' });
  } finally {
    server.close();
  }
}

test('HEAD redirects like GET', async () => {
  const response = await request('HEAD', '/r/docs');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), originalDestination);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('HEAD for an unknown slug returns 404', async () => {
  const response = await request('HEAD', '/r/missing');
  assert.equal(response.status, 404);
});

test('unsupported methods return 405 listing GET and HEAD', async () => {
  const response = await request('POST', '/r/docs');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});
