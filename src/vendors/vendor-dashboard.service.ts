/**
 * VendorDashboardService
 *
 * Business analytics for individual vendors (Phase 12.2).
 *
 * Unlike AdminService which sees the entire platform, this service is
 * SCOPED to a single vendor — every query is filtered by the vendor's own
 * `vendorId`. A vendor can only see their own data.
 *
 * KEY LEARNING: Data Scoping as Security
 * ========================================
 * Every service method takes `userId` (from the JWT) and resolves it to
 * the vendor's profile ID. Then EVERY query filters by that `vendorId`.
 *
 * This means even if a client tampers with query params (e.g., sends
 * another vendor's vendorId), the service ignores it — it always uses the
 * vendorId derived from the authenticated user's JWT.
 *
 * This is called "data scoping" or "ownership enforcement":
 * - The client proves who they are via JWT (authentication)
 * - The service derives the data scope from the identity (authorization)
 * - Queries are always scoped to that identity's data
 *
 * Compare this to the admin service where no scoping is applied —
 * admins can see everything by definition.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  VendorProfile,
  VendorStatus,
} from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { RevenueQueryDto, RevenuePeriod } from './dto/revenue-query.dto';

const PERIOD_TO_TRUNC: Record<RevenuePeriod, string> = {
  [RevenuePeriod.DAILY]: 'day',
  [RevenuePeriod.WEEKLY]: 'week',
  [RevenuePeriod.MONTHLY]: 'month',
};

@Injectable()
export class VendorDashboardService {
  private readonly logger = new Logger(VendorDashboardService.name);

  constructor(
    @InjectRepository(VendorProfile)
    private readonly vendorProfileRepo: Repository<VendorProfile>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // ====================================================================
  // DASHBOARD OVERVIEW
  // ====================================================================

  /**
   * GET /api/v1/vendors/dashboard
   *
   * Returns a single-screen summary of the vendor's business health:
   * total orders, pending orders, today's revenue, total revenue,
   * product count, and average rating.
   *
   * KEY LEARNING: CASE WHEN — Conditional Aggregation
   * ===================================================
   * We could compute totalRevenue, todayRevenue, and pendingOrders with
   * THREE separate queries. But CASE WHEN lets us compute all three
   * in a SINGLE scan of the orders table:
   *
   *   SELECT
   *     COUNT(*)                                                    AS total_orders,
   *     SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END)   AS total_revenue,
   *     SUM(CASE WHEN status = 'delivered'
   *              AND DATE(created_at) = CURRENT_DATE
   *              THEN total ELSE 0 END)                             AS today_revenue
   *   FROM orders
   *   WHERE vendor_id = :vendorId
   *
   * PostgreSQL scans each row ONCE, evaluating all CASE expressions in parallel.
   * Result: same data, 1/3 of the I/O.
   *
   * This is called "conditional aggregation" — aggregating with conditions
   * baked into the SUM/COUNT rather than adding WHERE clauses per query.
   *
   * CASE WHEN syntax:
   *   CASE
   *     WHEN <condition> THEN <value_if_true>
   *     ELSE <value_if_false>
   *   END
   *
   * Works inside SUM(), COUNT(), AVG() and any aggregate function.
   *
   * KEY LEARNING: Resolving userId → vendorId
   * ==========================================
   * The JWT contains the User.id (UUID of the user account).
   * But orders, products, and reviews reference VendorProfile.id.
   * These are different IDs.
   *
   * We must first look up the VendorProfile by userId, then use
   * vendorProfile.id for all subsequent queries. This lookup is
   * done in resolveVendorProfile() and shared across all methods.
   */
  async getVendorDashboard(userId: string): Promise<object> {
    const vendor = await this.resolveVendorProfile(userId);

    const [orderStats, pendingOrders, productCount] = await Promise.all([
      // Query 1: All-in-one order stats using CASE WHEN conditional aggregation
      // One DB scan gives us: total orders, total revenue (delivered only),
      // and today's revenue — no N+1, no multiple queries.
      this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(o.id)', 'totalOrders')
        .addSelect(
          // Conditional sum: only add to totalRevenue if the order was delivered
          `COALESCE(SUM(CASE WHEN o.status = :deliveredStatus THEN o.total ELSE 0 END), 0)`,
          'totalRevenue',
        )
        .addSelect(
          // Today's revenue: delivered AND placed today (DATE() truncates timestamp to date)
          `COALESCE(SUM(CASE WHEN o.status = :deliveredStatus AND DATE(o.createdAt) = CURRENT_DATE THEN o.total ELSE 0 END), 0)`,
          'todayRevenue',
        )
        .where('o.vendorId = :vendorId', { vendorId: vendor.id })
        .setParameter('deliveredStatus', OrderStatus.DELIVERED)
        .getRawOne<{
          totalOrders: string;
          totalRevenue: string;
          todayRevenue: string;
        }>(),

      // Query 2: Pending orders = orders that need attention right now
      // PENDING (just placed), CONFIRMED (accepted), PREPARING (cooking)
      // These are the "active" orders a vendor needs to act on.
      this.orderRepo.count({
        where: {
          vendorId: vendor.id,
          status: In([
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
          ]),
        },
      }),

      // Query 3: How many products does this vendor have listed?
      this.productRepo.count({ where: { vendorId: vendor.id } }),
    ]);

    return {
      vendorId: vendor.id,
      businessName: vendor.businessName,
      vendorStatus: vendor.status,
      averageRating: parseFloat(String(vendor.rating ?? 0)),
      totalReviews: vendor.totalReviews,
      totalOrders: parseInt(String(orderStats?.totalOrders ?? '0'), 10),
      pendingOrders,
      totalRevenue: parseFloat(String(orderStats?.totalRevenue ?? '0')),
      todayRevenue: parseFloat(String(orderStats?.todayRevenue ?? '0')),
      totalProducts: productCount,
    };
  }

  // ====================================================================
  // PRODUCT PERFORMANCE
  // ====================================================================

  /**
   * GET /api/v1/vendors/products/performance
   *
   * Returns all vendor products ranked by revenue earned.
   *
   * Each product shows:
   * - orderCount — total times ordered (denormalized field on Product, updated at order time)
   * - viewCount  — page views (denormalized field, updated on each GET /products/:id)
   * - rating     — average star rating from ProductReview
   * - revenue    — sum of delivered order subtotals for this product
   *
   * KEY LEARNING: LEFT JOIN to preserve zero-revenue products
   * ==========================================================
   * An INNER JOIN would drop products that have NEVER been ordered.
   * A new product with no orders would disappear from the list.
   *
   * LEFT JOIN keeps ALL rows from the LEFT table (products), joining
   * order_items where available. Products with no matching order_items
   * get NULL for the join columns — COALESCE turns that NULL into 0.
   *
   * Visualization:
   *   products table:   P1, P2, P3
   *   order_items:      P1-oi1, P1-oi2, P3-oi3
   *
   *   INNER JOIN result:  P1 (oi1), P1 (oi2), P3 (oi3)  ← P2 is MISSING
   *   LEFT JOIN result:   P1 (oi1), P1 (oi2), P3 (oi3), P2 (NULL) ← P2 preserved
   *
   * KEY LEARNING: JOIN condition ON clause vs WHERE clause
   * =======================================================
   * The filter `o.status = 'delivered'` is in the JOIN condition, not WHERE:
   *
   *   LEFT JOIN orders o ON o.id = oi."orderId" AND o.status = 'delivered'
   *
   * Why? Because putting it in WHERE would turn our LEFT JOIN into an INNER JOIN:
   *   WHERE o.status = 'delivered'  ← filters out NULL rows from LEFT JOIN
   *   → Products with no delivered orders disappear (behaves like INNER JOIN)
   *
   * Keeping the filter in the JOIN condition means: "join ONLY delivered order rows,
   * but still include products that had no delivered orders (with NULL join columns)."
   *
   * KEY LEARNING: Two-query strategy for complex cross-module JOINs
   * ================================================================
   * OrderItem.productId is NOT a TypeORM FK relation — it's a plain UUID column.
   * This means TypeORM has no 'oi.product' relation to JOIN through automatically.
   *
   * Strategy: Use two queries and merge in TypeScript:
   * 1. orderItemRepo query: GROUP BY productId → revenue per product
   * 2. productRepo.find: all vendor products with their metadata
   * 3. Merge: Map revenue onto each product by productId
   *
   * This avoids raw SQL column name uncertainty (no need to quote "productId")
   * and keeps each query within its entity's TypeORM context.
   */
  async getProductPerformance(userId: string): Promise<object[]> {
    const vendor = await this.resolveVendorProfile(userId);

    // Step 1: Get all vendor products
    const products = await this.productRepo.find({
      where: { vendorId: vendor.id },
      order: { createdAt: 'DESC' },
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((p) => p.id);

    // Step 2: Compute revenue per product from DELIVERED orders
    // oi.order uses the TypeORM relation (@ManyToOne(() => Order) on OrderItem)
    // This is a TypeORM entity join — TypeORM handles the column translation.
    const revenueRows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('COALESCE(SUM(oi.subtotal), 0)', 'revenue')
      .innerJoin('oi.order', 'o')                          // TypeORM relation join (safe!)
      .where('oi.productId IN (:...productIds)', { productIds })
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .groupBy('oi.productId')
      .getRawMany<{ productId: string; revenue: string }>();

    // Step 3: Build a lookup Map for O(1) access per product
    const revenueMap = new Map(
      revenueRows.map((r) => [
        r.productId,
        parseFloat(String(r.revenue ?? '0')),
      ]),
    );

    // Step 4: Merge product metadata + computed revenue, sort by revenue DESC
    return products
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(String(p.price)),
        status: p.status,
        stock: p.stock,
        rating: p.rating ? parseFloat(String(p.rating)) : null,
        reviewCount: p.reviewCount,
        orderCount: p.orderCount,   // Denormalized: updated at order time
        viewCount: p.viewCount,     // Denormalized: updated on each product view
        revenue: revenueMap.get(p.id) ?? 0,  // Computed from actual order data
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // ====================================================================
  // REVENUE BREAKDOWN
  // ====================================================================

  /**
   * GET /api/v1/vendors/revenue?period=weekly
   *
   * Returns revenue grouped by time period for trend analysis.
   *
   * KEY LEARNING: TIME-SERIES REVENUE (same concept as admin reports)
   * ==================================================================
   * DATE_TRUNC('day'/'week'/'month', timestamp) rounds each timestamp
   * DOWN to the start of its period:
   *
   *   '2026-03-15 14:37' → '2026-03-15 00:00' (day)
   *   '2026-03-15 14:37' → '2026-03-10 00:00' (week — week starts Monday)
   *   '2026-03-15 14:37' → '2026-03-01 00:00' (month)
   *
   * Grouping by this truncated timestamp puts all orders in the same
   * day/week/month into one bucket. The result is a time series array:
   *   [
   *     { periodStart: '2026-03-01', orderCount: 12, revenue: 4500.00 },
   *     { periodStart: '2026-03-02', orderCount: 8,  revenue: 2800.50 },
   *     ...
   *   ]
   *
   * This is the data format needed by any line/bar chart library
   * (Chart.js, Recharts, Victory, D3, etc.).
   *
   * The difference from the admin report: this query additionally filters
   * by vendorId, so the vendor only sees their own revenue trend.
   */
  async getRevenueBreakdown(
    userId: string,
    query: RevenueQueryDto,
  ): Promise<object> {
    const vendor = await this.resolveVendorProfile(userId);

    const period = query.period ?? RevenuePeriod.DAILY;
    const truncUnit = PERIOD_TO_TRUNC[period];
    const { start, end } = this.buildDateRange(query);

    // Reuse the same expression in SELECT and GROUP BY
    const truncExpr = `DATE_TRUNC('${truncUnit}', o.createdAt)`;

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select(truncExpr, 'period_start')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.vendorId = :vendorId', { vendorId: vendor.id })
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
      .groupBy(truncExpr)          // Group by the same expression as the SELECT
      .orderBy(truncExpr, 'ASC')   // Chronological order for charting
      .getRawMany<{
        period_start: string;
        orderCount: string;
        revenue: string;
      }>();

    // Also compute summary totals for the selected period
    const totals = rows.reduce(
      (acc, r) => ({
        totalOrders: acc.totalOrders + parseInt(String(r.orderCount), 10),
        totalRevenue:
          acc.totalRevenue + parseFloat(String(r.revenue ?? '0')),
      }),
      { totalOrders: 0, totalRevenue: 0 },
    );

    return {
      period,
      dateRange: {
        from: start.toISOString(),
        to: end.toISOString(),
      },
      summary: {
        totalOrders: totals.totalOrders,
        totalRevenue: totals.totalRevenue,
        averageRevenuePerPeriod:
          rows.length > 0 ? totals.totalRevenue / rows.length : 0,
      },
      timeline: rows.map((r) => ({
        periodStart: r.period_start,
        orderCount: parseInt(String(r.orderCount), 10),
        revenue: parseFloat(String(r.revenue ?? '0')),
      })),
    };
  }

  // ====================================================================
  // PRIVATE HELPERS
  // ====================================================================

  /**
   * Resolves a User.id to the corresponding VendorProfile.
   *
   * KEY LEARNING: Why this lookup is necessary
   * ============================================
   * The JWT carries User.id (the authentication identity).
   * But all business data (orders, products) references VendorProfile.id.
   * These are DIFFERENT IDs.
   *
   * User (auth layer):        id = "user-uuid-123"
   * VendorProfile (biz layer): id = "vendor-profile-uuid-456"
   *                             userId = "user-uuid-123" (FK to User)
   *
   * We must bridge from auth identity → business identity on every request.
   * The alternative (storing vendorProfileId in the JWT) would mean:
   * - JWT becomes stale if vendor profile is deleted/recreated
   * - Security risk if the profile is replaced but token is reused
   *
   * Fetching fresh from DB on each request is slightly slower but always accurate.
   */
  private async resolveVendorProfile(userId: string): Promise<VendorProfile> {
    const vendor = await this.vendorProfileRepo.findOne({
      where: { userId },
    });

    if (!vendor) {
      throw new NotFoundException(
        'Vendor profile not found. Please create your vendor profile first.',
      );
    }

    return vendor;
  }

  /**
   * Builds a date range for revenue queries.
   * Same logic as AdminService — see that file for detailed commentary.
   */
  private buildDateRange(query: RevenueQueryDto): { start: Date; end: Date } {
    const period = query.period ?? RevenuePeriod.DAILY;

    const end = query.endDate
      ? new Date(query.endDate)
      : (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })();

    let start: Date;
    if (query.startDate) {
      start = new Date(query.startDate);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      if (period === RevenuePeriod.DAILY) {
        start.setDate(start.getDate() - 30);
      } else if (period === RevenuePeriod.WEEKLY) {
        start.setDate(start.getDate() - 84);
      } else {
        start.setMonth(start.getMonth() - 12);
      }
    }

    return { start, end };
  }
}
