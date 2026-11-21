# URL shortener

A small TypeScript HTTP service that resolves short links. `GET /r/:slug` returns a `302` with a `Location` and `Cache-Control: no-store`. Unknown slugs return `404`.

## Layers

| Layer | Responsibility |
| --- | --- |
| [Express app](src/app.ts) | Register middleware and mount the router. |
| [Routes](src/routes/links.ts) and [handlers](src/handlers/links.ts) | Map requests to application operations and HTTP responses. |
| [Application service](src/services/links.ts) | Look up a cached destination, fall back to the source of truth, and fill the cache. |
| [Postgres pool](src/adapters/postgres-pool.ts) | Provide shared database connections. |
| [Link repository](src/repositories/links.ts) | Own the SQL for reading and writing short links. |
| [Valkey adapter](src/adapters/valkey-cache.ts) | Store cached destinations for 60 seconds. Cache command failures are handled as misses or skipped fills. |

[`src/index.ts`](src/index.ts) reads runtime configuration, connects the adapters, and calls `app.listen()`.

## Run locally

Docker Compose runs the shortener, Postgres, and Valkey. The app and npm service read their container settings from `.env`. Seed a link, then start the app.

```sh
cp .env.example .env
docker compose run --build --rm app run seed -- docs https://example.com/docs
docker compose up -d --wait
curl -i http://127.0.0.1:3100/r/docs
```

The seed command preserves any existing entry for the slug. Postgres loads [the schema](db/schema.sql) when Compose initializes its data volume. Apply future schema changes to existing volumes with a migration. Run `docker compose restart app` after editing the app, and `docker compose down` when finished.

To run the app on the host with Node.js 24.12 or later, copy the example as above and use the published dependency ports.

```sh
docker compose up -d --wait postgres valkey
npm ci
export DATABASE_URL=postgresql://shortener:shortener@127.0.0.1:5433/shortener
export VALKEY_URL=redis://127.0.0.1:6380
export HOST=127.0.0.1
npm run seed -- docs https://example.com/docs
npm start
```

## Tests

The `npm` service runs commands against your checkout with a separate `node_modules` volume.

```sh
docker compose run --rm npm run typecheck
docker compose run --rm npm test
```

Run `docker compose run --rm npm ci` to refresh the volume after changing dependencies. On the host you can run `npm run typecheck` and `npm test` directly.

[GitHub Actions](https://github.com/dudo/url-shortener/actions) runs the type check and application tests. The tests use in-memory doubles for the repository and cache, and can run without a local `.env`.

### Postgres integration

After copying `.env.example` to `.env`, start Postgres and run the integration check through the npm service.

```sh
docker compose up -d --wait postgres
docker compose run --rm npm run test:integration
```

Each test creates an isolated Postgres schema and uses the in-memory cache double. The suite runs as its own GitHub Actions job.
