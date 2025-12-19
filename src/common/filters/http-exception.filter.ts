/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

// Extend Express Request type for request.id
declare module 'express' {
  interface Request {
    id?: string;
  }
}

// Type for HttpException response
interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.id || 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorResponse: HttpExceptionResponse | null =
      exception instanceof HttpException
        ? (exception.getResponse() as HttpExceptionResponse)
        : null;

    // Build error response object
    const errorObject: Record<string, any> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      requestId,
    };

    // Add additional error details if available
    if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      errorResponse !== null
    ) {
      if (errorResponse.error) {
        errorObject.error = errorResponse.error;
      }

      if (Array.isArray(errorResponse.message)) {
        errorObject.message = errorResponse.message;
      } else if (errorResponse.message && errorResponse.message !== message) {
        errorObject.message = errorResponse.message;
      }
    }

    // Structured Winston logging based on error severity
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Server errors (500+)
      if (exception instanceof Error) {
        this.logger.error({
          level: 'error',
          message: `[${requestId}] ${request.method} ${request.url}`,
          stack: exception.stack,
          statusCode: status,
          requestId,
          method: request.method,
          path: request.url,
          error: exception.message,
        });
      } else {
        this.logger.error({
          level: 'error',
          message: `[${requestId}] ${request.method} ${request.url}`,
          statusCode: status,
          requestId,
          method: request.method,
          path: request.url,
          error: String(exception),
        });
      }
    } else {
      // Client errors (400-499)
      this.logger.warn({
        level: 'warn',
        message: `[${requestId}] ${request.method} ${request.url} - ${message}`,
        statusCode: status,
        requestId,
        method: request.method,
        path: request.url,
        error: message,
      });
    }

    response.status(status).json(errorObject);
  }
}
