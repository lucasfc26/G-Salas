import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ExplicitThrottleOptions {
  limit: number;
  ttlSeconds: number;
}

/** Named profiles resolve their limit/ttl from AppConfig.throttle at
 * request time (roadmap section 28 — "valores configuráveis via
 * environment"), instead of being frozen into the decorator at import
 * time. */
export type ThrottleProfile = 'login' | 'passwordReset';

export type ThrottleOptions =
  ExplicitThrottleOptions | { profile: ThrottleProfile };

export const Throttle = (options: ThrottleOptions) =>
  SetMetadata(THROTTLE_KEY, options);
