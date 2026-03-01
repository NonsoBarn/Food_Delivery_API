/**
 * Notification Entity
 *
 * Represents a single in-app notification stored in the database.
 * Every action in the system that should inform a user (order confirmed,
 * rider assigned, etc.) creates one of these records.
 *
 * KEY LEARNING: In-App Notifications vs WebSocket vs Email/SMS
 * =============================================================
 * We now have THREE notification channels:
 *
 * 1. WebSocket (Phase 9) — EPHEMERAL, real-time
 *    - Sent while the user is connected. If they're offline, it's lost.
 *    - Use case: live order tracking, instant alerts
 *
 * 2. Email/SMS (Phase 10) — EXTERNAL, async
 *    - Sent via BullMQ to external APIs (SendGrid, Twilio).
 *    - User gets it even if they're not in the app.
 *    - Use case: order confirmation email, delivery SMS
 *
 * 3. In-App Notifications (this file) — PERSISTENT, pull-based
 *    - Stored in PostgreSQL indefinitely (until deleted/archived).
 *    - User sees it when they open the app, even hours later.
 *    - Use case: notification bell/inbox in the app UI
 *
 * KEY LEARNING: Why Store Notifications in the Database?
 * =======================================================
 * WebSocket messages disappear if the user is offline.
 * The notification bell (🔔 3) needs to show unread count on next login.
 * The inbox (/notifications list) needs historical data.
 * → Persistent storage is the only way to support this.
 *
 * KEY LEARNING: Composite Indexes
 * ==================================
 * A database index is like a book's table of contents — it lets the
 * database find rows without scanning the entire table.
 *
 * @Index(['userId', 'createdAt']) — covers:
 *   SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC
 *   This is the primary "inbox" query. Without this index, PostgreSQL
 *   would do a full table scan as notifications grow.
 *
 * @Index(['userId', 'isRead']) — covers:
 *   SELECT COUNT(*) FROM notifications WHERE userId = ? AND isRead = false
 *   This is the unread count query (the 🔔 badge). It runs on every
 *   page load, so it must be fast.
 *
 * Rule of thumb: Add an index for every WHERE clause you query frequently.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType } from '../enums/notification-type.enum';

@Entity('notifications')
@Index(['userId', 'createdAt']) // Inbox query: get my recent notifications
@Index(['userId', 'isRead']) // Badge query: count my unread notifications
export class Notification {
  /**
   * UUID primary key.
   *
   * KEY LEARNING: UUID vs Auto-increment
   * ======================================
   * Auto-increment (1, 2, 3...): sequential, predictable, exposes row count.
   * UUID: globally unique, not guessable, safe to expose in URLs.
   *
   * Since notification IDs appear in API responses (e.g. PATCH /notifications/:id/read),
   * using UUIDs prevents users from guessing other users' notification IDs.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The User.id of the notification recipient.
   *
   * KEY LEARNING: Storing userId (not a full relation)
   * ===================================================
   * We store a plain UUID instead of a full @ManyToOne(() => User) relation.
   * This is intentional for notifications because:
   *
   * 1. We never need to JOIN to the users table from a notification query.
   *    The endpoint already knows the user from the JWT (no JOIN needed).
   *
   * 2. If a user is deleted, we want to cascade-delete their notifications
   *    (which a @ManyToOne with onDelete:'CASCADE' would handle), but a
   *    plain UUID is simpler and sufficient for our use case.
   *
   * 3. Fewer ORM eager-loading footguns — no accidental N+1 queries.
   *
   * Tradeoff: We can't do `notification.user.email` — we'd need a separate query.
   * For this entity's purpose (displaying notifications to an already-known user),
   * that's fine.
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * The notification category.
   *
   * Stored as a PostgreSQL ENUM type — the DB enforces valid values.
   * The frontend uses this to:
   * - Render the correct icon (shopping bag for ORDER_*, bicycle for DELIVERY_*)
   * - Filter notifications by type in the inbox
   * - Deep-link to the right screen (ORDER_CONFIRMED → open order detail)
   */
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  /**
   * Short headline shown in the notification list.
   * e.g. "Order #ORD-20260301-A3F8 Confirmed"
   * Keep under 100 characters for UI display purposes.
   */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /**
   * Full human-readable message body.
   * e.g. "Your order from Burger Palace is being prepared. Estimated time: 20 minutes."
   * Using `text` type (unlimited length) for flexibility.
   */
  @Column({ type: 'text' })
  message: string;

  /**
   * Flexible JSON payload for frontend deep-linking.
   *
   * KEY LEARNING: jsonb vs json in PostgreSQL
   * ==========================================
   * json: stores raw JSON text — no indexing possible.
   * jsonb: stores decomposed binary JSON — supports GIN indexes, faster queries.
   *
   * We use jsonb so we could later do:
   *   WHERE data->>'orderId' = ?   (query by nested field)
   *
   * Example data values:
   *   Order notification: { orderId: 'uuid', orderNumber: 'ORD-001', vendorName: 'Burger Palace' }
   *   Delivery notification: { deliveryId: 'uuid', orderId: 'uuid', riderName: 'John D.' }
   *   System notification: { link: '/promotions/summer-2026' }
   *
   * nullable: true — SYSTEM notifications may not have domain-specific data.
   */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  /**
   * Whether the user has seen/acknowledged this notification.
   *
   * default: false — all notifications start unread.
   * Set to true via PATCH /notifications/:id/read or PATCH /notifications/read-all.
   *
   * KEY LEARNING: Soft "seen" state
   * ==================================
   * We could delete notifications after reading, but that would lose the
   * inbox history. Instead, we keep them and flip the boolean.
   * This is the standard pattern (Gmail, Slack, etc. all work this way).
   */
  @Column({ default: false })
  isRead: boolean;

  /**
   * When the user marked this notification as read.
   *
   * Nullable because it starts null and is only set on the read action.
   * Useful for analytics: "average time to read a notification".
   * timestamptz = timestamp with timezone — stores timezone info.
   */
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  /**
   * Auto-managed by TypeORM via @CreateDateColumn.
   * Set once on INSERT, never updated.
   * Used for ordering notifications newest-first in the inbox.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Auto-managed by TypeORM via @UpdateDateColumn.
   * Updated whenever the entity is saved (e.g., when isRead is toggled).
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
