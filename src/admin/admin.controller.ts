/**
 * AdminController
 *
 * HTTP routes for all admin dashboard operations (Phase 12.1).
 * Base path: /api/v1/admin
 *
 * Endpoint Summary:
 * ┌────────┬─────────────────────────────┬───────────────────────────────────────┐
 * │ Method │ Route                       │ Description                           │
 * ├────────┼─────────────────────────────┼───────────────────────────────────────┤
 * │ GET    │ /admin/stats                │ Platform overview statistics          │
 * │ GET    │ /admin/vendors              │ List vendors (paginated, filterable)  │
 * │ GET    │ /admin/vendors/:id          │ Single vendor detail + stats          │
 * │ PATCH  │ /admin/vendors/:id/status   │ Approve / reject / suspend vendor     │
 * │ GET    │ /admin/users                │ List users (paginated, filterable)    │
 * │ GET    │ /admin/reports              │ On-demand revenue report              │
 * │ GET    │ /admin/categories           │ All categories (including inactive)   │
 * │ POST   │ /admin/categories           │ Create a new category                 │
 * │ PATCH  │ /admin/categories/:id       │ Update a category                     │
 * │ DELETE │ /admin/categories/:id       │ Soft-delete a category                │
 * └────────┴─────────────────────────────┴───────────────────────────────────────┘
 *
 * KEY LEARNING: Class-level vs method-level guards
 * ==================================================
 * By placing @UseGuards(JwtAuthGuard, RolesGuard) and @Roles(UserRole.ADMIN)
 * at the CLASS level (not method level), they apply to EVERY route in this
 * controller. We don't need to repeat them on each method.
 *
 * This is the correct approach when ALL routes in a controller need the same
 * auth level. Compare to ReviewsController where some routes are public and
 * some are protected — there, guards must be at the METHOD level.
 *
 * Guard execution order:
 *   1. JwtAuthGuard  — validates the Bearer token → populates req.user
 *      If invalid: 401 Unauthorized
 *   2. RolesGuard    — checks req.user.role against @Roles() metadata
 *      If not ADMIN: 403 Forbidden
 *
 * Non-admins get 401 (if no/invalid token) or 403 (if authenticated but wrong role).
 *
 * KEY LEARNING: @Controller version
 * ====================================
 * version: '1' maps this controller to /api/v1/admin/...
 * NestJS's enableVersioning() (configured in main.ts) prepends the /v1 segment.
 * This allows us to later create AdminController v2 without breaking existing clients.
 */
import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { VendorActionDto } from './dto/vendor-action.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { VendorStatus } from '../users/entities/vendor-profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateCategoryDto } from '../products/dto/create-category.dto';
import { UpdateCategoryDto } from '../products/dto/update-category.dto';

@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ================================================================
  // PLATFORM STATISTICS
  // ================================================================

  /**
   * GET /api/v1/admin/stats
   *
   * Returns platform-wide health metrics:
   * - Users by role count
   * - Orders by status (count + revenue per status)
   * - Today's revenue
   * - Total all-time revenue (from delivered orders)
   * - Count of pending vendor applications
   *
   * No query params — this is a fixed snapshot of "right now."
   */
  @Get('stats')
  async getPlatformStats() {
    const stats = await this.adminService.getPlatformStats();
    return {
      message: 'Platform statistics retrieved successfully',
      data: stats,
    };
  }

  // ================================================================
  // VENDOR MANAGEMENT
  // ================================================================

  /**
   * GET /api/v1/admin/vendors?status=pending&page=1&limit=20
   *
   * Paginated list of all vendors.
   *
   * KEY LEARNING: Optional query params with defaults
   * ==================================================
   * @Query('status') status?: VendorStatus
   *   - If ?status=pending is in the URL: status = 'pending'
   *   - If ?status is absent: status = undefined (no filter applied)
   *
   * The default values (page=1, limit=20) in the service handle the
   * case where the client doesn't specify them.
   *
   * KEY LEARNING: ParseIntPipe is not used here — why?
   * =====================================================
   * NestJS's @Query() returns strings. We're passing them to service
   * which uses parseInt() internally. Alternatively, you could use:
   *   @Query('page', new ParseIntPipe({ optional: true })) page?: number
   * Both approaches work. For optional integers, parsing in the service
   * is simpler because ParseIntPipe throws if the value is present but
   * non-numeric — which may not be the UX you want for optional params.
   */
  @Get('vendors')
  async getVendors(
    @Query('status') status?: VendorStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getVendors(
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      message: 'Vendors retrieved successfully',
      ...result,
    };
  }

  /**
   * GET /api/v1/admin/vendors/:id
   *
   * Full vendor detail with enriched stats:
   * - All profile fields (businessName, status, rating, etc.)
   * - productCount — how many products listed
   * - totalOrders — delivered orders count
   * - totalRevenue — sum of all delivered order totals
   *
   * @ParseUUIDPipe ensures the :id parameter is a valid UUID format.
   * If a client sends /admin/vendors/not-a-uuid, NestJS returns 400
   * before the request even reaches the controller method.
   *
   * KEY LEARNING: @ParseUUIDPipe
   * ==============================
   * Route parameters arrive as plain strings. UUIDs have a specific format:
   * 8-4-4-4-12 hex characters (e.g., "123e4567-e89b-12d3-a456-426614174000").
   * ParseUUIDPipe validates this format and throws 400 if invalid.
   *
   * Without it, an invalid UUID would reach TypeORM which would throw
   * a Postgres error — less clear for the client.
   */
  @Get('vendors/:id')
  async getVendorById(@Param('id', ParseUUIDPipe) id: string) {
    const vendor = await this.adminService.getVendorById(id);
    return {
      message: 'Vendor retrieved successfully',
      data: vendor,
    };
  }

  /**
   * PATCH /api/v1/admin/vendors/:id/status
   *
   * Update a vendor's approval status.
   * Body: { status: 'approved' | 'rejected' | 'suspended', rejectionReason?: string }
   *
   * @CurrentUser() injects the authenticated admin's User entity.
   * We pass user.id to the service so it can record WHO made this change
   * in the vendor's approvedBy field (audit trail).
   *
   * Business rules enforced in service:
   * - status=rejected requires rejectionReason (enforced by @ValidateIf in DTO)
   * - status=approved sets approvedAt + approvedBy
   * - Cannot set same status that already exists (no-op prevention)
   *
   * Returns 200 (default for PATCH) — the vendor record was updated, not created.
   */
  @Patch('vendors/:id/status')
  async updateVendorStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VendorActionDto,
    @CurrentUser() admin: User,
  ) {
    const vendor = await this.adminService.updateVendorStatus(id, dto, admin.id);
    return {
      message: `Vendor status updated to '${dto.status}' successfully`,
      data: vendor,
    };
  }

  // ================================================================
  // USER MANAGEMENT
  // ================================================================

  /**
   * GET /api/v1/admin/users?role=customer&page=1&limit=20
   *
   * Paginated list of all users (NO password hashes in response).
   *
   * Filter by role with ?role=customer|vendor|rider|admin
   * Omit ?role to get all users regardless of role.
   */
  @Get('users')
  async getAllUsers(
    @Query('role') role?: UserRole,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adminService.getAllUsers(
      role,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return {
      message: 'Users retrieved successfully',
      ...result,
    };
  }

  // ================================================================
  // REPORTS
  // ================================================================

  /**
   * GET /api/v1/admin/reports?period=monthly&startDate=2026-01-01&endDate=2026-03-31
   *
   * On-demand analytics report for any date range.
   *
   * Query params:
   *   period    — 'daily' | 'weekly' | 'monthly' (default: 'daily')
   *   startDate — ISO date string (default: 30/84 days or 12 months ago)
   *   endDate   — ISO date string (default: today)
   *
   * Response includes:
   *   revenueTimeline  — array of {periodStart, orderCount, revenue} for each time bucket
   *   ordersByStatus   — aggregate orders/revenue per status in the range
   *   topVendors       — top 10 vendors by revenue in the range
   *
   * KEY LEARNING: @Query() with a DTO class
   * =========================================
   * @Query() without specifying a key loads ALL query params into the DTO.
   * class-validator + class-transformer then validate and transform them.
   * This is cleaner than @Query('period'), @Query('startDate'), etc. separately.
   */
  @Get('reports')
  async generateReport(@Query() query: ReportQueryDto) {
    const report = await this.adminService.generateReport(query);
    return {
      message: 'Report generated successfully',
      data: report,
    };
  }

  // ================================================================
  // CATEGORY MANAGEMENT
  // ================================================================

  /**
   * GET /api/v1/admin/categories
   *
   * Returns ALL categories including inactive ones.
   * Public /api/v1/categories only returns active categories.
   * Admin needs to see everything for management purposes.
   *
   * KEY LEARNING: Why not just add ?includeInactive=true to the public endpoint?
   * ==============================================================================
   * Because then we'd need auth on a public endpoint, complicating the guard logic.
   * Keeping admin routes under /admin with blanket auth is cleaner.
   * The admin endpoint and the public endpoint serve different audiences
   * with different requirements — keeping them separate respects that.
   */
  @Get('categories')
  async getAllCategories() {
    const categories = await this.adminService.getAllCategories();
    return {
      message: 'Categories retrieved successfully',
      data: categories,
    };
  }

  /**
   * POST /api/v1/admin/categories
   *
   * Create a new food category (e.g., "Burgers", "Pizza", "Desserts").
   * Delegates to CategoriesService which handles slug generation and validation.
   */
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto) {
    const category = await this.adminService.createCategory(dto);
    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  /**
   * PATCH /api/v1/admin/categories/:id
   *
   * Update a category's name, description, display order, or active status.
   * Setting isActive: false in the body performs a soft delete.
   */
  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const category = await this.adminService.updateCategory(id, dto);
    return {
      message: 'Category updated successfully',
      data: category,
    };
  }

  /**
   * DELETE /api/v1/admin/categories/:id
   *
   * Soft-deletes a category by setting isActive = false.
   * Products that reference this category are NOT deleted — they become
   * uncategorized (categoryId still points to the now-inactive category).
   *
   * Returns 204 No Content — standard for DELETE operations.
   * 204 means "success, but I have nothing to return."
   */
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.adminService.deleteCategory(id);
    // 204 No Content — no response body
  }
}
