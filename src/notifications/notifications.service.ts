/**
 * NotificationService
 *
 * Manages persistent in-app notifications.
 * Responsible for:
 * 1. Creating notification records in PostgreSQL
 * 2. Pushing newly created notifications to connected users via WebSocket
 * 3. Querying a user's notification inbox (with pagination)
 * 4. Marking notifications as read (one or all)
 *
 * KEY LEARNING: Service Responsibilities
 * ========================================
 * This service bridges TWO concerns that belong together:
 *
 *   Persistence (TypeORM repository) → "store the fact that something happened"
 *   Real-time delivery (gateway)     → "tell the user RIGHT NOW if they're online"
 *
 * These concerns are intentionally combined here because:
 * - Every new notification should ALWAYS be persisted (so it shows up later)
 * - AND pushed in real-time if the user is connected (so they see it immediately)
 * - They always happen together — no reason to separate them
 *
 * KEY LEARNING: Injecting the Gateway into a Service
 * ====================================================
 * The OrderEventsListener already injects NotificationsGateway directly.
 * Here we go one level higher — a SERVICE injects the gateway.
 *
 * This is valid when:
 * - The service and gateway live in the SAME module (no circular dep risk)
 * - The service needs to push real-time updates after every write
 *
 * Architecture note: NotificationsGateway → NotificationService injection
 * would be circular (bad). But NotificationService → NotificationsGateway
 * is a one-way dependency (fine).
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './enums/notification-type.enum';
import type { GetNotificationsDto } from './dto/get-notifications.dto';
import { NotificationsGateway } from './gateways/notifications.gateway';

/**
 * DTO for creating a new notification.
 *
 * KEY LEARNING: Internal DTOs
 * ============================
 * This interface is NOT exported via an HTTP endpoint — it's an internal
 * contract used between event listeners and this service.
 *
 * We define it here (not in a dto/ file) because it's not a
 * "data transfer object" for client input — it's a "service input type".
 * Keeping it in the service file keeps things discoverable.
 */
interface CreateNotificationInput {
  userId: string; // User.id — who receives this notification
  type: NotificationType;
  title: string; // Short headline (shown in notification list)
  message: string; // Full body text
  data?: Record<string, unknown>; // JSON payload for deep-linking
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    /**
     * TypeORM repository for the Notification entity.
     *
     * @InjectRepository(Notification) tells NestJS DI to inject the
     * repository that was registered via TypeOrmModule.forFeature([Notification])
     * in notifications.module.ts.
     *
     * Repository<Notification> gives you the full TypeORM API:
     * .save(), .find(), .findOne(), .findAndCount(), .update(), .delete()
     */
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    /**
     * The WebSocket gateway — used to push new notifications in real-time.
     *
     * We use it to emit to `user:{userId}` room.
     * That room was introduced by updating handleConnection() in the gateway
     * to also join client.join(`user:${user.id}`) after joinRoleRooms().
     */
    private readonly gateway: NotificationsGateway,
  ) {}

  // ==================== CREATE ====================

  /**
   * Create a notification record AND push it to the user's WebSocket connection.
   *
   * This is called by event listeners (OrderEventsListener, DeliveryEventsListener)
   * after they've already broadcast the WebSocket event for real-time UI updates.
   *
   * Flow:
   *   1. Save to DB (persistent — user sees it in inbox even if offline)
   *   2. Emit via WebSocket to user:{userId} (real-time push if connected)
   *
   * KEY LEARNING: Why save FIRST, then emit?
   * ==========================================
   * If we emitted first and the DB save failed, the user would see a
   * notification in real-time that doesn't exist in the DB.
   * When they reload, it would be gone — confusing and buggy.
   *
   * Save first ensures the DB is the source of truth.
   * The WebSocket push is just a convenience "you have something new" signal.
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    // Step 1: Persist to PostgreSQL
    const notification = this.notificationRepo.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ?? null,
      isRead: false, // All notifications start unread
    });

    const saved = await this.notificationRepo.save(notification);

    this.logger.debug(
      `Notification created for user ${input.userId}: [${input.type}] ${input.title}`,
    );

    // Step 2: Push to the user's personal WebSocket room (if they're online)
    //
    // KEY LEARNING: user:{userId} room
    // ==================================
    // This room was added in Phase 10.3: in handleConnection(), after
    // joinRoleRooms(), we now also call client.join(`user:${user.id}`).
    //
    // server.to('user:{id}').emit() sends ONLY to sockets in that room.
    // If the user isn't connected, the emit is a no-op (silently ignored).
    // That's fine — the notification is already persisted and they'll see
    // it when they next call GET /notifications.
    //
    // The client listens for 'notification:new' and can:
    // - Increment the 🔔 badge counter
    // - Show a toast/banner with the title
    // - Optionally add it to the in-memory notification list
    this.gateway.server.to(`user:${input.userId}`).emit('notification:new', {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      message: saved.message,
      data: saved.data,
      isRead: false,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  // ==================== READ ====================

  /**
   * Get a user's notification inbox with pagination and optional unread filter.
   *
   * Returns:
   *   items       — array of notifications (page of results)
   *   total       — total count of matching notifications (for pagination UI)
   *   unreadCount — count of ALL unread notifications for the badge (🔔 3)
   *
   * KEY LEARNING: findAndCount vs find + count
   * ============================================
   * Two queries vs one:
   *
   *   find()  + count() = 2 DB round-trips
   *   findAndCount()    = 1 DB round-trip (executes SELECT + COUNT together)
   *
   * For a list+pagination use case, findAndCount() is more efficient.
   *
   * KEY LEARNING: unreadCount is SEPARATE from total
   * ===================================================
   * `total` counts only the current filter (e.g. if unreadOnly=true,
   * total = count of unread notifications for pagination).
   *
   * `unreadCount` ALWAYS counts ALL unread, regardless of filter.
   * This gives the badge (🔔) an accurate number even when the user
   * is looking at the "All notifications" tab.
   */
  async findUserNotifications(
    userId: string,
    query: GetNotificationsDto,
  ): Promise<{
    items: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const unreadOnly = query.unreadOnly ?? false;

    // Build where clause
    const where: { userId: string; isRead?: boolean } = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    // One query: paginated list + total count for that filter
    const [items, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' }, // Newest first (standard inbox behavior)
      take: limit, // LIMIT in SQL
      skip: offset, // OFFSET in SQL
    });

    // Separate query: always get the TOTAL unread count for the badge
    // This runs even when unreadOnly=false so the badge is always accurate
    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return { items, total, unreadCount };
  }

  // ==================== MARK AS READ ====================

  /**
   * Mark a single notification as read.
   *
   * KEY LEARNING: Ownership Enforcement
   * =====================================
   * We query with BOTH `id` AND `userId` in the WHERE clause:
   *   findOne({ where: { id, userId } })
   *
   * This prevents a user from marking ANOTHER user's notification as read.
   * Example attack: PATCH /notifications/some-other-users-id/read
   *
   * Without userId check:
   *   findOne({ where: { id } }) → finds ANY notification by id
   *   User A could mark User B's notifications as read → information leak
   *
   * With userId check:
   *   findOne({ where: { id, userId } }) → only finds if BOTH match
   *   If the notification belongs to someone else, findOne returns null
   *   and we throw NotFoundException (which also prevents info leakage about
   *   whether that notification ID exists at all).
   *
   * KEY LEARNING: NotFoundException vs ForbiddenException
   * =======================================================
   * Option A: Return 403 Forbidden ("you don't own this")
   *   Problem: Confirms that the notification ID EXISTS — information leak
   *
   * Option B: Return 404 Not Found ("not found for this user")
   *   Better: Client can't tell if the notification doesn't exist OR belongs
   *   to someone else. This is the standard security pattern.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId }, // Both conditions — ownership enforced here
    });

    if (!notification) {
      // 404 intentionally — don't reveal whether it exists for another user
      throw new NotFoundException(
        `Notification not found or does not belong to this user`,
      );
    }

    // Idempotency: if already read, return as-is without an extra DB write
    if (notification.isRead) {
      return notification;
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationRepo.save(notification);
  }

  /**
   * Mark ALL of a user's unread notifications as read at once.
   *
   * Used for the "Mark all as read" button in the notification inbox.
   *
   * KEY LEARNING: repo.update() vs repo.save() for bulk operations
   * ================================================================
   * repo.save() requires loading entities first, then saving each one.
   * For 100 unread notifications that's 100 saves (slow, N queries).
   *
   * repo.update(where, partial) runs a single SQL UPDATE statement:
   *   UPDATE notifications
   *   SET isRead = true, readAt = NOW(), updatedAt = NOW()
   *   WHERE userId = ? AND isRead = false
   *
   * One query regardless of how many rows are affected.
   * `result.affected` tells you how many rows were updated.
   *
   * Tradeoff: @BeforeUpdate() lifecycle hooks don't fire with repo.update().
   * For this use case that's fine — we're not doing anything special on update.
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false }, // WHERE: only unread notifications for this user
      { isRead: true, readAt: new Date() }, // SET: mark as read now
    );

    const updated = result.affected ?? 0;

    this.logger.debug(
      `Marked ${updated} notifications as read for user ${userId}`,
    );

    return { updated };
  }

  /**
   * Delete a single notification (optional cleanup endpoint).
   *
   * Enforces ownership the same way markAsRead() does.
   * Useful if the client wants to dismiss a notification permanently.
   */
  async delete(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification not found or does not belong to this user`,
      );
    }

    await this.notificationRepo.remove(notification);
  }

  /**
   * Get just the unread count (for the badge in the app header).
   *
   * This is a lightweight query used when the client just needs
   * to refresh the badge number without loading the full inbox.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }
}
