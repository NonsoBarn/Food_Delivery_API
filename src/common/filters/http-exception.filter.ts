/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).id || 'unknown';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errorObject: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      requestId,
    };

    if (typeof errorResponse === 'object' && errorResponse !== null) {
      errorObject.error = (errorResponse as any).error || 'Error';

      if (Array.isArray((errorResponse as any).message)) {
        errorObject.message = (errorResponse as any).message;
      }
    }

    // ✅ Structured Winston logging
    if (status >= 500 && exception instanceof Error) {
      this.logger.error({
        level: 'error',
        message: `[${requestId}] ${request.method} ${request.url}`,
        stack: exception.stack,
        statusCode: status,
        requestId,
        method: request.method,
        path: request.url,
      });
    } else {
      this.logger.warn({
        level: 'warn',
        message: `[${requestId}] ${request.method} ${request.url} - ${message}`,
        statusCode: status,
        requestId,
        method: request.method,
        path: request.url,
      });
    }

    response.status(status).json(errorObject);
  }
}
