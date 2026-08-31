import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * Read-through cache for low-volatility, read-heavy data (rooms, room
 * details, availability config, dashboard summaries — roadmap section 19).
 * Never cache credits/payments/reservations/contracts: those must always
 * read the current state.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`Falha ao ler cache "${key}": ${String(error)}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Falha ao gravar cache "${key}": ${String(error)}`);
    }
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.client.del(...keys);
    } catch (error) {
      this.logger.warn(`Falha ao invalidar cache: ${String(error)}`);
    }
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.redis.client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    } catch (error) {
      this.logger.warn(
        `Falha ao invalidar cache por prefixo "${prefix}": ${String(error)}`,
      );
    }
  }

  /** Fetches from cache, or computes + stores on a miss. */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await compute();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}
