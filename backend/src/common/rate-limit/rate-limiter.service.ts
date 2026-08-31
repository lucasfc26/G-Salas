import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

// Atomic fixed-window counter: INCR then EXPIRE-once-on-first-hit, so a
// concurrent burst can never race past the limit (both operations run as a
// single Redis command via this script — see roadmap Fase 13/18).
const FIXED_WINDOW_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if tonumber(current) == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

/**
 * Redis-backed fixed-window rate limiter — correct across multiple app
 * instances, unlike an in-memory counter (roadmap Fase 13: Redis + Jobs).
 */
@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  async consume(
    key: string,
    limit: number,
    ttlSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const current = Number(
      await this.redis.client.eval(
        FIXED_WINDOW_SCRIPT,
        1,
        redisKey,
        ttlSeconds,
      ),
    );
    const ttl = await this.redis.client.ttl(redisKey);
    const resetInSeconds = ttl > 0 ? ttl : ttlSeconds;

    if (current > limit) {
      return { allowed: false, remaining: 0, resetInSeconds };
    }
    return {
      allowed: true,
      remaining: Math.max(limit - current, 0),
      resetInSeconds,
    };
  }
}
