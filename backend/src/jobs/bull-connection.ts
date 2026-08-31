import type { BullRootModuleOptions } from '@nestjs/bullmq';
import type { ConfigService } from '@nestjs/config';
import type { RedisConfig } from '../config/redis.config.js';

/** Shared BullMQ connection factory — used by both the API process
 * (producer: enqueues jobs) and the worker process (consumer: processes
 * them). Kept as a plain function so it stays identical in both, rather
 * than importing one module's config into the other. */
export function bullConnectionFactory(
  configService: ConfigService,
): BullRootModuleOptions {
  const { host, port, password } =
    configService.getOrThrow<RedisConfig>('redis');
  return { connection: { host, port, password } };
}
