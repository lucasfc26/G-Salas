import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCode } from '../constants/error-codes.constants.js';
import type { RequestWithId } from '../middleware/request-id.middleware.js';
import { DomainException } from '../exceptions/domain.exception.js';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const { status, body } = this.resolve(exception);
    body.requestId = request?.requestId;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request?.requestId}] ${request?.method} ${request?.originalUrl ?? request?.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request?.requestId}] ${request?.method} ${request?.originalUrl ?? request?.url} -> ${body.error.code}`,
      );
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: HttpStatus; body: ErrorBody } {
    if (exception instanceof DomainException) {
      const status: HttpStatus = exception.getStatus();
      const payload = exception.getResponse() as {
        code: string;
        message: string;
      };
      return {
        status,
        body: {
          success: false,
          error: { code: payload.code, message: payload.message },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status: HttpStatus = exception.getStatus();
      const payload = exception.getResponse();
      return { status, body: this.fromHttpExceptionPayload(status, payload) };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
        },
      },
    };
  }

  private fromHttpExceptionPayload(
    status: HttpStatus,
    payload: unknown,
  ): ErrorBody {
    if (typeof payload === 'object' && payload !== null) {
      const obj = payload as { message?: string | string[]; error?: string };
      const messages = Array.isArray(obj.message) ? obj.message : undefined;
      const message = messages
        ? 'Um ou mais campos são inválidos.'
        : ((obj.message as string) ?? this.defaultMessageForStatus(status));
      const code = messages
        ? ErrorCode.VALIDATION_ERROR
        : this.codeForStatus(status, obj.error);
      return {
        success: false,
        error: { code, message, ...(messages ? { details: messages } : {}) },
      };
    }
    return {
      success: false,
      error: {
        code: this.codeForStatus(status),
        message:
          typeof payload === 'string'
            ? payload
            : this.defaultMessageForStatus(status),
      },
    };
  }

  private codeForStatus(status: HttpStatus, fallback?: string): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      default:
        return fallback ?? ErrorCode.VALIDATION_ERROR;
    }
  }

  private defaultMessageForStatus(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'Credenciais inválidas ou sessão expirada.';
      case HttpStatus.FORBIDDEN:
        return 'Você não tem permissão para realizar esta ação.';
      case HttpStatus.NOT_FOUND:
        return 'Recurso não encontrado.';
      case HttpStatus.CONFLICT:
        return 'Conflito ao processar a solicitação.';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Muitas requisições. Tente novamente mais tarde.';
      default:
        return 'Não foi possível processar a solicitação.';
    }
  }
}
