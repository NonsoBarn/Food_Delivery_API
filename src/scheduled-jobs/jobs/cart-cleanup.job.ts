/**
 * CartCleanupJob
 *
 * A scheduled cron task that runs daily to scan Redis cart data,
 * report stats on active carts, and log a summary.
 *
 * KEY LEARNING: @nestjs/schedule and Cron Jobs
 * ==============================================
 * A "cron job" is a task that runs automatically on a schedule.
 * The name "cron" comes from the Unix cron daemon (chronos = time in Greek).
 *
 * Cron expressions have 5 (or 6) space-separated fields:
 *
 *   ┌─────── Minute (0–59)
 *   │ ┌───── Hour (0–23)
 *   │ │ ┌─── Day of Month (1–31)
 *   │ │ │ ┌─ Month (1–12)
 *   │ │ │ │ ┌ Day of Week (0–7, 0 and 7 = Sunday)
 *   │ │ │ │ │
 *   * * * * *
 *
 * Examples:
 *   '0 2 * * *'    → Every day at 2:00 AM
 *   '0 8 * * 1'    → Every Monday at 8:00 AM
 *   '0,30 * * * *' → Every 30 minutes (use comma syntax, not star-slash inside JSDoc)
 *   '0 0 1 * *'    → First day of every month at midnight
 *
 * KEY LEARNING: Why not use setInterval()?
 * ==========================================
 * setInterval() fires relative to when the app started.
 * If the app restarted at 1:59 AM, a 24-hour setInterval would fire at
 * 1:59 AM the NEXT DAY — not at the intended 2:00 AM.
 *
 * Cron expressions are ABSOLUTE schedule points (like a real clock alarm).
 * The @Cron decorator uses the `cron` package to compute the next run time
 * from the current wall clock — app restarts don't shift the schedule.
 *
 * KEY LEARNING: Redis SCAN vs KEYS
 * ==================================
 * Redis has two ways to find keys matching a pattern:
 *
 * KEYS cart:user:*  → Returns ALL matching keys AT ONCE
 *   ✓ Simple one-liner
 *   ✗ BLOCKS Redis while scanning (O(N) where N = total keys in DB)
 *   ✗ If you have 1M keys, Redis is unresponsive during the scan
 *   ✗ NEVER use in production
 *
 * SCAN cursor MATCH cart:user:* COUNT 100 → Returns keys in BATCHES
 *   ✓ Non-blocking (releases control between batches)
 *   ✓ Safe for production (other commands execute between batches)
 *   ✓ COUNT 100 is a hint (Redis may return more or fewer per batch)
 *   ✓ Iterate until cursor returns '0' (full scan complete)
 *
 * The SCAN command uses a cursor: start with '0', Redis returns a
 * new cursor each call. When the returned cursor is '0' again, you've
 * iterated all keys. (It's like pagination for key iteration.)
 *
 * KEY LEARNING: Cart data never needs manual deletion
 * ====================================================
 * Redis TTL already handles cart expiry automatically:
 *   cart:user:{userId}    → 30-day TTL (authenticated users)
 *   cart:session:{id}     → 7-day TTL (anonymous sessions)
 *
 * When the TTL expires, Redis deletes the key automatically.
 * We don't need to write delete logic here.
 *
 * This job's purpose is REPORTING:
 *   - How many active carts are there?
 *   - How many total items?
 *   - Business insight: high cart count = engaged users
 *
 * In production, this report would go to a monitoring dashboard or Slack.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type Redis from 'ioredis';

@Injectable()
export class CartCleanupJob {
  private readonly logger = new Logger(CartCleanupJob.name);

  constructor(
    /**
     * KEY LEARNING: Injecting the Global Redis client
     * =================================================
     * RedisModule (in src/redis/redis.module.ts) is decorated with @Global().
     * That means its exports are available EVERYWHERE without importing the module.
     *
     * The token 'REDIS_CLIENT' is the string identifier used in:
     *   provide: 'REDIS_CLIENT' (in RedisModule)
     *
     * We use @Inject('REDIS_CLIENT') to inject it by token rather than by class.
     * (You use @Inject('TOKEN') for non-class providers like string/factory providers)
     */
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Daily cart report — runs every day at 2:00 AM.
   *
   * CronExpression.EVERY_DAY_AT_2AM is a helper constant from @nestjs/schedule.
   * Under the hood it's just the string '0 2 * * *'.
   * Using the enum makes the intent self-documenting.
   *
   * The `name` option gives this job an identifier so you can:
   * - Find it in logs
   * - Stop it programmatically (SchedulerRegistry.deleteCronJob('cart-cleanup'))
   * - Monitor it via admin dashboards
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'cart-cleanup' })
  async reportCartStats(): Promise<void> {
    this.logger.log('Cart cleanup job started — scanning Redis cart keys...');

    const startTime = Date.now();
    let totalCarts = 0;
    let totalItems = 0;
    let totalEstimatedValue = 0;

    /**
     * Redis SCAN cursor loop.
     *
     * KEY LEARNING: The cursor pattern
     * ==================================
     * SCAN starts with cursor '0'.
     * Each call returns [nextCursor, keys].
     * When nextCursor is '0', the full scan is complete.
     *
     * This loop may run many iterations for large datasets.
     * Each iteration is non-blocking — other Redis operations run between them.
     *
     *   Iteration 1: SCAN 0 MATCH cart:user:* COUNT 100 → returns [cursor2, [key1, key2,...]]
     *   Iteration 2: SCAN cursor2 MATCH cart:user:* COUNT 100 → returns [cursor3, [...]]
     *   ...
     *   Final: SCAN cursorN MATCH cart:user:* COUNT 100 → returns ['0', [...]] ← done!
     *
     * Note: COUNT 100 is a HINT to Redis, not a guarantee.
     * Redis may return 50 or 150 keys in any given batch.
     */
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'cart:user:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length === 0) continue;

      totalCarts += keys.length;

      // For each cart key, read its items
      for (const cartKey of keys) {
        /**
         * HGETALL returns the entire hash as an object:
         * { 'product-uuid-1': '{"name":"Burger",...}', 'product-uuid-2': '...' }
         *
         * The value is the JSON-serialized CartItem.
         * We parse it to get the quantity and price for the report.
         */
        const items = await this.redis.hgetall(cartKey);
        if (!items) continue;

        const itemEntries = Object.values(items);
        totalItems += itemEntries.length;

        for (const itemJson of itemEntries) {
          try {
            const item = JSON.parse(itemJson) as {
              price?: number;
              quantity?: number;
              subtotal?: number;
            };
            // Use subtotal if available, otherwise compute from price × quantity
            if (item.subtotal) {
              totalEstimatedValue += item.subtotal;
            } else if (item.price && item.quantity) {
              totalEstimatedValue += item.price * item.quantity;
            }
          } catch {
            // Skip malformed cart items (shouldn't happen, but be defensive)
          }
        }
      }
    } while (cursor !== '0'); // Loop until full scan complete

    const durationMs = Date.now() - startTime;

    /**
     * KEY LEARNING: Structured logging
     * ==================================
     * Instead of logging multiple separate messages, we log a single
     * structured object. This is easier to parse in log aggregators
     * (Datadog, Elasticsearch, CloudWatch) and makes dashboards simpler.
     */
    this.logger.log(
      JSON.stringify({
        event: 'cart_report',
        totalActiveCarts: totalCarts,
        totalItems,
        estimatedCartValue: `₦${totalEstimatedValue.toFixed(2)}`,
        scanDurationMs: durationMs,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
