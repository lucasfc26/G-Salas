import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  poolMax: number;
  poolIdleTimeoutMs: number;
  poolConnectionTimeoutMs: number;
}

export default registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL ?? '',
  // Connection pooling (roadmap section 40) — sized for a single app
  // instance talking to one Postgres. Bump alongside instance count.
  poolMax: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
  poolIdleTimeoutMs: parseInt(
    process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? '30000',
    10,
  ),
  poolConnectionTimeoutMs: parseInt(
    process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? '5000',
    10,
  ),
}));
