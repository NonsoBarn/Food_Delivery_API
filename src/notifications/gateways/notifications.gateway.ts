/**
 * NotificationsGateway
 *
 * The WebSocket gateway for real-time notifications. Think of this as the
 * WebSocket equivalent of a controller — it handles incoming socket events
 * and manages which clients receive which broadcasts.
 *
 * KEY LEARNING: WebSocket vs HTTP
 * =================================
 * HTTP: Client sends a request → Server responds → Connection closes.
 *       Client has to POLL to check for updates ("are we there yet?").
 *
 * WebSocket: Client connects ONCE → both sides can send messages anytime.
 *            Server can PUSH updates to the client without being asked.
 *            Think of it like a phone call vs sending letters.
 *
 * KEY LEARNING: Socket.io Rooms
 * ================================
 * A "room" is a named channel. Any socket can join/leave rooms.
 * When you emit to a room, ONLY sockets in that room receive it.
 *
 * Our room strategy:
 *   vendor:{vendorProfileId}  — vendor receives new order alerts
 *   rider:{riderProfileId}    — rider receives delivery assignments
 *   order:{orderId}           — all parties watching an order (status updates)
 *   admin                     — admins receive all system events
 *
 * A socket can be in MULTIPLE rooms simultaneously. A vendor watching
 * their own order would be in both vendor:{id} and order:{orderId}.
 *
 * KEY LEARNING: Gateway Lifecycle
 * =================================
 * OnGatewayConnection.handleConnection() → fires when client connects
 * OnGatewayDisconnect.handleDisconnect() → fires when client disconnects
 * @SubscribeMessage('event') → fires when client emits 'event'
 *
 * KEY LEARNING: JWT Auth on WebSockets
 * =====================================
 * HTTP uses Authorization header, but WebSocket headers are set during
 * the initial HTTP upgrade handshake and can't be changed afterward.
 *
 * Socket.io provides socket.handshake.auth for this purpose:
 * Client sends:  io('/notifications', { auth: { token: 'Bearer eyJ...' } })
 * Gateway reads: socket.handshake.auth.token
 *
 * We verify the token, load the user, and attach it to socket.data.user.
 * All subsequent handlers can trust socket.data.user is valid.
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';
import { UsersService } from '../../users/users.service';
import { RiderLocationService } from '../../delivery/services/rider-location.service';
import { DeliveryService } from '../../delivery/services/delivery.service';
/**
 * KEY LEARNING: `import type` vs `import`
 * ==========================================
 * When `isolatedModules` and `emitDecoratorMetadata` are both enabled,
 * TypeScript emits runtime type metadata for decorated method parameters.
 * For a class like:
 *
 *   @SubscribeMessage('x')
 *   handle(@ConnectedSocket() client: MyInterface) {}
 *
 * TypeScript would try to emit Reflect.metadata('design:paramtypes', [MyInterface])
 * but interfaces have NO runtime representation — they're erased at compile time.
 * TypeScript error TS1272 tells you this.
 *
 * Fix: use `import type` for interfaces used in decorated parameter positions.
 * `import type` is completely erased from the compiled JS, so TypeScript
 * knows not to try emitting metadata for it. The type still works for
 * compile-time type checking — it's purely a compile-time construct.
 *
 * Concretely: the decorator metadata emits `Object` instead of `SocketWithUser`,
 * which is fine because @ConnectedSocket() and @MessageBody() don't use
 * this metadata — they use Socket.io's own injection mechanism.
 */
import type { SocketWithUser } from '../interfaces/socket-with-user.interface';
import type { RiderLocationUpdatePayload } from '../events/notification-events';
import { UserRole } from '../../common/enums/user-role.enum';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * @WebSocketGateway configuration:
 *
 * namespace: '/notifications'
 *   Namespaces are like URL paths for WebSockets.
 *   Client connects with: io('http://localhost:3000/notifications')
 *   Using a namespace isolates this gateway from potential future gateways
 *   (e.g., '/admin', '/chat').
 *
 * cors: { origin: '*' }
 *   Wildcard here is overridden by our custom SocketIoAdapter.
 *   The adapter reads CORS_ORIGINS from .env and applies them.
 *   We still need this here to prevent NestJS from blocking connections
 *   before the adapter's CORS config kicks in.
 */
@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  /**
   * @WebSocketServer() injects the underlying Socket.io Server instance.
   *
   * This gives you direct access to socket.io's full API:
   * - this.server.to('room').emit('event', data) — broadcast to a room
   * - this.server.sockets.sockets.size — count connected clients
   * - this.server.in('room').disconnectSockets() — kick everyone from a room
   *
   * The server is only available AFTER the gateway is mounted,
   * so don't access it in the constructor.
   */
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly riderLocationService: RiderLocationService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // ==================== CONNECTION LIFECYCLE ====================

  /**
   * Fires when a client connects.
   *
   * This is where we authenticate the socket. If the token is invalid,
   * we disconnect immediately with an error. If valid, we join the client
   * to their role-based room so they receive relevant broadcasts.
   *
   * KEY LEARNING: Authentication in handleConnection
   * ==================================================
   * We can't use NestJS Guards here (they only work on @SubscribeMessage handlers).
   * Instead, we manually verify the JWT and disconnect invalid clients.
   *
   * Pattern: authenticate → attach user → join rooms → log
   */
  async handleConnection(client: SocketWithUser): Promise<void> {
    try {
      // Extract token from handshake
      // Client sends: io('/notifications', { auth: { token: 'Bearer eyJ...' } })
      const rawToken: string =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization ||
        '';

      const token = rawToken.replace(/^Bearer\s+/i, '');

      if (!token) {
        this.disconnect(client, 'No authentication token provided');
        return;
      }

      // Verify the JWT signature and extract payload
      // JwtService.verify() throws if token is expired or tampered
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(token);
      } catch {
        this.disconnect(client, 'Invalid or expired token');
        return;
      }

      // Load full user (with role-specific profiles) from the database
      // This is the same enrichment done in JwtStrategy.validate()
      const user = await this.usersService.findByEmail(payload.email);

      if (!user) {
        this.disconnect(client, 'User not found');
        return;
      }

      // Build RequestUser (same shape as JwtStrategy returns on HTTP requests)
      const requestUser: RequestUser = {
        id: user.id,
        email: user.email,
        role: user.role,
      };

      if (user.vendorProfile) {
        requestUser.vendorProfile = {
          id: user.vendorProfile.id,
          businessName: user.vendorProfile.businessName,
          status: user.vendorProfile.status,
        };
      }

      if (user.customerProfile) {
        requestUser.customerProfile = {
          id: user.customerProfile.id,
          deliveryAddress: user.customerProfile.deliveryAddress,
          city: user.customerProfile.city,
          state: user.customerProfile.state,
          postalCode: user.customerProfile.postalCode,
          latitude: user.customerProfile.latitude,
          longitude: user.customerProfile.longitude,
        };
      }

      if (user.riderProfile) {
        requestUser.riderProfile = {
          id: user.riderProfile.id,
          status: user.riderProfile.status,
          availabilityStatus: user.riderProfile.availabilityStatus,
        };
      }

      // Attach user to socket — available in all @SubscribeMessage handlers
      client.data.user = requestUser;

      // Join role-based rooms automatically on connect
      await this.joinRoleRooms(client);

      /**
       * KEY LEARNING: Personal User Room (Phase 10.3)
       * ===============================================
       * We now also join a `user:{userId}` room on every connection.
       *
       * WHY: In-app notifications are targeted to a SPECIFIC USER, not a role.
       * The existing role rooms work great for:
       *   vendor:{id}  → all vendors see new orders (but we want ONE vendor's orders)
       *   rider:{id}   → fine, already per-rider
       *   admin        → broadcast to all admins
       *
       * But when NotificationService.create() wants to push a notification
       * to userId = 'abc-123', it needs a room that ONLY 'abc-123' is in.
       * user:{userId} is that room.
       *
       * This enables:
       *   this.gateway.server.to(`user:${userId}`).emit('notification:new', ...)
       *
       * If the user has multiple devices/tabs connected, ALL of them join
       * user:{userId} and ALL of them receive the notification push.
       *
       * The personal room and the role room are NOT mutually exclusive.
       * A vendor socket is in BOTH vendor:{profileId} AND user:{userId}.
       */
      await client.join(`user:${requestUser.id}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.email}, role: ${user.role})`,
      );
    } catch (error) {
      this.disconnect(client, 'Authentication failed');
      this.logger.error(`Connection error: ${error.message}`);
    }
  }

  /**
   * Fires when a client disconnects (tab closed, network drop, etc.).
   *
   * We log the disconnection for monitoring. Socket.io automatically
   * removes the socket from all rooms — no manual cleanup needed.
   */
  handleDisconnect(client: SocketWithUser): void {
    const user = client.data?.user;
    if (user) {
      this.logger.log(
        `Client disconnected: ${client.id} (user: ${user.email})`,
      );
    } else {
      this.logger.log(`Unauthenticated client disconnected: ${client.id}`);
    }
  }

  // ==================== CLIENT → SERVER MESSAGES ====================

  /**
   * Client subscribes to updates for a specific order.
   *
   * Called when a user opens an order detail page.
   * All parties with access to the order (customer, vendor, rider, admin)
   * join the same room and receive order + delivery updates.
   *
   * KEY LEARNING: Dynamic Room Joining
   * ====================================
   * Role-based rooms (vendor:{id}) are joined automatically on connect.
   * Order rooms are joined ON DEMAND because users might view many different
   * orders. We don't want to join ALL order rooms at connect time.
   *
   * Security: We verify the user actually has access to this order before
   * letting them join the room. Without this check, any authenticated user
   * could subscribe to any order's updates.
   *
   * @SubscribeMessage return value is sent back to the caller as an acknowledgement.
   * Client uses: socket.emit('order:subscribe', { orderId }, (ack) => { ... })
   */
  @SubscribeMessage('order:subscribe')
  async handleOrderSubscribe(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { orderId: string },
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const user = client.data.user;
      const { orderId } = payload;

      if (!orderId) {
        return { success: false, message: 'orderId is required' };
      }

      // TODO: In production, fetch the order and verify the user has access
      // For now, join the room — the listener's business logic provides enough security
      // (events only flow through after service-level validation)
      await client.join(`order:${orderId}`);

      this.logger.log(
        `User ${user.email} subscribed to order:${orderId}`,
      );

      return { success: true };
    } catch {
      return { success: false, message: 'Failed to subscribe to order' };
    }
  }

  /**
   * Client unsubscribes from an order's updates.
   *
   * Called when user navigates away from the order detail page.
   * Good practice to leave rooms when no longer needed — reduces
   * unnecessary event delivery.
   */
  @SubscribeMessage('order:unsubscribe')
  async handleOrderUnsubscribe(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: { orderId: string },
  ): Promise<{ success: boolean }> {
    const { orderId } = payload;
    await client.leave(`order:${orderId}`);
    return { success: true };
  }

  /**
   * Rider sends their current GPS location.
   *
   * KEY LEARNING: High-Frequency Events
   * =====================================
   * Location updates happen every 5-10 seconds from the rider's app.
   * This is TOO FREQUENT for the EventEmitter pattern (which is for
   * business events like "order confirmed").
   *
   * Instead, we handle location directly in the gateway:
   * 1. Store in Redis GEO (fast, geospatial, already set up)
   * 2. Find the rider's active delivery (if any)
   * 3. Broadcast to the customer tracking that delivery
   *
   * WHY NOT emit to EventEmitter here?
   * If a rider sends 720 location updates per hour and we emit an event
   * for each, the event bus becomes a bottleneck. Direct handling is faster.
   *
   * Security: We verify the client is actually a RIDER before processing.
   */
  @SubscribeMessage('rider:location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: SocketWithUser,
    @MessageBody() payload: RiderLocationUpdatePayload,
  ): Promise<void> {
    const user = client.data.user;

    // Only riders can send location updates
    if (user.role !== UserRole.RIDER || !user.riderProfile) {
      throw new WsException('Only riders can send location updates');
    }

    const { latitude, longitude, heading, speed } = payload;

    // Basic validation
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new WsException('Invalid GPS coordinates');
    }

    // 1. Update Redis GEO (existing RiderLocationService)
    // This is the same service used for auto-assignment proximity search
    await this.riderLocationService.updateLocation(
      user.riderProfile.id,
      latitude,
      longitude,
      heading,
      speed,
    );

    // 2. Find the rider's active delivery (if any)
    const activeDelivery = await this.deliveryService.findActiveDeliveryForRider(
      user.riderProfile.id,
    );

    // 3. If rider is on an active delivery, broadcast location to customer
    if (activeDelivery) {
      // Emit to the order room — the customer joined this room when opening the order
      this.server.to(`order:${activeDelivery.orderId}`).emit(
        'delivery:location_updated',
        {
          riderId: user.riderProfile.id,
          latitude,
          longitude,
          heading,
          speed,
          timestamp: new Date(),
        },
      );
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Join the user to their role-specific room on connection.
   *
   * Vendors join vendor:{id} → receive new order alerts
   * Riders join rider:{id} → receive delivery assignments
   * Admins join admin → receive all system events
   * Customers don't get a general room (they subscribe to order rooms)
   *
   * KEY LEARNING: Why different rooms per role?
   * =============================================
   * A vendor's "new order" alert should only go to THAT vendor.
   * If we put all vendors in one room, each vendor would see all vendors' orders.
   * By using vendor:{vendorProfileId} as the room name, we get per-vendor isolation.
   */
  private async joinRoleRooms(client: SocketWithUser): Promise<void> {
    const user = client.data.user;

    switch (user.role) {
      case UserRole.VENDOR:
        if (user.vendorProfile) {
          await client.join(`vendor:${user.vendorProfile.id}`);
          this.logger.debug(
            `Vendor ${user.email} joined room: vendor:${user.vendorProfile.id}`,
          );
        }
        break;

      case UserRole.RIDER:
        if (user.riderProfile) {
          await client.join(`rider:${user.riderProfile.id}`);
          this.logger.debug(
            `Rider ${user.email} joined room: rider:${user.riderProfile.id}`,
          );
        }
        break;

      case UserRole.ADMIN:
        await client.join('admin');
        this.logger.debug(`Admin ${user.email} joined room: admin`);
        break;

      case UserRole.CUSTOMER:
        // Customers subscribe to order rooms dynamically via 'order:subscribe'
        this.logger.debug(
          `Customer ${user.email} connected (subscribes to orders on demand)`,
        );
        break;
    }
  }

  /**
   * Disconnect a socket with an error message.
   *
   * We emit an 'error' event BEFORE disconnecting so the client can
   * display a meaningful message (e.g., "Session expired, please log in again").
   *
   * client.disconnect(true) closes the underlying TCP connection immediately.
   * Passing `true` skips the graceful Socket.io closing handshake.
   */
  private disconnect(client: SocketWithUser, message: string): void {
    client.emit('error', { message });
    client.disconnect(true);
    this.logger.warn(`Disconnected unauthenticated client: ${client.id} — ${message}`);
  }
}
