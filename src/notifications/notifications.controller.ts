/**
 * NotificationsController
 *
 * REST API endpoints for a user's in-app notification inbox.
 * Base route: /api/v1/notifications
 *
 * ┌────────┬──────────────────────────────────┬───────────┬─────────────────────────────────┐
 * │ Method │ Route                            │ Auth      │ Description                     │
 * ├────────┼──────────────────────────────────┼───────────┼─────────────────────────────────┤
 * │ GET    │ /                                │ Any role  │ Paginated inbox + unread count  │
 * │ GET    │ /unread-count                    │ Any role  │ Just the badge count (fast)     │
 * │ PATCH  │ /read-all                        │ Any role  │ Mark all as read                 │
 * │ PATCH  │ /:id/read                        │ Any role  │ Mark one as read                 │
 * │ DELETE │ /:id                             │ Any role  │ Dismiss a notification           │
 * └────────┴──────────────────────────────────┴───────────┴─────────────────────────────────┘
 *
 * KEY LEARNING: No RolesGuard on notification routes
 * ====================================================
 * JwtAuthGuard is required (user must be logged in).
 * RolesGuard is NOT needed — every role (CUSTOMER, VENDOR, RIDER, ADMIN)
 * has their own notifications.
 *
 * Adding @Roles(UserRole.CUSTOMER) would lock out vendors and riders.
 * Instead, service methods always scope queries by userId — you can only
 * see, mark, or delete YOUR OWN notifications.
 *
 * KEY LEARNING: Route Declaration Order (Critical!)
 * ===================================================
 * NestJS (Express under the hood) matches routes TOP TO BOTTOM in the
 * order they are declared in the class.
 *
 * Problem if we declared /:id before /read-all:
 *   PATCH /notifications/read-all
 *   → /:id catches it with id = "read-all"
 *   → service looks for notification ID "read-all" → NotFoundException
 *
 * Solution: ALWAYS declare literal-segment routes BEFORE param routes:
 *   /read-all  (declared first — literal match)
 *   /:id/read  (declared second — param match)
 *   /:id       (declared last — broadest param match)
 *
 * KEY LEARNING: @CurrentUser() decorator
 * ========================================
 * The @CurrentUser() decorator (in src/common/decorators/current-user.decorator.ts)
 * extracts the user object from request.user.
 * JwtAuthGuard populates request.user from the JWT payload via JwtStrategy.
 *
 * We use the User entity class (not the RequestUser interface) as the type
 * for the parameter because `emitDecoratorMetadata` requires concrete classes
 * in decorated positions (TS1272 fix pattern used throughout this codebase).
 */

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller({
  path: 'notifications',
  version: '1', // → /api/v1/notifications
})
@UseGuards(JwtAuthGuard) // All notification routes require authentication
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  // ==================== GET NOTIFICATIONS (INBOX) ====================

  /**
   * GET /api/v1/notifications
   *
   * Fetch the authenticated user's notification inbox.
   *
   * Response shape:
   * {
   *   items: Notification[],  // Current page of notifications
   *   total: number,          // Total count (for pagination UI, e.g. "Page 1 of 5")
   *   unreadCount: number     // All unread count (for the 🔔 badge)
   * }
   *
   * Query params (from GetNotificationsDto):
   *   ?limit=20        → page size (default: 20, max: 100)
   *   ?offset=0        → items to skip (default: 0)
   *   ?unreadOnly=true → only show unread (default: false)
   *
   * KEY LEARNING: Scoped by userId (never userId from query param)
   * ================================================================
   * userId comes from the JWT token (via @CurrentUser()), NEVER from
   * the query string. This prevents:
   *   GET /notifications?userId=someOtherUserId  ← should never work
   *
   * The JWT is cryptographically signed by our server — it can't be
   * forged. Query params are user-controlled and cannot be trusted.
   */
  @Get()
  async getUserNotifications(
    @CurrentUser() user: User,
    @Query() query: GetNotificationsDto,
  ) {
    return this.notificationService.findUserNotifications(user.id, query);
  }

  /**
   * GET /api/v1/notifications/unread-count
   *
   * Returns just the unread notification count — lightweight endpoint
   * for refreshing the 🔔 badge without loading the full inbox.
   *
   * The client can poll this every 30 seconds to keep the badge fresh
   * without the overhead of fetching full notification objects.
   *
   * Response: { unreadCount: number }
   *
   * KEY LEARNING: Why a separate endpoint for count?
   * ==================================================
   * The inbox endpoint (GET /) also returns unreadCount, but it
   * also does pagination queries and returns full notification objects.
   * This lightweight endpoint runs a single COUNT() query — much cheaper
   * when the client only needs the number (e.g., on a dashboard header).
   *
   * IMPORTANT: This MUST be declared BEFORE /:id/read to avoid
   * "unread-count" being captured as `:id`.
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: User) {
    return this.notificationService.getUnreadCount(user.id);
  }

  // ==================== MARK AS READ ====================

  /**
   * PATCH /api/v1/notifications/read-all
   *
   * Mark ALL of the authenticated user's unread notifications as read.
   * This is the "Mark all as read" button in a notification inbox UI.
   *
   * Response: { updated: number }  — how many were updated
   *
   * @HttpCode(200) because we use PATCH, not PUT or POST.
   * PATCH is appropriate for partial updates (only changing isRead).
   *
   * KEY LEARNING: MUST be declared before /:id/read!
   * ==================================================
   * If /:id/read comes first, "read-all" is treated as an id param.
   * Route declaration order is crucial with Express-based frameworks.
   *
   * KEY LEARNING: repo.update() for bulk mark-as-read
   * ===================================================
   * Under the hood, this runs:
   *   UPDATE notifications SET isRead=true, readAt=NOW()
   *   WHERE userId=? AND isRead=false
   * One SQL statement, no matter how many unread notifications exist.
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user.id);
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   *
   * Mark a single notification as read.
   *
   * The service enforces ownership: the notification must belong to the
   * authenticated user. If it belongs to another user, 404 is returned
   * (not 403, to avoid revealing that the notification ID exists).
   *
   * Response: the updated Notification object
   *
   * KEY LEARNING: Idempotency
   * ==========================
   * Calling this endpoint twice should be safe (idempotent).
   * The service checks: if already read, return as-is without another DB write.
   * The client can safely retry without side effects.
   *
   * This follows the HTTP PATCH semantics: "apply this change if needed."
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  // ==================== DELETE ====================

  /**
   * DELETE /api/v1/notifications/:id
   *
   * Permanently remove a notification from the inbox.
   * Ownership is enforced — users can only delete their own notifications.
   *
   * Response: 204 No Content (nothing to return after deletion)
   *
   * KEY LEARNING: 204 vs 200 for deletes
   * ======================================
   * 200 OK: "Here's data about what happened"
   * 204 No Content: "It's done, no data to return"
   *
   * For deletions, 204 is semantically correct — there's nothing left
   * to return about the deleted resource.
   *
   * @HttpCode(HttpStatus.NO_CONTENT) overrides the default 200.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.notificationService.delete(id, user.id);
  }
}
