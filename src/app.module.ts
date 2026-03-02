import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

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
import { ScheduledJobsModule } from './scheduled-jobs/scheduled-jobs.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { VendorsModule } from './vendors/vendors.module';

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

    /**
     * ScheduleModule — global cron/interval scheduler.
     *
     * KEY LEARNING: ScheduleModule.forRoot()
     * ========================================
     * This registers the scheduler ENGINE once for the whole app.
     * It must be called in the ROOT module (AppModule), not in feature modules.
     *
     * Under the hood, it starts a cron runner (using the `cron` npm package)
     * that scans all providers for @Cron() / @Interval() / @Timeout() decorators
     * and registers them.
     *
     * forRoot() is called WITHOUT arguments — the scheduler has no
     * meaningful configuration (unlike BullModule which needs Redis).
     *
     * KEY LEARNING: ScheduleModule vs BullMQ for recurring tasks
     * ============================================================
     * ScheduleModule (@Cron):
     *   ✓ Simple, built into NestJS
     *   ✓ Great for lightweight tasks (reports, cleanup)
     *   ✗ Runs in-process — if the app crashes, the next run is missed
     *   ✗ Doesn't scale horizontally (every replica runs the same cron)
     *   ✗ No job history or retry on failure
     *
     * BullMQ (repeating jobs):
     *   ✓ Jobs survive app restarts (stored in Redis)
     *   ✓ One replica picks up the job (no duplication in multi-replica)
     *   ✓ Retry on failure, job history, dead-letter queue
     *   ✗ More setup required
     *   ✗ Requires Redis
     *
     * For this learning project, @nestjs/schedule is the right choice:
     * simpler to understand, teaches cron expressions directly, and
     * sufficient for a single-instance deployment.
     *
     * In production at scale → migrate to BullMQ repeating jobs.
     */
    ScheduleModule.forRoot(),

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

    /**
     * ScheduledJobsModule — all cron-based background tasks.
     *
     * KEY LEARNING: Placement in AppModule
     * ======================================
     * This module must be imported AFTER ScheduleModule.forRoot() above.
     * The scheduler needs to be initialized before it can discover @Cron
     * decorators in ScheduledJobsModule's providers.
     *
     * In practice, NestJS resolves the import order correctly — but
     * placing ScheduledJobsModule after ScheduleModule.forRoot() makes
     * the dependency relationship explicit in the code.
     */
    ScheduledJobsModule,

    /**
     * ReviewsModule — Phase 11: Product reviews and vendor ratings.
     *
     * Provides:
     *   POST /reviews/products/:id  — customer submits a product review
     *   GET  /reviews/products/:id  — public: get reviews for a product
     *   POST /reviews/vendors/:id   — customer rates a vendor
     *   GET  /reviews/vendors/:id   — public: get reviews for a vendor
     */
    ReviewsModule,

    /**
     * AdminModule — Phase 12.1: Admin dashboard.
     *
     * All routes are ADMIN-only (JwtAuthGuard + RolesGuard enforced at controller level).
     * Provides:
     *   GET    /admin/stats                — Platform-wide statistics
     *   GET    /admin/vendors              — Paginated vendor list (with status filter)
     *   GET    /admin/vendors/:id          — Single vendor detail + aggregate stats
     *   PATCH  /admin/vendors/:id/status   — Approve / reject / suspend a vendor
     *   GET    /admin/users                — Paginated user list (with role filter)
     *   GET    /admin/reports              — On-demand revenue report (DATE_TRUNC grouping)
     *   GET    /admin/categories           — All categories (including inactive)
     *   POST   /admin/categories           — Create a category
     *   PATCH  /admin/categories/:id       — Update a category
     *   DELETE /admin/categories/:id       — Soft-delete a category
     *
     * KEY LEARNING: AdminModule imports CategoriesModule to reuse CategoriesService
     * (slug generation, 2-level depth validation, circular reference prevention).
     * The admin routes delegate category business logic to CategoriesService rather
     * than reimplementing it — DRY principle in practice.
     */
    AdminModule,

    /**
     * VendorsModule — Phase 12.2: Vendor analytics dashboard.
     *
     * All routes are VENDOR-only (scoped to the authenticated vendor's own data).
     * Provides:
     *   GET /vendors/dashboard              — Sales overview, pending orders, revenue
     *   GET /vendors/products/performance   — Products ranked by revenue
     *   GET /vendors/revenue                — Revenue trend by period (DATE_TRUNC)
     *
     * KEY LEARNING: Data scoping — every query is filtered by the authenticated
     * vendor's profile ID. Vendors can only ever see their own business data.
     */
    VendorsModule,

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
