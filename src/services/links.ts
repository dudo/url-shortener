const cacheKey = (slug: string) => `redirect:v2:${slug}`;

interface LinkRepository {
  get(slug: string): Promise<string | null>;
  update(slug: string, destination: string): Promise<boolean>;
}

interface LinkCache {
  get(key: string): Promise<string | null>;
  set(key: string, destination: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function createLinks({ repository, cache }: { repository: LinkRepository; cache: LinkCache }) {
  return {
    async resolve(slug: string) {
      const key = cacheKey(slug);
      const cached = await cache.get(key);
      if (cached !== null) return cached;

      const destination = await repository.get(slug);
      if (destination !== null) await cache.set(key, destination);
      return destination;
    },

    async retarget(slug: string, destination: string) {
      if (!(await repository.update(slug, destination))) return false;
      await cache.delete(cacheKey(slug));
      return true;
    },
  };
}

export type LinkService = ReturnType<typeof createLinks>;
