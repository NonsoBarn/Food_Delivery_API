import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Logger as WinstonLogger } from 'winston';
declare module 'express' {
    interface Request {
        id?: string;
    }
}
export declare class TypeOrmExceptionFilter implements ExceptionFilter {
    private readonly logger;
    constructor(logger: WinstonLogger);
    catch(exception: QueryFailedError, host: ArgumentsHost): void;
    private extractUniqueViolationMessage;
}
