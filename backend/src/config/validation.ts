import { z } from 'zod';

export const validationSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'staging', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    API_PREFIX: z.string().default('api'),
    API_VERSION: z.string().default('v1'),
    FRONTEND_URL: z.url(),
    CORS_ORIGINS: z.string(),

    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(10),
    DATABASE_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().default(30000),
    DATABASE_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().default(5000),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().int().min(0).max(65535).default(6379),
    REDIS_PASSWORD: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    MAX_FAILED_LOGIN_ATTEMPTS: z.coerce.number().int().min(1).default(5),
    LOCKOUT_DURATION_MINUTES: z.coerce.number().int().min(1).default(15),
    PASSWORD_RESET_EXPIRES_IN_MINUTES: z.coerce
      .number()
      .int()
      .min(5)
      .default(60),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_ENDPOINT: z.string().optional(),
    STORAGE_REGION: z.string().default('us-east-1'),
    STORAGE_BUCKET: z.string().default('room-rental'),
    STORAGE_ACCESS_KEY: z.string().optional(),
    STORAGE_SECRET_KEY: z.string().optional(),
    STORAGE_PUBLIC_URL: z.string().optional(),
    STORAGE_LOCAL_PATH: z.string().default('./storage'),

    THROTTLE_TTL: z.coerce.number().default(60),
    THROTTLE_LIMIT: z.coerce.number().default(100),
    THROTTLE_LOGIN_TTL: z.coerce.number().default(60),
    THROTTLE_LOGIN_LIMIT: z.coerce.number().default(5),
    PASSWORD_RESET_THROTTLE_TTL: z.coerce.number().default(3600),
    PASSWORD_RESET_THROTTLE_LIMIT: z.coerce.number().default(3),
  })
  .loose();
