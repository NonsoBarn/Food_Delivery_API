/**
 * ReminderEmailsJob
 *
 * Sends "abandoned cart" reminder emails to users who have items
 * in their cart but haven't placed an order in the past 3 days.
 *
 * KEY LEARNING: Abandoned Cart Pattern
 * ======================================
 * An "abandoned cart" is a shopping cart with items where the user
 * didn't complete checkout. It's one of the highest-ROI marketing
 * tactics in e-commerce — Klaviyo reports 15% conversion on cart
 * reminder emails.
 *
 * Our detection logic:
 * 1. Scan Redis for all `cart:user:{userId}` keys (active user carts)
 * 2. For each, check if the user placed any order in the last 3 days
 * 3. If NOT → they abandoned their cart → queue a reminder email
 * 4. Rate-limit: don't send more than one reminder per user per 24 hours
 *    (using a Redis key `reminder:sent:{userId}` with 24h TTL)
 *
 * KEY LEARNING: Cross-referencing Redis + PostgreSQL
 * ====================================================
 * This job shows a key architectural pattern: using Redis as a
 * real-time data store AND PostgreSQL as the transactional DB,
 * then querying BOTH to make decisions.
 *
 * Redis tells us: "This user has cart items right now."
 * PostgreSQL tells us: "Did this user order recently?"
 *
 * Neither source alone is sufficient — you need both.
 *
 * KEY LEARNING: Rate limiting via Redis TTL
 * ==========================================
 * We use a Redis key to prevent spamming:
 *
 *   await redis.set(`reminder:sent:${userId}`, '1', 'EX', 86400)
 *   // 'EX' = expire in seconds, 86400 = 24 hours
 *
 * Before queuing a reminder, we check:
 *   const alreadySent = await redis.get(`reminder:sent:${userId}`)
 *   if (alreadySent) return; // Skip — we already sent one today
 *
 * This is a simple but effective rate limiter. The TTL handles cleanup
 * automatically — no cron job needed to clear the flag.
 *
 * KEY LEARNING: The cart key format
 * ====================================
 * Cart keys are: `cart:user:{userId}` (User.id, not CustomerProfile.id)
 * This was set in CartService.getCartKey() with isAuthenticated=true.
 * We extract userId by splitting on ':':
 *   'cart:user:abc-123' → split(':') → ['cart', 'user', 'abc-123'] → [2] = 'abc-123'
 *
 * KEY LEARNING: The order query (cross-referencing)
 * ==================================================
 * cart:user:{userId} has the User.id.
 * Orders are stored with customerId = CustomerProfile.id.
 * To check "did this user order recently?", we must:
 *   1. Look up CustomerProfile where userId = userId → get customerId
 *   2. Check if Order exists where customerId = customerId AND createdAt > 3 days ago
 *
 * Alternative: add a userId column to orders (denormalization).
 * We don't — orders were designed around CustomerProfile.id.
 * The two-step lookup is more correct architecturally.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import type Redis from 'ioredis';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { MailService } from '../../communication/mail/mail.service';

@Injectable()
export class ReminderEmailsJob {
  private readonly logger = new Logger(ReminderEmailsJob.name);

  /**
   * How long ago counts as "recently ordered" (in milliseconds).
   * Users who ordered within this window are NOT considered abandoned.
   *
   * KEY LEARNING: Named constants over magic numbers
   * ==================================================
   * Bad:  if (order.createdAt > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
   * Good: if (order.createdAt > new Date(Date.now() - RECENT_ORDER_WINDOW_MS))
   *
   * The constant name explains WHAT it means, making the code self-documenting.
   */
  private readonly RECENT_ORDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

  /** Redis TTL for the "already sent reminder" flag (24 hours in seconds). */
  private readonly REMINDER_COOLDOWN_SECONDS = 24 * 60 * 60; // 1 day

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(CustomerProfile)
    private readonly customerRepo: Repository<CustomerProfile>,
    private readonly mailService: MailService,
  ) {}

  /**
   * Abandoned cart reminder — runs every day at 10:00 AM.
   *
   * 10 AM is chosen intentionally:
   * - Users are typically awake and checking email
   * - Early enough to potentially influence a lunchtime order
   * - After the daily report (8 AM) has already run
   *
   * KEY LEARNING: CronExpression.EVERY_DAY_AT_10AM
   * ================================================
   * @nestjs/schedule exports CronExpression enum with named common patterns.
   * These are readable alternatives to raw cron strings:
   *   CronExpression.EVERY_DAY_AT_10AM = '0 10 * * *'
   *   CronExpression.EVERY_WEEK = '0 0 * * 1' (Monday midnight)
   *   CronExpression.EVERY_HOUR = '0 * * * *'
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM, { name: 'cart-reminders' })
  async sendAbandonedCartReminders(): Promise<void> {
    this.logger.log('Abandoned cart reminder job started...');

    const threeDaysAgo = new Date(Date.now() - this.RECENT_ORDER_WINDOW_MS);

    let scannedCarts = 0;
    let remindersQueued = 0;
    let skippedRecentOrder = 0;
    let skippedAlreadySent = 0;

    // ── Step 1: Scan all user cart keys ─────────────────────────────────────

    let cursor = '0';
    do {
      const [nextCursor, cartKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        'cart:user:*',
        'COUNT',
        50, // Smaller batches — this job does DB queries per key, so be gentle
      );
      cursor = nextCursor;

      for (const cartKey of cartKeys) {
        scannedCarts++;
        await this.processCartKey(
          cartKey,
          threeDaysAgo,
          () => skippedRecentOrder++,
          () => skippedAlreadySent++,
          () => remindersQueued++,
        );
      }
    } while (cursor !== '0');

    // ── Step 5: Log the summary ───────────────────────────────────────────────

    this.logger.log(
      JSON.stringify({
        event: 'cart_reminders_complete',
        scannedCarts,
        remindersQueued,
        skippedRecentOrder,
        skippedAlreadySent,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  /**
   * Process one cart key — decide whether to send a reminder.
   *
   * KEY LEARNING: Extracting logic into a private method
   * ======================================================
   * The main job loop would be very long if we inlined all this logic.
   * By extracting it, the main method reads like a summary (high-level flow)
   * while the detail is in this helper (low-level steps).
   *
   * We use callbacks for the counters so the parent method can track stats
   * without having to pass the full context into the helper.
   */
  private async processCartKey(
    cartKey: string,
    threeDaysAgo: Date,
    onRecentOrder: () => void,
    onAlreadySent: () => void,
    onQueued: () => void,
  ): Promise<void> {
    // ── Step 2: Extract userId from cart key ─────────────────────────────────

    /**
     * KEY LEARNING: Extracting a value from a key pattern
     * =====================================================
     * Cart key format: 'cart:user:{userId}'
     *
     * split(':') → ['cart', 'user', 'some-uuid-here']
     *
     * But UUIDs contain hyphens (-), not colons (:), so split on ':' works.
     * However, to be safe, we slice from index 2 and rejoin — this handles
     * any future key formats that might have extra colons in the userId.
     *
     * Actually: uuid v4 format = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
     * No colons → simple split works fine here.
     */
    const parts = cartKey.split(':');
    if (parts.length < 3) return; // Malformed key, skip
    const userId = parts.slice(2).join(':'); // Handles edge case of extra ':'

    // Check if the cart actually has items (TTL may not have expired yet
    // but cart might be logically empty)
    const cartSize = await this.redis.hlen(cartKey);
    if (cartSize === 0) return; // Empty cart, no reminder needed

    // ── Step 3: Check rate limit — did we already send a reminder today? ─────

    const reminderKey = `reminder:sent:${userId}`;
    const alreadySent = await this.redis.get(reminderKey);
    if (alreadySent) {
      onAlreadySent();
      return;
    }

    // ── Step 4: Check if user ordered recently ────────────────────────────────

    /**
     * KEY LEARNING: Two-step lookup (User → CustomerProfile → Orders)
     * =================================================================
     * The cart key has userId (User.id).
     * Orders reference customerId (CustomerProfile.id).
     * We must go through CustomerProfile to connect them.
     *
     * In a mature app, you'd add userId directly to orders or use a JOIN.
     * For this learning project, the two-step shows how to navigate relations.
     */
    const customerProfile = await this.customerRepo.findOne({
      where: { userId },
    });

    if (customerProfile) {
      /**
       * MoreThan is TypeORM's WHERE > operator:
       *   WHERE "createdAt" > :threeDaysAgo
       *
       * This is more readable than writing raw SQL and integrates with
       * TypeORM's type system.
       */
      const recentOrder = await this.orderRepo.findOne({
        where: {
          customerId: customerProfile.id,
          createdAt: MoreThan(threeDaysAgo),
        },
      });

      if (recentOrder) {
        // User ordered within the last 3 days — cart not abandoned
        onRecentOrder();
        return;
      }
    }

    // ── Step 5: Send the reminder ─────────────────────────────────────────────

    // Look up the user's email
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return; // User not found (deleted account?)

    // Queue the reminder email via BullMQ (non-blocking)
    try {
      await this.mailService.queueAbandonedCartEmail(user.email, cartSize);

      /**
       * KEY LEARNING: Set the rate-limit flag AFTER successful queue
       * =============================================================
       * If we set the flag BEFORE queuing and the queue throws,
       * we'd have a flag set but no email queued — the user would never
       * get a reminder.
       *
       * Set AFTER successful queue: if queue throws, we try again tomorrow.
       * This is the "at-least-once delivery" pattern.
       *
       * 'EX' option = expire in seconds (24 hours = 86400 seconds).
       * After expiry, the key is gone and we can send another reminder.
       */
      await this.redis.set(reminderKey, '1', 'EX', this.REMINDER_COOLDOWN_SECONDS);

      onQueued();
      this.logger.debug(`Queued abandoned cart reminder for user ${userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to queue reminder for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
