/**
 * VendorDashboardController
 *
 * HTTP routes for vendor-specific analytics dashboard (Phase 12.2).
 * Base path: /api/v1/vendors
 *
 * Endpoint Summary:
 * ┌────────┬──────────────────────────────────┬─────────────────────────────────┐
 * │ Method │ Route                            │ Description                     │
 * ├────────┼──────────────────────────────────┼─────────────────────────────────┤
 * │ GET    │ /vendors/dashboard               │ Sales overview + active orders  │
 * │ GET    │ /vendors/products/performance    │ Products ranked by revenue      │
 * │ GET    │ /vendors/revenue                 │ Revenue trend by time period    │
 * └────────┴──────────────────────────────────┴─────────────────────────────────┘
 *
 * KEY LEARNING: Route ordering — literals before parameters
 * ==========================================================
 * NestJS (like Express) matches routes in the order they are defined.
 * If we had:
 *   GET /vendors/:id          ← catches everything
 *   GET /vendors/dashboard    ← NEVER reached (caught by :id)
 *
 * Always define LITERAL routes before PARAMETERIZED routes.
 * In this controller there's no :id route, but as a general rule:
 *   /vendors/dashboard           ← define first (literal)
 *   /vendors/products/performance ← define first (literal)
 *   /vendors/:id                 ← define last (parameter)
 *
 * The same principle is why NestJS's ReviewsController puts
 * GET /products/:productId BEFORE GET /vendors/:vendorId
 * (different params, but the order still matters within each group).
 *
 * KEY LEARNING: UserRole.VENDOR guard at class level
 * ====================================================
 * All three endpoints are vendor-only. Placing @Roles(UserRole.VENDOR) at
 * the class level means it applies to every route automatically.
 * This is cleaner than repeating the decorator on each method.
 *
 * Admins cannot access vendor dashboard endpoints even though they have
 * higher privileges. This is intentional — the dashboard is scoped to
 * the authenticated vendor's own data. An admin viewing vendor dashboards
 * would need a separate admin-level endpoint (in AdminController).
 */
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorDashboardService } from './vendor-dashboard.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Vendor Dashboard')
@ApiBearerAuth()
@Controller({ path: 'vendors', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorDashboardController {
  constructor(private readonly vendorDashboardService: VendorDashboardService) {}

  /**
   * GET /api/v1/vendors/dashboard
   *
   * Returns a complete business health snapshot for the authenticated vendor:
   *
   * {
   *   vendorId: "...",
   *   businessName: "Pizza Palace",
   *   vendorStatus: "approved",
   *   averageRating: 4.3,
   *   totalReviews: 127,
   *   totalOrders: 842,
   *   pendingOrders: 5,       ← needs action NOW
   *   totalRevenue: 48250.00,
   *   todayRevenue: 1250.00,
   *   totalProducts: 24,
   * }
   *
   * @CurrentUser() — injects the authenticated User entity from the JWT.
   * The service uses user.id to look up the VendorProfile, then queries all
   * data scoped to that vendor. The vendor can only ever see their own data.
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get vendor business health snapshot', description: 'Roles: vendor. Returns sales, orders, revenue, and rating summary.' })
  @ApiResponse({ status: 200, description: 'Vendor dashboard stats' })
  async getDashboard(@CurrentUser() user: User) {
    const stats = await this.vendorDashboardService.getVendorDashboard(user.id);
    return {
      message: 'Vendor dashboard retrieved successfully',
      data: stats,
    };
  }

  /**
   * GET /api/v1/vendors/products/performance
   *
   * Returns all vendor products ranked by revenue earned, with performance metrics.
   *
   * Example response item:
   * {
   *   id: "product-uuid",
   *   name: "Classic Margherita Pizza",
   *   price: 12.99,
   *   status: "published",
   *   rating: 4.5,
   *   reviewCount: 23,
   *   orderCount: 156,   ← denormalized counter (fast, always available)
   *   viewCount: 891,    ← denormalized counter (how many people viewed this)
   *   revenue: 2026.44,  ← computed from actual delivered order_items
   * }
   *
   * KEY LEARNING: denormalized vs computed fields
   * ==============================================
   * orderCount and viewCount are DENORMALIZED — they're stored on the Product
   * entity and updated in real-time (incremented on each order/view).
   * They're approximate but instant.
   *
   * revenue is COMPUTED on demand — it's calculated by summing order_items.subtotal
   * for this product's delivered orders. It's always accurate but requires a query.
   *
   * Using both: orderCount gives a quick "popularity" metric that's fast to
   * sort/filter by. revenue gives accurate financial data when needed.
   * Dashboard design often uses denormalized for lists, computed for detail views.
   */
  @Get('products/performance')
  @ApiOperation({ summary: 'Get products ranked by revenue', description: 'Roles: vendor' })
  @ApiResponse({ status: 200, description: 'Products with orderCount, viewCount, and revenue' })
  async getProductPerformance(@CurrentUser() user: User) {
    const products = await this.vendorDashboardService.getProductPerformance(user.id);
    return {
      message: 'Product performance metrics retrieved successfully',
      data: products,
    };
  }

  /**
   * GET /api/v1/vendors/revenue?period=weekly&startDate=2026-01-01&endDate=2026-03-31
   *
   * Returns the vendor's revenue grouped by time period — the data for a
   * revenue trend chart.
   *
   * Example response (period=daily):
   * {
   *   period: "daily",
   *   dateRange: { from: "2026-02-01", to: "2026-03-02" },
   *   summary: {
   *     totalOrders: 234,
   *     totalRevenue: 12450.00,
   *     averageRevenuePerPeriod: 400.00,
   *   },
   *   timeline: [
   *     { periodStart: "2026-02-01T00:00:00", orderCount: 7, revenue: 350.00 },
   *     { periodStart: "2026-02-02T00:00:00", orderCount: 12, revenue: 608.50 },
   *     ...
   *   ]
   * }
   *
   * KEY LEARNING: @Query() with a DTO vs individual @Query('param') calls
   * =======================================================================
   * @Query() (no key) loads ALL query params into the RevenueQueryDto class.
   * This is cleaner than:
   *   @Query('period') period?: string,
   *   @Query('startDate') startDate?: string,
   *   @Query('endDate') endDate?: string,
   *
   * With the DTO approach, NestJS validates all three together as a unit.
   * You get validation errors for all invalid fields at once (not just the first one).
   * class-transformer also handles type coercion (e.g., @Transform decorators).
   */
  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue trend by time period', description: 'Roles: vendor. Returns timeline data for a chart.' })
  @ApiResponse({ status: 200, description: 'Revenue breakdown with timeline and summary' })
  async getRevenueBreakdown(
    @CurrentUser() user: User,
    @Query() query: RevenueQueryDto,
  ) {
    const revenue = await this.vendorDashboardService.getRevenueBreakdown(
      user.id,
      query,
    );
    return {
      message: 'Revenue breakdown retrieved successfully',
      data: revenue,
    };
  }
}
