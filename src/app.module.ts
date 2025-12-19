import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';

// Filters
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Config
import { loggerConfig } from './config/logger.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available everywhere
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Logging
    WinstonModule.forRoot(loggerConfig),

    // Database
    DatabaseModule,

    UsersModule,

    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, // Global exception filters
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request ID middleware to all routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
