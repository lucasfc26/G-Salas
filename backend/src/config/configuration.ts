import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  frontendUrl: string;
  corsOrigins: string[];
  throttle: {
    ttl: number;
    limit: number;
    loginTtl: number;
    loginLimit: number;
    passwordResetTtl: number;
    passwordResetLimit: number;
  };
}

export default registerAs('app', (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    loginTtl: parseInt(process.env.THROTTLE_LOGIN_TTL ?? '60', 10),
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT ?? '5', 10),
    passwordResetTtl: parseInt(
      process.env.PASSWORD_RESET_THROTTLE_TTL ?? '3600',
      10,
    ),
    passwordResetLimit: parseInt(
      process.env.PASSWORD_RESET_THROTTLE_LIMIT ?? '3',
      10,
    ),
  },
}));
