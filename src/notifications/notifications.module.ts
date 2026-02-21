/**
 * NotificationsModule
 *
 * Owns all WebSocket infrastructure: the gateway, event listeners,
 * and the dependencies they need.
 *
 * KEY LEARNING: Module Boundary Design
 * ======================================
 * This module only knows about:
 * - JWT (for socket authentication in handleConnection)
 * - Users (to load the full user on connection)
 * - Delivery (for RiderLocationService and findActiveDeliveryForRider)
 *
 * It does NOT import OrdersModule or DeliveryModule for events.
 * The event bus (@nestjs/event-emitter) is global — OrdersService
 * and DeliveryService emit events WITHOUT importing this module.
 * The listeners receive them WITHOUT the services knowing they exist.
 *
 * KEY LEARNING: JwtModule Registration
 * ======================================
 * We import JwtModule separately here (not AuthModule).
 * AuthModule exports PassportModule and AuthService, but not JwtModule itself.
 *
 * The gateway needs JwtService.verify() to validate tokens in the WebSocket
 * handshake. We register JwtModule with the same secret as AuthModule.
 *
 * Since ConfigModule.forRoot({ isGlobal: true }) loads all env vars globally,
 * we can access JWT_SECRET directly through ConfigService without needing
 * to load the jwt.config.ts namespace file.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { OrderEventsListener } from './listeners/order-events.listener';
import { DeliveryEventsListener } from './listeners/delivery-events.listener';
import { UsersModule } from '../users/users.module';
import { DeliveryModule } from '../delivery/delivery.module';

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
  ],
})
export class NotificationsModule {}
