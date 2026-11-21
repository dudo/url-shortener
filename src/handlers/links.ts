import type { RequestHandler, RequestParamHandler } from 'express';
import type { LinkService } from '../services/links.ts';

export const validateSlug: RequestParamHandler = (_request, response, next, slug: string) => {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
    response.status(404).end();
    return;
  }
  next();
};

function readDestination(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('destination' in body) ||
    typeof body.destination !== 'string') return null;

  try {
    const url = new URL(body.destination);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function createLinkHandlers(links: LinkService) {
  const redirect: RequestHandler<{ slug: string }> = async (request, response) => {
    const destination = await links.resolve(request.params.slug);
    if (destination === null) {
      response.status(404).end();
      return;
    }
    response.set({ Location: destination, 'Cache-Control': 'no-store' }).status(302).end();
  };

  const retarget: RequestHandler<{ slug: string }, unknown, unknown> = async (request, response) => {
    const destination = readDestination(request.body);
    if (destination === null) {
      response.status(400).end();
      return;
    }
    const updated = await links.retarget(request.params.slug, destination);
    response.status(updated ? 204 : 404).end();
  };

  return { redirect, retarget };
}
