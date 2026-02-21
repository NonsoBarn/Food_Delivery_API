/**
 * Rider Management Controller
 *
 * Handles rider administration (admin) and rider self-service.
 * Routes: /api/v1/riders
 *
 * Endpoint Summary:
 * ┌────────┬──────────────────────────┬───────────┬──────────────────────────────┐
 * │ Method │ Route                    │ Role      │ Description                  │
 * ├────────┼──────────────────────────┼───────────┼──────────────────────────────┤
 * │ GET    │ /                        │ Admin     │ List all riders (filtered)   │
 * │ GET    │ /available               │ Admin     │ Get online, approved riders  │
 * │ PATCH  │ /:riderId/approve        │ Admin     │ Approve rider application    │
 * │ PATCH  │ /:riderId/reject         │ Admin     │ Reject rider application     │
 * │ PATCH  │ /:riderId/suspend        │ Admin     │ Suspend a rider              │
 * │ PATCH  │ /availability            │ Rider     │ Toggle own online/offline    │
 * │ GET    │ /my-deliveries           │ Rider     │ Rider's delivery history     │
 * └────────┴──────────────────────────┴───────────┴──────────────────────────────┘
 *
 * KEY LEARNING: Route Ordering Matters!
 * ======================================
 * NestJS matches routes TOP TO BOTTOM. Static routes (/available, /my-deliveries)
 * MUST be defined BEFORE parameterized routes (/:riderId/approve).
 * Otherwise, "available" would be treated as a riderId parameter.
 *
 * This is why we put GET /available and GET /my-deliveries above
 * the PATCH /:riderId/* routes.
 */
import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RiderManagementService } from '../services/rider-management.service';
import { RiderLocationService } from '../services/rider-location.service';
import { RejectRiderDto } from '../dto/reject-rider.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { FindNearbyRidersDto } from '../dto/find-nearby-riders.dto';
import { RiderFilterDto } from '../dto/rider-filter.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';

@Controller({
  path: 'riders',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiderManagementController {
  constructor(
    private readonly riderManagementService: RiderManagementService,
    private readonly riderLocationService: RiderLocationService,
  ) {}

  // ==================== ADMIN ENDPOINTS ====================
  // These MUST come before parameterized routes (/:riderId/*)

  /**
   * List all riders with optional filters.
   *
   * GET /api/v1/riders
   * GET /api/v1/riders?status=pending&page=1&limit=10
   *
   * Admin dashboard for managing rider applications and monitoring.
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllRiders(@Query() filters: RiderFilterDto) {
    return this.riderManagementService.findAllRiders(filters);
  }

  /**
   * Get all available riders (approved + online).
   *
   * GET /api/v1/riders/available
   *
   * Used by admin when manually assigning an order to a rider.
   * Shows only riders who are currently ready to accept deliveries.
   */
  @Get('available')
  @Roles(UserRole.ADMIN)
  async getAvailableRiders() {
    return this.riderManagementService.findAvailableRiders();
  }

  // ==================== RIDER SELF-SERVICE ====================

  /**
   * Toggle rider availability (online/offline).
   *
   * PATCH /api/v1/riders/availability
   * Body: { "availabilityStatus": "online" }
   *
   * This is how a rider "starts their shift" or "ends their shift."
   * Going online means they can receive delivery assignments.
   * Going offline means they won't receive new assignments.
   *
   * KEY LEARNING: PATCH for Partial Updates
   * ========================================
   * We use PATCH (not PUT) because we're updating a SINGLE field,
   * not replacing the entire rider resource. HTTP semantics:
   * - PUT = "replace the entire resource with this new version"
   * - PATCH = "apply these partial changes to the resource"
   */
  @Patch('availability')
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  async toggleAvailability(
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;

    if (!reqUser.riderProfile?.id) {
      return {
        message: 'You do not have a rider profile. Create one first.',
      };
    }

    return this.riderManagementService.toggleAvailability(
      reqUser.riderProfile.id,
      dto.availabilityStatus,
    );
  }

  /**
   * Update rider's current location.
   *
   * PUT /api/v1/riders/location
   * Body: { "latitude": 6.5244, "longitude": 3.3792, "heading": 90, "speed": 25 }
   *
   * Called frequently by the rider's mobile app (every 5-10 seconds).
   * Stores in Redis for real-time tracking, periodically syncs to PostgreSQL.
   *
   * KEY LEARNING: PUT for Idempotent Full Replacement
   * ==================================================
   * We use PUT (not PATCH) because each call REPLACES the entire location
   * state. Calling PUT twice with the same data produces the same result.
   * PATCH would imply partial updates, but location always has all fields.
   */
  @Put('location')
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;

    if (!reqUser.riderProfile?.id) {
      return { message: 'You do not have a rider profile.' };
    }

    await this.riderLocationService.updateLocation(
      reqUser.riderProfile.id,
      dto.latitude,
      dto.longitude,
      dto.heading,
      dto.speed,
    );

    return { message: 'Location updated' };
  }

  /**
   * Find nearest riders to a location.
   *
   * GET /api/v1/riders/nearby?latitude=6.52&longitude=3.37&radiusKm=5&limit=10
   *
   * Used by admin when deciding which rider to assign to an order.
   * Uses Redis GEOSEARCH for fast geospatial queries.
   */
  @Get('nearby')
  @Roles(UserRole.ADMIN)
  async findNearbyRiders(@Query() dto: FindNearbyRidersDto) {
    return this.riderLocationService.findNearestRiders(
      dto.latitude,
      dto.longitude,
      dto.radiusKm,
      dto.limit,
    );
  }

  /**
   * Get rider's own delivery history.
   *
   * GET /api/v1/riders/my-deliveries
   * GET /api/v1/riders/my-deliveries?page=1&limit=10
   *
   * Shows the rider all their past and current deliveries.
   */
  @Get('my-deliveries')
  @Roles(UserRole.RIDER)
  async getMyDeliveries(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const reqUser = user as any;

    if (!reqUser.riderProfile?.id) {
      return { deliveries: [], total: 0 };
    }

    return this.riderManagementService.findRiderDeliveries(
      reqUser.riderProfile.id,
      page,
      limit,
    );
  }

  // ==================== ADMIN: RIDER STATUS MANAGEMENT ====================

  /**
   * Approve a rider application.
   *
   * PATCH /api/v1/riders/:riderId/approve
   *
   * After a rider registers and submits their documents,
   * an admin reviews and approves them. Only then can the rider go online.
   */
  @Patch(':riderId/approve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async approveRider(
    @Param('riderId') riderId: string,
    @CurrentUser() user: User,
  ) {
    return this.riderManagementService.approveRider(riderId, user.id);
  }

  /**
   * Reject a rider application.
   *
   * PATCH /api/v1/riders/:riderId/reject
   * Body: { "rejectionReason": "Driver license expired" }
   *
   * Admin must provide a reason so the rider can address the issue
   * and potentially re-apply.
   */
  @Patch(':riderId/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async rejectRider(
    @Param('riderId') riderId: string,
    @Body() dto: RejectRiderDto,
  ) {
    return this.riderManagementService.rejectRider(
      riderId,
      dto.rejectionReason,
    );
  }

  /**
   * Suspend a rider.
   *
   * PATCH /api/v1/riders/:riderId/suspend
   *
   * Used for policy violations, fraud, or customer complaints.
   * Immediately takes the rider offline and prevents them from going online.
   */
  @Patch(':riderId/suspend')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async suspendRider(@Param('riderId') riderId: string) {
    return this.riderManagementService.suspendRider(riderId);
  }
}
