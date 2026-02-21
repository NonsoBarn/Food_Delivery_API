import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';

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
import { CategoriesModule } from './products/categories.module';
import { StorageModule } from './storage/storage.module';
import { ProductsModule } from './products/products.module';
import { RedisModule } from './redis/redis.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { DeliveryModule } from './delivery/delivery.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommunicationModule } from './communication/communication.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available everywhere
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    /**
     * BullModule — global job queue backed by Redis.
     *
     * KEY LEARNING: BullModule.forRootAsync() vs forRoot()
     * ======================================================
     * forRoot() accepts a plain config object — works if Redis settings are hard-coded.
     * forRootAsync() accepts a factory function that can inject ConfigService,
     * so we can read REDIS_HOST / REDIS_PORT from the env file at startup.
     *
     * forRoot() registers the Redis connection GLOBALLY for ALL queues.
     * Each sub-module (MailModule, SmsModule) calls BullModule.registerQueue({ name: '...' })
     * to get a named channel — they all share this one Redis connection.
     *
     * We reuse the same Redis instance as the cart (no extra Redis needed).
     */
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
        },
      }),
    }),

    /**
     * EventEmitterModule — global in-process pub/sub bus.
     *
     * KEY LEARNING: forRoot() options
     * =================================
     * wildcard: false — disable wildcard listeners ('order.*') for simplicity.
     *   Enable later if you want a listener to catch ALL order events at once.
     * delimiter: '.' — events named 'order.created', 'delivery.assigned', etc.
     *   The dot is just a naming convention separator; no special routing.
     * global: true — the EventEmitter2 token is available in every module
     *   without needing to import EventEmitterModule explicitly.
     *
     * After this, any service can do:
     *   constructor(private readonly eventEmitter: EventEmitter2) {}
     *   this.eventEmitter.emit('order.created', payload);
     */
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      global: true,
    }),

    // Logging
    WinstonModule.forRoot(loggerConfig),

    // Database
    DatabaseModule,
    RedisModule,

    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    DeliveryModule,
    NotificationsModule,
    CommunicationModule,

    // Storage
    StorageModule,
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
