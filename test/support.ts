import { createLinks } from '../src/services/links.ts';

export const originalDestination = 'https://old.example/docs';
export const newDestination = 'https://new.example/docs';

export function stubCache(available = true) {
  const cached = new Map<string, string>();
  return {
    cached,
    disconnectCache() { available = false; },
    cache: {
      async get(key: string) {
        return available ? cached.get(key) ?? null : null;
      },
      async set(key: string, value: string) {
        if (available) cached.set(key, value);
      },
      async delete(key: string) {
        if (available) cached.delete(key);
      },
    },
  };
}

export function createDoubles(cacheAvailable = true) {
  const records = new Map([['docs', originalDestination]]);
  const repository = {
    get: async (slug: string) => records.get(slug) ?? null,
    async update(slug: string, destination: string) {
      if (!records.has(slug)) return false;
      records.set(slug, destination);
      return true;
    },
  };
  return { repository, records, ...stubCache(cacheAvailable) };
}

export function fixture({ cacheAvailable = true } = {}) {
  const { repository, cache, records, cached } = createDoubles(cacheAvailable);
  return { links: createLinks({ repository, cache }), records, cached };
}
