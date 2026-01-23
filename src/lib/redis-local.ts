/**
 * Local Redis client using ioredis
 *
 * IMPORTANT: This module uses Node.js APIs and is NOT compatible with Edge runtime.
 * Only import this in server-side code (API routes, not middleware).
 */

import Redis from 'ioredis';

// Singleton instance for local Redis
let localRedisInstance: Redis | null = null;

/**
 * Create or return existing local Redis client
 * Only use this in Node.js runtime contexts (API routes, server components)
 */
export function createLocalRedisClient(): Redis {
  if (!localRedisInstance) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }
    localRedisInstance = new Redis(redisUrl);
  }
  return localRedisInstance;
}

/**
 * Adapter to make ioredis compatible with @upstash/ratelimit
 * Implements the minimal interface required by Ratelimit
 */
export class LocalRedisAdapter {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async eval<TArgs extends unknown[], TData = unknown>(
    script: string,
    keys: string[],
    args: TArgs
  ): Promise<TData> {
    const result = await this.client.eval(
      script,
      keys.length,
      ...keys,
      ...args.map((arg) => String(arg))
    );
    return result as TData;
  }

  async get<TData = string>(key: string): Promise<TData | null> {
    const result = await this.client.get(key);
    if (result === null) return null;
    try {
      return JSON.parse(result) as TData;
    } catch {
      return result as TData;
    }
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<void> {
    if (opts?.ex) {
      await this.client.setex(key, opts.ex, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  async multi(): Promise<LocalRedisMulti> {
    return new LocalRedisMulti(this.client.multi());
  }
}

class LocalRedisMulti {
  private multi: ReturnType<Redis['multi']>;

  constructor(multi: ReturnType<Redis['multi']>) {
    this.multi = multi;
  }

  async exec(): Promise<unknown[]> {
    const results = await this.multi.exec();
    return results?.map(([, result]) => result) ?? [];
  }
}

/**
 * Close the local Redis connection
 * Call this during graceful shutdown
 */
export async function closeLocalRedis(): Promise<void> {
  if (localRedisInstance) {
    await localRedisInstance.quit();
    localRedisInstance = null;
  }
}
