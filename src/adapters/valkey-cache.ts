import { createClient } from '@redis/client';

const cacheUrl = process.env.VALKEY_URL ?? 'redis://127.0.0.1:6380';
const cacheTimeoutMs = 500;

export async function connectCache(prefix = '') {
  let connectedOnce = false;
  const client = createClient({
    url: cacheUrl,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: cacheTimeoutMs,
      reconnectStrategy: () => connectedOnce ? cacheTimeoutMs : false,
    },
  });

  // Commands handle their own errors. Also consume connection and reconnect events.
  client.on('error', () => {});
  try {
    await client.connect();
    connectedOnce = true;
  } catch (error) {
    throw new Error('Could not connect to Valkey. Start the local cache or check VALKEY_URL.', {
      cause: error,
    });
  }

  async function bestEffort<T>(command: () => Promise<T>): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<null>(resolve => {
        timer = setTimeout(resolve, cacheTimeoutMs, null);
      });
      // A command can still execute on the server after the caller stops waiting.
      return await Promise.race([command(), deadline]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: (key: string) => bestEffort(() => client.get(prefix + key)),
    async set(key: string, value: string) {
      await bestEffort(() => client.set(prefix + key, value, {
        expiration: { type: 'EX', value: 60 },
      }));
    },
    async delete(key: string) {
      await bestEffort(() => client.del(prefix + key));
    },
    close: () => {
      if (client.isOpen) client.destroy();
    },
  };
}
