/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// @Injectable()
// export class LoggingInterceptor implements NestInterceptor {
//   private readonly logger = new Logger(LoggingInterceptor.name);

//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const request = context.switchToHttp().getRequest();
//     const { method, url, body } = request;
//     const userAgent = request.get('user-agent') || '';
//     const ip = request.ip;

//     const now = Date.now();

//     this.logger.log(`Incoming Request: ${method} ${url} - ${userAgent} ${ip}`);

//     return next.handle().pipe(
//       tap({
//         next: (data) => {
//           const response = context.switchToHttp().getResponse();
//           const { statusCode } = response;
//           const responseTime = Date.now() - now;

//           this.logger.log(
//             `Outgoing Response: ${method} ${url} ${statusCode} - ${responseTime}ms`,
//           );
//         },
//         error: (error) => {
//           const responseTime = Date.now() - now;
//           this.logger.error(
//             `Request Failed: ${method} ${url} - ${responseTime}ms`,
//             error.stack,
//           );
//         },
//       }),
//     );
//   }
// }

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const start = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url} - ${userAgent} ${ip}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;

        this.logger.log(
          `Outgoing Response: ${method} ${url} ${response.statusCode} - ${duration}ms`,
        );
      }),
    );
  }
}
