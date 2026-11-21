import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { TestContext } from 'node:test';
import { createApp } from '../../src/app.ts';
import { createLinkRoutes } from '../../src/routes/links.ts';
import { createLinks } from '../../src/services/links.ts';
import { createDoubles } from '../support.ts';

export { newDestination, originalDestination } from '../support.ts';

const current = { createApp, createLinks, createLinkRoutes };

export async function fixture(t: TestContext, previous?: typeof current) {
  const { repository, cache, disconnectCache } = createDoubles();

  async function start(version: typeof current) {
    const links = version.createLinks({ repository, cache });
    const app = version.createApp([version.createLinkRoutes(links)]);
    const listener = app.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    t.after(() => listener[Symbol.asyncDispose]());
    return `http://127.0.0.1:${(listener.address() as AddressInfo).port}`;
  }

  const origin = await start(current);
  const previousOrigin = previous && await start(previous);
  return { origin, previousOrigin, cache, database: repository, disconnectCache };
}

export async function redirect(origin: string, slug = 'docs') {
  const response = await fetch(`${origin}/r/${slug}`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return response.headers.get('location');
}

export function patch(origin: string, destination: string, slug = 'docs') {
  return fetch(`${origin}/r/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination }),
  });
}
