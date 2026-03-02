/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/**
 * AdminService
 *
 * Business logic for the admin dashboard (Phase 12.1).
 *
 * This service answers questions that only an admin needs:
 * - "What is the current health of the platform?" (platform stats)
 * - "Which vendors are waiting for approval?" (vendor management)
 * - "What does the last 30 days of revenue look like?" (reports)
 *
 * KEY LEARNING: Separation of Concerns
 * ======================================
 * All database queries live HERE, not in the controller.
 * The controller only handles HTTP concerns (parsing request, formatting response).
 * The service handles business logic concerns (what data to fetch, how to compute it).
 *
 * This makes the service independently testable — you can write unit tests
 * that mock the repositories and call service methods directly, without
 * starting an HTTP server.
 *
 * KEY LEARNING: Cross-module Repository Injection
 * ================================================
 * This service injects repositories for User, VendorProfile, Order, etc.
 * These entities are defined in other modules (UsersModule, OrdersModule, ProductsModule).
 * That's perfectly fine — TypeORM repositories are not owned by any single module.
 *
 * As long as AdminModule declares TypeOrmModule.forFeature([User, VendorProfile, ...]),
 * TypeORM registers those repositories in AdminModule's DI container and they
 * can be injected via @InjectRepository().
 *
 * Think of it like: the database is global, but you need to explicitly declare
 * which entity repositories you need in each module that uses them.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  VendorProfile,
  VendorStatus,
} from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CategoriesService } from '../products/categories.service';
import { UserRole } from '../common/enums/user-role.enum';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { VendorActionDto } from './dto/vendor-action.dto';
import { ReportQueryDto, ReportPeriod } from './dto/report-query.dto';
import { CreateCategoryDto } from '../products/dto/create-category.dto';
import { UpdateCategoryDto } from '../products/dto/update-category.dto';

/**
 * Maps the ReportPeriod enum to the PostgreSQL DATE_TRUNC unit string.
 *
 * KEY LEARNING: Lookup tables vs switch statements
 * ==================================================
 * Instead of:
 *   switch (period) {
 *     case 'daily': return 'day';
 *     case 'weekly': return 'week';
 *     ...
 *   }
 *
 * We use an object as a lookup table. It's more concise, data-driven,
 * and easier to extend. Adding a new period is a one-line change.
 */
const PERIOD_TO_TRUNC: Record<ReportPeriod, string> = {
  [ReportPeriod.DAILY]: 'day',
  [ReportPeriod.WEEKLY]: 'week',
  [ReportPeriod.MONTHLY]: 'month',
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(VendorProfile)
    private readonly vendorProfileRepo: Repository<VendorProfile>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    /**
     * CategoriesService is injected as a SERVICE, not a repository.
     * AdminModule imports CategoriesModule which exports CategoriesService.
     * This is the correct cross-module pattern: import the module, inject the service.
     *
     * KEY LEARNING: When to inject a service vs a repository
     * ========================================================
     * Inject a REPOSITORY when you want direct DB access with custom queries.
     * Inject a SERVICE when you want to reuse existing business logic
     * (CategoriesService already has validation, slug generation, etc.).
     * Reusing the service avoids duplicating those business rules in AdminService.
     */
    private readonly categoriesService: CategoriesService,
  ) {}

  // ====================================================================
  // PLATFORM STATISTICS
  // ====================================================================

  /**
   * GET /api/v1/admin/stats
   *
   * Returns a comprehensive snapshot of platform health in one call.
   *
   * KEY LEARNING: Promise.all() for parallel database queries
   * ==========================================================
   * We need 4 independent pieces of data. Running them sequentially:
   *   const a = await queryA(); // 50ms
   *   const b = await queryB(); // 50ms
   *   const c = await queryC(); // 50ms
   *   const d = await queryD(); // 50ms
   *   // Total: ~200ms
   *
   * Running them in parallel with Promise.all():
   *   const [a, b, c, d] = await Promise.all([queryA(), queryB(), queryC(), queryD()]);
   *   // Total: ~50ms (the slowest query)
   *
   * Promise.all() resolves when ALL promises resolve. If any rejects,
   * it short-circuits and the entire call rejects. For a stats dashboard
   * this is fine — if any query fails, we return an error rather than
   * partial data.
   *
   * KEY LEARNING: GROUP BY for role/status distribution
   * =====================================================
   * Instead of 4 separate COUNT queries (one per role), a single query
   * with GROUP BY gives us all role counts in one round-trip:
   *
   *   SELECT role, COUNT(*) as count FROM users GROUP BY role
   *
   * PostgreSQL splits all user rows into buckets by their `role` value,
   * then counts rows in each bucket. One query, all buckets.
   */
  async getPlatformStats(): Promise<object> {
    // We need today's midnight as the start of "today" boundary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      usersByRole,
      ordersByStatus,
      todayRevenueResult,
      pendingVendorCount,
    ] = await Promise.all([
      // Query 1: Count users grouped by their role
      // GROUP BY splits rows into buckets by role value, COUNT(*) counts each bucket
      this.userRepo
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('u.role')
        .getRawMany<{ role: string; count: string }>(),

      // Query 2: Count orders + sum revenue, grouped by order status
      // This tells us: how many orders are pending? how much revenue from delivered?
      // COALESCE(SUM(o.total), 0) — if no orders exist, SUM returns NULL, COALESCE converts it to 0
      this.orderRepo
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
        .groupBy('o.status')
        .orderBy('count', 'DESC')
        .getRawMany<{ status: string; count: string; revenue: string }>(),

      // Query 3: Today's revenue (delivered orders placed today)
      //
      // KEY LEARNING: getRawOne() vs getRawMany()
      // ==========================================
      // getRawMany() → array of rows (used with GROUP BY)
      // getRawOne()  → single row or undefined (used for a single aggregate)
      //
      // Always use optional chaining: rawResult?.revenue ?? '0'
      // because if no delivered orders exist today, getRawOne() returns undefined.
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total), 0)', 'revenue')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.createdAt >= :todayStart', { todayStart })
        .getRawOne<{ revenue: string }>(),

      // Query 4: Simple count — no QueryBuilder needed for a single WHERE condition
      this.vendorProfileRepo.count({
        where: { status: VendorStatus.PENDING },
      }),
    ]);

    // Compute all-time total revenue from the delivered orders bucket
    const deliveredRow = ordersByStatus.find(
      (r) => r.status === OrderStatus.DELIVERED,
    );
    const totalRevenue = parseFloat(String(deliveredRow?.revenue ?? '0'));

    return {
      usersByRole: usersByRole.map((r) => ({
        role: r.role,
        count: parseInt(String(r.count), 10),
      })),
      ordersByStatus: ordersByStatus.map((r) => ({
        status: r.status,
        count: parseInt(String(r.count), 10),
        revenue: parseFloat(String(r.revenue ?? '0')),
      })),
      todayRevenue: parseFloat(String(todayRevenueResult?.revenue ?? '0')),
      totalRevenue,
      pendingVendorApplications: pendingVendorCount,
    };
  }

  // ====================================================================
  // VENDOR MANAGEMENT
  // ====================================================================

  /**
   * GET /api/v1/admin/vendors
   *
   * Returns a paginated, optionally filtered list of all vendors.
   *
   * KEY LEARNING: Pagination with skip/take (Offset Pagination)
   * ============================================================
   * Loading ALL vendors at once is a "memory bomb" — as the platform grows,
   * this query could return thousands of rows.
   *
   * Pagination loads only a window of results:
   *   Page 1, limit 20: OFFSET 0,  LIMIT 20  → rows 1-20
   *   Page 2, limit 20: OFFSET 20, LIMIT 20  → rows 21-40
   *   Page 3, limit 20: OFFSET 40, LIMIT 20  → rows 41-60
   *
   * Formula: skip = (page - 1) * limit
   *
   * getManyAndCount() runs TWO queries internally:
   *   1. SELECT ... LIMIT :take OFFSET :skip   — the data rows
   *   2. SELECT COUNT(*) FROM ...              — total count (for pagination meta)
   *
   * The client uses `total` to compute: totalPages = Math.ceil(total / limit)
   * This lets them render pagination UI ("Page 3 of 47").
   *
   * KEY LEARNING: Partial column select to exclude sensitive data
   * =============================================================
   * By default, TypeORM loads ALL columns including hashed passwords.
   * Returning hashed passwords to an admin API is a security risk —
   * even if the admin can't reverse the hash, there's no need to send it.
   *
   * .select(['vendor', 'user.id', 'user.email', 'user.role', 'user.createdAt'])
   *
   * 'vendor' → include all VendorProfile columns
   * 'user.id', 'user.email', ... → include ONLY these User columns
   * 'user.password' is NOT in the list → never sent in the response
   */
  async getVendors(
    status?: VendorStatus,
    page = 1,
    limit = 20,
  ): Promise<{
    vendors: VendorProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const qb = this.vendorProfileRepo
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.user', 'user')
      // Partial select: include ALL vendor columns, but only SAFE user columns
      .select([
        'vendor',
        'user.id',
        'user.email',
        'user.role',
        'user.createdAt',
      ])
      .orderBy('vendor.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Only add WHERE clause if a status filter was provided
    if (status) {
      qb.where('vendor.status = :status', { status });
    }

    const [vendors, total] = await qb.getManyAndCount();

    return {
      vendors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /api/v1/admin/vendors/:id
   *
   * Returns a single vendor's full profile enriched with aggregate stats.
   *
   * KEY LEARNING: "Load entity + enrich with aggregates" pattern
   * =============================================================
   * We want the vendor's profile data AND some computed stats
   * (product count, total revenue from that vendor's orders).
   *
   * Two approaches:
   *
   * A) Store counts as columns (denormalized):
   *    Pro: Fast — no extra queries
   *    Con: Hard to keep in sync — need to update count on every product change
   *
   * B) Compute on demand (this approach):
   *    Pro: Always accurate — computed from real data
   *    Con: Slightly slower — requires extra queries
   *    Pro: For admin detail pages (infrequent), the extra queries are acceptable
   *
   * We run the entity load and aggregate queries in parallel with Promise.all()
   * to minimize total response time.
   */
  async getVendorById(id: string): Promise<object> {
    const [vendor, productCount, orderStats] = await Promise.all([
      // Load vendor profile with safe user fields only (no password hash)
      // Using QueryBuilder with explicit .select() to exclude the password column —
      // the same pattern as getVendors(). findOne({ relations: ['user'] }) would
      // load ALL user columns including the hashed password.
      this.vendorProfileRepo
        .createQueryBuilder('vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .select([
          'vendor',
          'user.id',
          'user.email',
          'user.role',
          'user.createdAt',
        ])
        .where('vendor.id = :id', { id })
        .getOne(),

      // Count how many products this vendor has listed
      this.productRepo.count({ where: { vendorId: id } }),

      // Aggregate delivered orders: how many orders and total revenue?
      // getRawOne() — single aggregate across all matching rows, no GROUP BY needed
      this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(o.id)', 'totalOrders')
        .addSelect('COALESCE(SUM(o.total), 0)', 'totalRevenue')
        .where('o.vendorId = :id', { id })
        .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne<{ totalOrders: string; totalRevenue: string }>(),
    ]);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Merge the entity with the computed aggregates into one response object
    return {
      ...vendor,
      productCount,
      totalOrders: parseInt(String(orderStats?.totalOrders ?? '0'), 10),
      totalRevenue: parseFloat(String(orderStats?.totalRevenue ?? '0')),
    };
  }

  /**
   * PATCH /api/v1/admin/vendors/:id/status
   *
   * Approve, reject, or suspend a vendor account.
   *
   * KEY LEARNING: Audit Trail Fields (approvedAt, approvedBy)
   * ==========================================================
   * When changing a critical status, record:
   *   - WHO made the change (approvedBy = admin's user ID)
   *   - WHEN it happened  (approvedAt = timestamp)
   *
   * This creates accountability. If a vendor disputes a rejection,
   * you can see which admin did it and when. If a vendor was suspended
   * while a different admin approved them, the audit trail shows the conflict.
   *
   * approvedBy stores the admin's User.id (UUID string), not the full
   * User object. Just enough to trace the action without needing a JOIN.
   *
   * KEY LEARNING: Conditional Field Updates
   * =========================================
   * Each status transition updates different fields:
   *   APPROVED  → set approvedAt + approvedBy + clear rejectionReason
   *   REJECTED  → set rejectionReason + clear approvedAt/approvedBy
   *   SUSPENDED → clear approvedAt/approvedBy (the approval is revoked)
   *
   * Why clear fields on transition? To avoid stale data:
   * If a vendor is approved then suspended, approvedAt should be null
   * (the approval is no longer valid). If they're later re-approved,
   * it gets a fresh approvedAt timestamp.
   */
  async updateVendorStatus(
    id: string,
    dto: VendorActionDto,
    adminUserId: string,
  ): Promise<VendorProfile> {
    const vendor = await this.vendorProfileRepo.findOne({ where: { id } });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Prevent re-applying the same status (no-op prevention)
    if (vendor.status === dto.status) {
      throw new BadRequestException(
        `Vendor is already in '${dto.status}' status`,
      );
    }

    // Apply status-specific field changes
    vendor.status = dto.status;

    /**
     * KEY LEARNING: Object.assign() for nullable DB fields
     * =====================================================
     * The VendorProfile entity declares approvedAt as `Date` and approvedBy/
     * rejectionReason as `string` (non-nullable TS types), even though they're
     * marked nullable: true in the @Column() decorator for the DB.
     *
     * TypeScript won't allow `vendor.approvedAt = null` because `null` is not
     * assignable to `Date`. But we need to set them to NULL in the database.
     *
     * Object.assign() bypasses TypeScript's property assignment type checking
     * at the call site. It's a runtime operation, so TypeScript only checks
     * that the source object is compatible, not each individual field.
     *
     * This is a pragmatic workaround for the mismatch between TS types (strict)
     * and DB column definitions (nullable: true). Proper fix would be declaring
     * entity fields as `Date | null` and `string | null` in the entity class.
     */
    if (dto.status === VendorStatus.APPROVED) {
      vendor.approvedAt = new Date();
      vendor.approvedBy = adminUserId; // Which admin approved
      // Clear any previous rejection reason (DB NULL via Object.assign workaround)
      Object.assign(vendor, { rejectionReason: null });
    } else if (dto.status === VendorStatus.REJECTED) {
      // @ValidateIf in VendorActionDto already ensures rejectionReason is present
      vendor.rejectionReason = dto.rejectionReason!;
      // Approval is revoked — clear audit fields
      Object.assign(vendor, { approvedAt: null, approvedBy: null });
    } else if (dto.status === VendorStatus.SUSPENDED) {
      // Suspension revokes approval (vendor can no longer sell)
      Object.assign(vendor, { approvedAt: null, approvedBy: null });
    }

    this.logger.log(
      `Admin ${adminUserId} changed vendor ${id} status: ${vendor.status} → ${dto.status}`,
    );

    return this.vendorProfileRepo.save(vendor);
  }

  // ====================================================================
  // USER MANAGEMENT
  // ====================================================================

  /**
   * GET /api/v1/admin/users
   *
   * Returns a paginated list of all users, with optional role filter.
   *
   * KEY LEARNING: Never return password hashes in API responses
   * ============================================================
   * Even if bcrypt hashes are computationally hard to reverse,
   * there's no reason to expose them. An API should return the
   * minimum information needed by the consumer.
   *
   * With QueryBuilder .select(['user.id', 'user.email', 'user.role', 'user.createdAt']),
   * TypeORM only populates those properties on the returned entities.
   * user.password will be undefined — it never leaves the database.
   *
   * This principle is called "principle of least privilege" applied to data:
   * return only what the client needs, nothing more.
   */
  async getAllUsers(
    role?: UserRole,
    page = 1,
    limit = 20,
  ): Promise<{
    users: Partial<User>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      // Select only safe fields — password hash is intentionally excluded
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.createdAt',
        'user.updatedAt',
      ])
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (role) {
      qb.where('user.role = :role', { role });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ====================================================================
  // REPORTS
  // ====================================================================

  /**
   * GET /api/v1/admin/reports
   *
   * On-demand report generation for any date range and period granularity.
   *
   * KEY LEARNING: DATE_TRUNC — Time-Series Grouping in PostgreSQL
   * ==============================================================
   * To group revenue data by day/week/month, we use PostgreSQL's DATE_TRUNC function:
   *
   *   DATE_TRUNC('day', created_at)
   *
   * This rounds a timestamp DOWN to the start of the given period:
   *   '2026-03-15 14:37:22' → '2026-03-15 00:00:00' (day)
   *   '2026-03-15 14:37:22' → '2026-03-09 00:00:00' (week — truncates to Mon)
   *   '2026-03-15 14:37:22' → '2026-03-01 00:00:00' (month)
   *
   * By GROUP BY DATE_TRUNC('day', created_at), all orders on March 15th
   * end up in the same bucket regardless of their exact time. This gives us
   * a time series: [day1: $X, day2: $Y, day3: $Z, ...]
   *
   * This is the standard pattern for any "revenue over time" chart in
   * e-commerce, SaaS, analytics dashboards — everywhere.
   *
   * KEY LEARNING: Why not a named parameter for the trunc unit?
   * ============================================================
   * You might wonder: why use a template literal for 'day'/'week'/'month'
   * instead of a named parameter like :truncUnit?
   *
   * PostgreSQL's DATE_TRUNC requires the unit to be a string LITERAL
   * in the SQL source, not a bind parameter:
   *   DATE_TRUNC($1, created_at)    — INVALID (PostgreSQL won't accept this)
   *   DATE_TRUNC('day', created_at) — VALID
   *
   * Template literals are safe here because `truncUnit` comes from our
   * PERIOD_TO_TRUNC lookup (controlled values from an enum) — it CANNOT
   * be user input. User input → enum validation → trusted lookup key.
   * Never use template literals with raw user-provided strings.
   */
  async generateReport(query: ReportQueryDto): Promise<object> {
    const period = query.period ?? ReportPeriod.DAILY;
    const truncUnit = PERIOD_TO_TRUNC[period];

    // Build the date range — defaults if not provided by query params
    const { start, end } = this.buildDateRange(query);

    // Key expression reused in both SELECT and GROUP BY
    // DATE_TRUNC groups orders by the start of their day/week/month
    const truncExpr = `DATE_TRUNC('${truncUnit}', o.createdAt)`;

    const [revenueTimeline, ordersByStatus, topVendors] = await Promise.all([
      // Query 1: Revenue grouped by time period
      // This produces the data for a line/bar chart over time
      this.orderRepo
        .createQueryBuilder('o')
        .select(truncExpr, 'period_start') // e.g. '2026-03-01 00:00:00'
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
        .groupBy(truncExpr) // Must match the SELECT expression
        .orderBy(truncExpr, 'ASC') // Chronological order
        .getRawMany<{
          period_start: string;
          orderCount: string;
          revenue: string;
        }>(),

      // Query 2: Orders grouped by status in this period
      // Tells us: how many orders were pending/delivered/cancelled in the date range?
      this.orderRepo
        .createQueryBuilder('o')
        .select('o.status', 'status')
        .addSelect('COUNT(o.id)', 'count')
        .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
        .where('o.createdAt BETWEEN :start AND :end', { start, end })
        .groupBy('o.status')
        .orderBy('count', 'DESC')
        .getRawMany<{ status: string; count: string; revenue: string }>(),

      // Query 3: Top 10 vendors by revenue in the period
      //
      // KEY LEARNING: JOIN within QueryBuilder
      // ========================================
      // 'o.vendor' refers to the TypeORM relation defined on the Order entity:
      //   @ManyToOne(() => VendorProfile, ...) vendor: VendorProfile
      //
      // TypeORM translates this to a JOIN using the FK column (vendorId).
      // This is safer than a raw JOIN because TypeORM handles the column
      // name translation automatically.
      //
      // We JOIN to get vendor.businessName — stored in vendor_profiles table,
      // not in orders. GROUP BY o.vendorId + vendor.businessName ensures each
      // vendor is one bucket (they share the same businessName).
      this.orderRepo
        .createQueryBuilder('o')
        .select('o.vendorId', 'vendorId')
        .addSelect('vendor.businessName', 'businessName')
        .addSelect('COUNT(o.id)', 'orderCount')
        .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
        .innerJoin('o.vendor', 'vendor')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.createdAt BETWEEN :start AND :end', { start, end })
        .groupBy('o.vendorId')
        .addGroupBy('vendor.businessName')
        .orderBy('revenue', 'DESC')
        .limit(10)
        .getRawMany<{
          vendorId: string;
          businessName: string;
          orderCount: string;
          revenue: string;
        }>(),
    ]);

    return {
      period,
      dateRange: {
        from: start.toISOString(),
        to: end.toISOString(),
      },
      revenueTimeline: revenueTimeline.map((r) => ({
        periodStart: r.period_start,
        orderCount: parseInt(String(r.orderCount), 10),
        revenue: parseFloat(String(r.revenue ?? '0')),
      })),
      ordersByStatus: ordersByStatus.map((r) => ({
        status: r.status,
        count: parseInt(String(r.count), 10),
        revenue: parseFloat(String(r.revenue ?? '0')),
      })),
      topVendors: topVendors.map((r) => ({
        vendorId: r.vendorId,
        businessName: r.businessName,
        orderCount: parseInt(String(r.orderCount), 10),
        revenue: parseFloat(String(r.revenue ?? '0')),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  // ====================================================================
  // CATEGORY MANAGEMENT (delegate to CategoriesService)
  // ====================================================================

  /**
   * Admin category management delegates to CategoriesService.
   *
   * KEY LEARNING: Why delegate instead of duplicate?
   * =================================================
   * CategoriesService already has full business logic:
   * - Slug generation (unique, URL-safe)
   * - Circular reference prevention
   * - 2-level max depth enforcement
   * - Soft delete (isActive = false)
   *
   * If we duplicated that logic in AdminService, we'd have two places
   * to maintain it — a violation of DRY (Don't Repeat Yourself).
   *
   * The admin-specific behavior is:
   * - Different route prefix (/admin/categories vs /categories)
   * - Passing includeInactive=true to see ALL categories (not just active)
   * - Future: could add admin-specific validation or audit logging
   *
   * This is the "thin admin layer" pattern: admin routes provide access
   * control and route namespacing, but delegate business logic to the
   * same services that power the public routes.
   */

  /** Returns ALL categories including inactive ones (for admin management) */
  async getAllCategories() {
    return this.categoriesService.findAll(true); // includeInactive = true
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  async deleteCategory(id: string) {
    return this.categoriesService.remove(id);
  }

  // ====================================================================
  // PRIVATE HELPERS
  // ====================================================================

  /**
   * Builds a date range for report queries.
   *
   * If the user provided explicit startDate/endDate, use those.
   * Otherwise, apply sensible defaults based on the period:
   * - daily:   last 30 days
   * - weekly:  last 12 weeks (84 days)
   * - monthly: last 12 months
   *
   * KEY LEARNING: Why defaults based on period?
   * =============================================
   * For a daily breakdown chart, 30 data points (one per day) is readable.
   * For a monthly chart, 12 months shows a full year trend.
   * Too many data points make charts unreadable. Period-appropriate defaults
   * give good charts without requiring the user to always specify dates.
   */
  private buildDateRange(query: ReportQueryDto): { start: Date; end: Date } {
    const period = query.period ?? ReportPeriod.DAILY;

    // End defaults to end of today
    const end = query.endDate
      ? new Date(query.endDate)
      : (() => {
          const d = new Date();
          d.setHours(23, 59, 59, 999);
          return d;
        })();

    // Start defaults based on period if not explicitly provided
    let start: Date;
    if (query.startDate) {
      start = new Date(query.startDate);
    } else {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      if (period === ReportPeriod.DAILY) {
        start.setDate(start.getDate() - 30); // Last 30 days
      } else if (period === ReportPeriod.WEEKLY) {
        start.setDate(start.getDate() - 84); // Last 12 weeks (12 * 7 = 84 days)
      } else {
        start.setMonth(start.getMonth() - 12); // Last 12 months
      }
    }

    return { start, end };
  }
}
