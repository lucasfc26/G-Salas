import { describe, expect, it } from 'vitest';
import { validationSchema } from './validation.js';

const baseEnv = {
  FRONTEND_URL: 'http://localhost:5173',
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
};

describe('validationSchema', () => {
  it('accepts a valid minimal environment and applies defaults', () => {
    const result = validationSchema.parse(baseEnv);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.MAX_FAILED_LOGIN_ATTEMPTS).toBe(5);
    expect(result.LOCKOUT_DURATION_MINUTES).toBe(15);
  });

  it('rejects a short JWT secret', () => {
    expect(() =>
      validationSchema.parse({ ...baseEnv, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = baseEnv;
    void DATABASE_URL;
    expect(() => validationSchema.parse(rest)).toThrow();
  });
});
