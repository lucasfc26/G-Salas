import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { RequestWithId } from '../middleware/request-id.middleware.js';

interface AuthenticatedRequest extends RequestWithId {
  user?: { id: string };
}

// Roadmap section 54 target for simple operations — logged distinctly so
// slow requests are easy to grep for without a full metrics stack.
const SLOW_REQUEST_THRESHOLD_MS = 200;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<AuthenticatedRequest>();
    const response = httpContext.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, response, start),
        error: () => this.log(request, response, start),
      }),
    );
  }

  private log(
    request: AuthenticatedRequest,
    response: Response,
    start: number,
  ) {
    const duration = Date.now() - start;
    const entry = {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      userId: request.user?.id,
    };

    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      this.logger.warn(JSON.stringify({ ...entry, slow: true }));
    } else {
      this.logger.log(JSON.stringify(entry));
    }
  }
}
