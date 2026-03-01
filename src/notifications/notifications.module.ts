/**
 * NotificationsModule
 *
 * Extended in Phase 10.3 to include persistent in-app notifications.
 *
 * Phase 9 responsibilities (unchanged):
 * - WebSocket gateway (NotificationsGateway)
 * - Real-time broadcast listeners (OrderEventsListener, DeliveryEventsListener)
 *
 * Phase 10.3 additions:
 * - Notification entity (DB table for persisting notifications)
 * - NotificationService (CRUD + real-time push on create)
 * - NotificationsController (REST endpoints for the inbox)
 * - Profile repositories (needed by listeners to resolve userId from profileId)
 *
 * KEY LEARNING: Module Boundary Design
 * ======================================
 * This module only knows about:
 * - JWT (for socket authentication in handleConnection)
 * - Users (to load the full user on connection)
 * - Delivery (for RiderLocationService and findActiveDeliveryForRider)
 *
 * It does NOT import OrdersModule or CommunicationModule.
 * The event bus (@nestjs/event-emitter) is global — OrdersService
 * and DeliveryService emit events WITHOUT importing this module.
 * The listeners receive them WITHOUT the services knowing they exist.
 *
 * KEY LEARNING: TypeOrmModule.forFeature() in a feature module
 * ==============================================================
 * Each module that needs database access calls TypeOrmModule.forFeature()
 * to register the entities it owns OR needs to query.
 *
 * The Notification entity is OWNED by this module — only this module
 * creates, reads, and updates notification records.
 *
 * CustomerProfile, VendorProfile, RiderProfile are NOT owned here — they
 * belong to UsersModule. But our listeners need to look up the User.id
 * from a profile ID (e.g. "which user owns CustomerProfile abc-123?").
 *
 * KEY LEARNING: Can you register the same entity in multiple modules?
 * ====================================================================
 * YES! TypeOrmModule.forFeature() just provides a repository.
 * The underlying DB table is created once (by whoever first defines the entity).
 * Multiple modules can have READ access to the same table via their own
 * repository instance — TypeORM has no "exclusive ownership" restriction.
 *
 * This is the same pattern used in CommunicationModule, which also
 * registers CustomerProfile and VendorProfile for listener lookups.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { OrderEventsListener } from './listeners/order-events.listener';
import { DeliveryEventsListener } from './listeners/delivery-events.listener';
import { NotificationService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { DeliveryModule } from '../delivery/delivery.module';

// Profile entities — needed by listeners to resolve userId from profileId
import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { RiderProfile } from '../users/entities/rider-profile.entity';

@Module({
  imports: [
    /**
     * JwtModule provides JwtService for token verification.
     *
     * registerAsync() delays initialization until ConfigService is ready
     * (which requires NestJS DI to resolve first). This is the pattern
     * used throughout the codebase (see AuthModule).
     *
     * We only need the secret for .verify() — no signing options needed
     * because the gateway never issues tokens, only validates them.
     */
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-access-secret'),
      }),
    }),

    /**
     * TypeOrmModule.forFeature() — registers entity repositories.
     *
     * Notification — OWNED by this module.
     *   NotificationService @InjectRepository(Notification) gets this repo.
     *
     * CustomerProfile, VendorProfile, RiderProfile — READ-ONLY access.
     *   OrderEventsListener needs CustomerProfile + VendorProfile repos
     *   to look up userId from the profile IDs in event payloads.
     *   DeliveryEventsListener needs RiderProfile repo for the same reason.
     */
    TypeOrmModule.forFeature([
      Notification,
      CustomerProfile,
      VendorProfile,
      RiderProfile,
    ]),

    /**
     * UsersModule exports UsersService.
     * The gateway calls usersService.findByEmail() to enrich the JWT payload
     * with role-specific profile data (vendorProfile, customerProfile, etc.)
     */
    UsersModule,

    /**
     * DeliveryModule exports:
     * - RiderLocationService → gateway calls updateLocation() on location events
     * - DeliveryService → gateway calls findActiveDeliveryForRider() to route
     *   location broadcasts to the right order room
     */
    DeliveryModule,
  ],
  controllers: [
    /**
     * NotificationsController handles the REST API for the inbox:
     *   GET    /api/v1/notifications          — list notifications
     *   PATCH  /api/v1/notifications/read-all — mark all as read
     *   PATCH  /api/v1/notifications/:id/read — mark one as read
     */
    NotificationsController,
  ],
  providers: [
    /**
     * The gateway is registered as a provider so NestJS mounts it and
     * manages its lifecycle (handleConnection, handleDisconnect).
     */
    NotificationsGateway,

    /**
     * Listeners are providers registered in THIS module.
     * They use @OnEvent() decorators which @nestjs/event-emitter scans at startup.
     * EventEmitterModule (registered globally in AppModule) does the scanning.
     */
    OrderEventsListener,
    DeliveryEventsListener,

    /**
     * NotificationService — the core service for Phase 10.3.
     * Handles DB persistence and real-time push via the gateway.
     */
    NotificationService,
  ],
  exports: [
    /**
     * Export NotificationService so other modules can create notifications
     * programmatically if needed in the future (e.g. a system broadcast
     * from AdminModule).
     */
    NotificationService,
  ],
})
export class NotificationsModule {}
