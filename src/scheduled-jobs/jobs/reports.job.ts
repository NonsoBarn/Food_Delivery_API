/**
 * ReportsJob
 *
 * Generates daily and weekly business intelligence reports.
 * Reports are logged as structured JSON (ready to pipe to Slack, email, or dashboards).
 *
 * KEY LEARNING: Two @Cron decorators on one class
 * =================================================
 * A single class can have multiple @Cron methods — each method gets its
 * own schedule. This keeps related report logic in one place rather than
 * scattering it across multiple files.
 *
 * KEY LEARNING: QueryBuilder vs find()
 * ======================================
 * TypeORM offers two query styles:
 *
 * 1. Active Record style (simple):
 *    orderRepo.find({ where: { status: 'pending' } })
 *    → Good for simple lookups by known fields
 *
 * 2. QueryBuilder (powerful):
 *    orderRepo.createQueryBuilder('o')
 *      .select('o.status', 'status')
 *      .addSelect('COUNT(*)', 'count')
 *      .groupBy('o.status')
 *      .getRawMany()
 *    → Required for GROUP BY, aggregates (COUNT, SUM, AVG), complex JOINs
 *
 * Reports always need aggregates → QueryBuilder is the right tool.
 * getRawMany() returns plain objects (not entity instances) because
 * computed columns (COUNT, SUM) have no entity field to map to.
 *
 * KEY LEARNING: Date range queries
 * ==================================
 * "Yesterday" is a date range: [start of yesterday, end of yesterday].
 * "Last week" is: [7 days ago at 00:00:00, yesterday at 23:59:59].
 *
 * TypeORM's Between(start, end) generates:
 *   WHERE "createdAt" BETWEEN $1 AND $2
 *
 * This is more readable than raw SQL and handles timezone correctly
 * when PostgreSQL columns are `timestamptz` (timestamp with timezone).
 *
 * KEY LEARNING: Why reports? Business value
 * ==========================================
 * Every food delivery platform needs to answer:
 * - How many orders did we process today?
 * - What was yesterday's revenue?
 * - How many new users signed up this week?
 * - Which order statuses are piling up? (operational health)
 *
 * Scheduled reports provide this without an admin having to log in and
 * run queries manually. They can be sent to:
 *   - A Slack channel (#daily-metrics)
 *   - A Google Sheet
 *   - An email to management
 *   - A monitoring dashboard (Datadog, Grafana)
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ReportsJob {
  private readonly logger = new Logger(ReportsJob.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Daily report — runs every day at 8:00 AM.
   *
   * Covers yesterday's activity (so management sees "what happened yesterday"
   * when they arrive at work in the morning).
   *
   * Data collected:
   * - Orders by status (are PENDING orders piling up? = vendor issue)
   * - Total orders and revenue for the day
   * - New user registrations
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'daily-report' })
  async generateDailyReport(): Promise<void> {
    this.logger.log('Generating daily business report...');

    const { start, end } = this.getYesterdayRange();

    /**
     * KEY LEARNING: Multiple parallel queries with Promise.all()
     * ============================================================
     * We need 3 independent queries for the report.
     * Running them sequentially would take 3× longer.
     * Promise.all() runs them concurrently, total time ≈ max of the three.
     */
    const [ordersByStatus, totalUsers, newUsers] = await Promise.all([
      this.getOrderStatsByDateRange(start, end),
      this.userRepo.count(),
      this.userRepo.count({
        where: { createdAt: Between(start, end) },
      }),
    ]);

    // Compute totals from the grouped result
    const totalOrders = ordersByStatus.reduce(
      (sum, row) => sum + parseInt(String(row.count), 10),
      0,
    );
    const totalRevenue = ordersByStatus.reduce(
      (sum, row) => sum + parseFloat(String(row.revenue ?? '0')),
      0,
    );

    // Log as structured JSON — ready for forwarding to Slack/email
    this.logger.log(
      JSON.stringify({
        report: 'daily',
        period: {
          from: start.toISOString(),
          to: end.toISOString(),
          label: 'Yesterday',
        },
        orders: {
          total: totalOrders,
          revenue: `₦${totalRevenue.toFixed(2)}`,
          byStatus: ordersByStatus.map((row) => ({
            status: row.status,
            count: parseInt(String(row.count), 10),
            revenue: `₦${parseFloat(String(row.revenue ?? '0')).toFixed(2)}`,
          })),
        },
        users: {
          total: totalUsers,
          newYesterday: newUsers,
        },
        generatedAt: new Date().toISOString(),
      }),
    );
  }

  /**
   * Weekly report — runs every Monday at 8:00 AM.
   *
   * 'EVERY_WEEK' fires on Monday 00:00 AM by default in @nestjs/schedule.
   * We use a custom expression '0 8 * * 1' (Monday 8 AM) for alignment
   * with the daily report.
   *
   * KEY LEARNING: 0 8 * * 1 breakdown
   * ====================================
   *   0   → minute 0
   *   8   → hour 8 (8 AM)
   *   *   → any day of month
   *   *   → any month
   *   1   → Monday (1 = Monday in cron, 0 and 7 = Sunday)
   *
   * So: "At 8:00 AM, on Mondays, every month, every year" = every Monday 8 AM.
   *
   * Covers the past 7 days (Mon–Sun), giving a complete week view.
   */
  @Cron('0 8 * * 1', { name: 'weekly-report' })
  async generateWeeklyReport(): Promise<void> {
    this.logger.log('Generating weekly business report...');

    const { start, end } = this.getLastWeekRange();

    const [ordersByStatus, newUsers] = await Promise.all([
      this.getOrderStatsByDateRange(start, end),
      this.userRepo.count({
        where: { createdAt: Between(start, end) },
      }),
    ]);

    const totalOrders = ordersByStatus.reduce(
      (sum, row) => sum + parseInt(String(row.count), 10),
      0,
    );
    const totalRevenue = ordersByStatus.reduce(
      (sum, row) => sum + parseFloat(String(row.revenue ?? '0')),
      0,
    );

    // Average revenue per order (avoid divide-by-zero)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    this.logger.log(
      JSON.stringify({
        report: 'weekly',
        period: {
          from: start.toISOString(),
          to: end.toISOString(),
          label: 'Last 7 days',
        },
        orders: {
          total: totalOrders,
          revenue: `₦${totalRevenue.toFixed(2)}`,
          averageOrderValue: `₦${avgOrderValue.toFixed(2)}`,
          byStatus: ordersByStatus.map((row) => ({
            status: row.status,
            count: parseInt(String(row.count), 10),
            revenue: `₦${parseFloat(String(row.revenue ?? '0')).toFixed(2)}`,
          })),
        },
        users: {
          newThisWeek: newUsers,
        },
        generatedAt: new Date().toISOString(),
      }),
    );
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Query orders grouped by status for a given date range.
   *
   * KEY LEARNING: createQueryBuilder with GROUP BY + aggregates
   * ==============================================================
   * Standard find() doesn't support GROUP BY.
   * createQueryBuilder gives you raw SQL power with TypeScript type safety.
   *
   * The generated SQL looks like:
   *   SELECT o.status AS status,
   *          COUNT(*) AS count,
   *          SUM(o.total) AS revenue
   *   FROM orders o
   *   WHERE o.createdAt BETWEEN :start AND :end
   *   GROUP BY o.status
   *
   * getRawMany() returns plain objects because COUNT and SUM are computed
   * columns — they don't map to entity properties.
   * Each item looks like: { status: 'pending', count: '12', revenue: '4560.00' }
   * Note: count and revenue come back as strings from PostgreSQL — parseInt/parseFloat them.
   *
   * KEY LEARNING: Named parameters (:start, :end)
   * ================================================
   * TypeORM uses :paramName syntax for named parameters.
   * This prevents SQL injection — values are passed separately from the SQL template.
   * NEVER concatenate user input into SQL strings.
   */
  private async getOrderStatsByDateRange(
    start: Date,
    end: Date,
  ): Promise<Array<{ status: string; count: string; revenue: string }>> {
    return this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue') // COALESCE handles NULL if no orders
      .where('o.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy('o.status')
      .orderBy('count', 'DESC') // Most common status first
      .getRawMany<{ status: string; count: string; revenue: string }>();
  }

  /**
   * Returns [start, end] for "yesterday" as full-day boundaries.
   *
   * KEY LEARNING: Date math without external libraries
   * ====================================================
   * Many tutorials reach for date-fns or Moment.js immediately.
   * For simple day boundaries, plain JavaScript is sufficient:
   *
   *   today = new Date()           // e.g. 2026-03-02T10:30:00Z
   *   yesterday = today - 1 day
   *
   *   startOfYesterday = yesterday at 00:00:00.000
   *   endOfYesterday   = yesterday at 23:59:59.999
   *
   * setHours(0, 0, 0, 0) sets hours, minutes, seconds, milliseconds to zero.
   * setHours(23, 59, 59, 999) sets to end of day.
   */
  private getYesterdayRange(): { start: Date; end: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const startOfYesterday = new Date(today);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1); // Go back 1 day

    const endOfYesterday = new Date(today);
    endOfYesterday.setMilliseconds(-1); // 1ms before midnight = 23:59:59.999

    return { start: startOfYesterday, end: endOfYesterday };
  }

  /**
   * Returns [start, end] for the last 7 days (Mon–Sun of last week).
   *
   * We use 7 days from today rather than Mon–Sun of the calendar week
   * to keep it simple and avoid timezone complications.
   */
  private getLastWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of 7 days ago

    return { start: sevenDaysAgo, end: now };
  }
}
