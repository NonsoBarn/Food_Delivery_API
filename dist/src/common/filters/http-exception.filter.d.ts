import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Logger as WinstonLogger } from 'winston';
declare module 'express' {
    interface Request {
        id?: string;
    }
}
export declare class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger;
    constructor(logger: WinstonLogger);
    catch(exception: unknown, host: ArgumentsHost): void;
}
