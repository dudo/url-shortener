import cors from 'cors';
import { json, Router, type RequestHandler } from 'express';
import type { LinkService } from '../services/links.ts';
import { createLinkHandlers, validateSlug } from '../handlers/links.ts';

const linkMethods = ['GET', 'PATCH'];

export function createLinkRoutes(links: LinkService) {
  const router = Router({ caseSensitive: true, strict: true });
  const { redirect, retarget } = createLinkHandlers(links);
  const methodNotAllowed: RequestHandler = (_request, response) => {
    response.set('Allow', linkMethods.join(', ')).status(405).end();
  };

  router.use('/r', cors({ methods: linkMethods }));
  router.param('slug', validateSlug);
  router.route('/r/:slug')
    .head(methodNotAllowed)
    .get(redirect)
    .patch(json({ limit: '4kb' }), retarget)
    .all(methodNotAllowed);

  return router;
}
