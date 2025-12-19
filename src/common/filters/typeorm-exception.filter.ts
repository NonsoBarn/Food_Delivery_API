import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

// Define PostgreSQL error interface
interface PostgreSqlError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

// Extend Express Request type for request.id
declare module 'express' {
  interface Request {
    id?: string;
  }
}

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.id || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';

    const pgError = exception as unknown as PostgreSqlError;

    // Handle specific PostgreSQL error codes
    switch (pgError.code) {
      case '23505': // unique_violation
        status = HttpStatus.CONFLICT;
        message = this.extractUniqueViolationMessage(pgError);
        break;

      case '23503': // foreign_key_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced record does not exist';
        break;

      case '23502': // not_null_violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
        break;

      default:
        // Handle other error codes or fall through
        break;
    }

    // Structured Winston logging
    this.logger.error({
      level: 'error',
      message: `[${requestId}] DB error on ${request.method} ${request.url}`,
      stack: exception.stack,
      statusCode: status,
      requestId,
      pgCode: pgError.code,
      constraint: pgError.constraint,
      table: pgError.table,
      detail: pgError.detail,
    });

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId,
    });
  }

  private extractUniqueViolationMessage(error: PostgreSqlError): string {
    const detail = error.detail || '';

    // Extract column name from PostgreSQL error detail
    const match = detail.match(/Key \((\w+)\)/);

    if (match && match[1]) {
      const column = match[1];
      return `${column} already exists`;
    }

    // Check constraint name for more context
    if (error.constraint) {
      return `Constraint violation: ${error.constraint}`;
    }

    return 'Duplicate entry found';
  }
}
