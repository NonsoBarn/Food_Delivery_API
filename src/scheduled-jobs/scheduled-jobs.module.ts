/**
 * ScheduledJobsModule
 *
 * Groups all cron-scheduled background tasks in one place.
 *
 * KEY LEARNING: Why a dedicated module for scheduled jobs?
 * =========================================================
 * We could put CartCleanupJob inside CartModule, ReportsJob in OrdersModule, etc.
 * But keeping all scheduled jobs in ONE module has advantages:
 *
 * 1. Discoverability: "What scheduled tasks does this app have?"
 *    → Check ScheduledJobsModule. All jobs listed in one place.
 *
 * 2. Separation of concerns: Scheduled jobs are infrastructure code,
 *    not business feature code. They cross domain boundaries (cart + orders + users).
 *    A cross-cutting module is appropriate.
 *
 * 3. Easy to disable: Comment out ScheduledJobsModule in AppModule
 *    to disable ALL scheduled jobs in a dev/test environment.
 *
 * KEY LEARNING: ScheduleModule.forRoot() must be in AppModule, NOT here
 * ======================================================================
 * ScheduleModule.forRoot() initializes the cron scheduler globally.
 * It only needs to be called ONCE per application.
 *
 * If we called it here AND in AppModule, we'd get duplicate schedulers.
 * The pattern: AppModule registers the scheduler; feature modules just
 * declare @Cron methods in their providers — NestJS wires them up.
 *
 * KEY LEARNING: Dependencies for this module
 * ===========================================
 * Each job class injects what it needs:
 *
 * CartCleanupJob:
 *   - 'REDIS_CLIENT' (via @Global() RedisModule — no import needed)
 *
 * ReportsJob:
 *   - Order repository → TypeOrmModule.forFeature([Order])
 *   - User repository → TypeOrmModule.forFeature([User])
 *
 * ReminderEmailsJob:
 *   - 'REDIS_CLIENT' (global)
 *   - User repository → TypeOrmModule.forFeature([User])
 *   - Order repository → TypeOrmModule.forFeature([Order])
 *   - CustomerProfile repository → TypeOrmModule.forFeature([CustomerProfile])
 *   - MailService → MailModule (exported from CommunicationModule)
 *
 * We import MailModule directly rather than CommunicationModule to avoid
 * pulling in SmsModule and CommunicationEventsListener (unneeded here).
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartCleanupJob } from './jobs/cart-cleanup.job';
import { ReportsJob } from './jobs/reports.job';
import { ReminderEmailsJob } from './jobs/reminder-emails.job';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { MailModule } from '../communication/mail/mail.module';

@Module({
  imports: [
    /**
     * TypeOrmModule.forFeature() — register the entity repos this module needs.
     *
     * KEY LEARNING: Multiple modules can access the same entity
     * ===========================================================
     * Order is also registered in OrdersModule.
     * User is registered in UsersModule.
     * CustomerProfile is registered in UsersModule AND CommunicationModule.
     *
     * TypeORM doesn't have "exclusive access" to entities.
     * TypeOrmModule.forFeature() creates a scoped repository instance
     * that is available only within this module's providers.
     *
     * No circular dependencies — this module doesn't import OrdersModule
     * or UsersModule, it directly registers the entities it needs.
     */
    TypeOrmModule.forFeature([Order, User, CustomerProfile]),

    /**
     * MailModule exports MailService.
     * ReminderEmailsJob injects MailService to queue abandoned cart emails.
     *
     * KEY LEARNING: Importing feature modules for their exported services
     * ====================================================================
     * MailModule.providers = [MailService, MailProcessor, ...]
     * MailModule.exports   = [MailService, ...]
     *
     * By importing MailModule here, ScheduledJobsModule gets access to
     * MailService via NestJS DI. Without this import, NestJS would throw
     * "Nest can't resolve dependencies of ReminderEmailsJob" at startup.
     */
    MailModule,
  ],
  providers: [
    /**
     * Each job class is a provider.
     *
     * KEY LEARNING: How @Cron() works with NestJS DI
     * =================================================
     * When NestJS starts up, it scans all providers for @Cron() decorators.
     * The SchedulerRegistry (from ScheduleModule.forRoot()) registers each
     * decorated method as a cron job with the cron library.
     *
     * The key insight: by registering these classes as providers in a module
     * that NestJS manages, the framework automatically discovers and schedules
     * the @Cron-decorated methods. You don't need to call anything manually.
     *
     * Behind the scenes:
     * 1. NestJS instantiates CartCleanupJob (injecting Redis client)
     * 2. ScheduleModule scans the instance for @Cron decorators
     * 3. Registers reportCartStats() to fire at '0 2 * * *'
     * 4. Done — the scheduler runs it automatically
     */
    CartCleanupJob,
    ReportsJob,
    ReminderEmailsJob,
  ],
  // Export jobs so AppController can inject them for dev testing (Method B)
  exports: [CartCleanupJob, ReportsJob, ReminderEmailsJob],
})
export class ScheduledJobsModule {}
