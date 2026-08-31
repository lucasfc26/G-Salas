import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { AppConfig } from '../../config/configuration.js';
import { ErrorCode } from '../constants/error-codes.constants.js';
import { DomainException } from '../exceptions/domain.exception.js';
import { RateLimiterService } from './rate-limiter.service.js';
import {
  THROTTLE_KEY,
  type ExplicitThrottleOptions,
  type ThrottleOptions,
} from './throttle.decorator.js';

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const declared = this.reflector.getAllAndOverride<
      ThrottleOptions | undefined
    >(THROTTLE_KEY, [context.getHandler(), context.getClass()]);
    const options = this.resolveOptions(declared);

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const routeKey = `${context.getClass().name}:${context.getHandler().name}`;
    const key = `${request.ip}:${routeKey}`;

    const result = await this.rateLimiter.consume(
      key,
      options.limit,
      options.ttlSeconds,
    );

    response.setHeader('X-RateLimit-Limit', options.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(result.remaining, 0));

    if (!result.allowed) {
      response.setHeader('Retry-After', result.resetInSeconds);
      throw new DomainException(
        ErrorCode.TOO_MANY_REQUESTS,
        'Muitas requisições. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private resolveOptions(
    declared: ThrottleOptions | undefined,
  ): ExplicitThrottleOptions {
    const { throttle } = this.configService.getOrThrow<AppConfig>('app');

    if (!declared) {
      return { limit: throttle.limit, ttlSeconds: throttle.ttl };
    }
    if ('limit' in declared) {
      return declared;
    }
    switch (declared.profile) {
      case 'login':
        return { limit: throttle.loginLimit, ttlSeconds: throttle.loginTtl };
      case 'passwordReset':
        return {
          limit: throttle.passwordResetLimit,
          ttlSeconds: throttle.passwordResetTtl,
        };
    }
  }
}
