import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  accessSecret: string;
  accessExpiresIn: string;
  accessExpiresInMs: number;
  refreshExpiresIn: string;
  refreshExpiresInMs: number;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordResetExpiresInMinutes: number;
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) {
    throw new Error(
      `Formato de duração inválido: "${duration}". Use algo como "15m" ou "7d".`,
    );
  }
  const value = parseInt(match[1], 10);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * unitMs[match[2]];
}

export default registerAs('auth', (): AuthConfig => {
  const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  return {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn,
    accessExpiresInMs: parseDurationToMs(accessExpiresIn),
    refreshExpiresIn,
    refreshExpiresInMs: parseDurationToMs(refreshExpiresIn),
    maxFailedLoginAttempts: parseInt(
      process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? '5',
      10,
    ),
    lockoutDurationMinutes: parseInt(
      process.env.LOCKOUT_DURATION_MINUTES ?? '15',
      10,
    ),
    passwordResetExpiresInMinutes: parseInt(
      process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ?? '60',
      10,
    ),
  };
});
