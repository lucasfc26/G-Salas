import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';
import { RolesGuard } from './roles.guard.js';

function buildContext(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => vi.fn(),
    getClass: () => vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when the route has no @Roles metadata', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('denies the request when there is no authenticated user', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext())).toBe(false);
  });

  it('denies the request when the user role is not in the allowed list', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = buildContext({
      id: '1',
      email: 'client@test.dev',
      role: 'CLIENT',
    });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows the request when the user role matches', () => {
    const reflector = {
      getAllAndOverride: () => ['ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = buildContext({
      id: '1',
      email: 'admin@test.dev',
      role: 'ADMIN',
    });
    expect(guard.canActivate(context)).toBe(true);
  });
});
