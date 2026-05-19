/**
 * Delivery Controller
 *
 * Handles all HTTP requests for delivery management.
 * Routes: /api/v1/deliveries
 *
 * Endpoint Summary:
 * ┌────────┬───────────────────────────────┬─────────────────┬─────────────────────────────┐
 * │ Method │ Route                         │ Role            │ Description                 │
 * ├────────┼───────────────────────────────┼─────────────────┼─────────────────────────────┤
 * │ POST   │ /assign                       │ Admin           │ Manually assign to rider    │
 * │ GET    │ /active                       │ Rider           │ Rider's current delivery    │
 * │ GET    │ /order/:orderId               │ Customer+Admin  │ Delivery info for an order  │
 * │ PATCH  │ /:id/accept                   │ Rider           │ Accept assignment           │
 * │ PATCH  │ /:id/reject                   │ Rider           │ Reject assignment           │
 * │ PATCH  │ /:id/pickup                   │ Rider           │ Mark picked up              │
 * │ PATCH  │ /:id/complete                 │ Rider           │ Mark delivered + proof      │
 * │ PATCH  │ /:id/cancel                   │ Admin           │ Cancel a delivery           │
 * │ GET    │ /:id                          │ Rider+Admin     │ Delivery details            │
 * └────────┴───────────────────────────────┴─────────────────┴─────────────────────────────┘
 *
 * KEY LEARNING: Action-Based Routes vs CRUD Routes
 * =================================================
 * Instead of a generic PATCH /:id with a status field in the body,
 * we use explicit action routes: /accept, /reject, /pickup, /complete.
 *
 * Why? Because each action has DIFFERENT:
 * - Validation rules (complete needs proof image, cancel needs reason)
 * - Side effects (pickup syncs order status, complete frees the rider)
 * - Permissions (only the assigned rider can accept)
 *
 * This makes each endpoint focused, testable, and self-documenting.
 * Compare "PATCH /deliveries/123/pickup" vs "PATCH /deliveries/123 { status: 'picked_up' }"
 * — the first is immediately clear about intent.
 */
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DeliveryService } from '../services/delivery.service';
import { RiderLocationService } from '../services/rider-location.service';
import { AssignDeliveryDto } from '../dto/assign-delivery.dto';
import { AutoAssignDto } from '../dto/auto-assign.dto';
import { CompleteDeliveryDto } from '../dto/complete-delivery.dto';
import { CancelDeliveryDto } from '../dto/cancel-delivery.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { AssignmentType } from '../enums/assignment-type.enum';

@ApiTags('Delivery')
@ApiBearerAuth()
@Controller({
  path: 'deliveries',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly riderLocationService: RiderLocationService,
  ) {}

  // ==================== ADMIN ACTIONS ====================

  /**
   * Manually assign an order to a rider.
   *
   * POST /api/v1/deliveries/assign
   * Body: { "orderId": "uuid", "riderId": "uuid" }
   *
   * This is the MVP assignment flow:
   * 1. Admin sees an order in READY_FOR_PICKUP status
   * 2. Admin checks GET /riders/available for online riders
   * 3. Admin assigns the order to a chosen rider
   * 4. Rider receives the assignment and can accept/reject
   */
  @Post('assign')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually assign an order to a rider', description: 'Roles: admin' })
  @ApiResponse({ status: 201, description: 'Delivery assigned' })
  async assignDelivery(
    @Body() dto: AssignDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.deliveryService.assignOrderToRider(
      dto.orderId,
      dto.riderId,
      user.id,
      AssignmentType.MANUAL,
    );
  }

  /**
   * Auto-assign an order to the nearest available rider.
   *
   * POST /api/v1/deliveries/auto-assign
   * Body: { "orderId": "uuid" }
   *
   * Uses Redis GEOSEARCH to find the nearest online rider,
   * filters by availability, and assigns them.
   *
   * Returns the created delivery if a rider was found, or
   * { message: "No available riders..." } if no rider is nearby.
   *
   * KEY LEARNING: Null Return vs Error
   * ====================================
   * Auto-assign returns null (not an error) when no riders are found.
   * This is intentional — "no riders nearby" is a normal business condition,
   * not an error. The admin can try again later or manually assign.
   */
  @Post('auto-assign')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-assign order to nearest available rider', description: 'Roles: admin. Uses Redis GEOSEARCH.' })
  @ApiResponse({ status: 200, description: '{ delivery, assigned } or { message, assigned: false }' })
  async autoAssignDelivery(@Body() dto: AutoAssignDto) {
    const result = await this.deliveryService.autoAssignOrder(dto.orderId);

    if (!result) {
      return {
        message:
          'No available riders found nearby. Please try again later or assign manually.',
        assigned: false,
      };
    }

    return { delivery: result, assigned: true };
  }

  // ==================== RIDER QUERIES ====================
  // Static routes MUST come before :id parameter routes

  /**
   * Get rider's current active delivery.
   *
   * GET /api/v1/deliveries/active
   *
   * Returns the delivery the rider is currently working on.
   * Returns null if the rider has no active delivery.
   * This is the rider's "main screen" — their current task.
   */
  @Get('active')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: "Get rider's current active delivery", description: 'Roles: rider' })
  @ApiResponse({ status: 200, description: 'Active delivery or null' })
  async getActiveDelivery(@CurrentUser() user: User) {
    const reqUser = user as any;

    if (!reqUser.riderProfile?.id) {
      return null;
    }

    return this.deliveryService.findActiveDeliveryForRider(
      reqUser.riderProfile.id,
    );
  }

  /**
   * Get delivery info for an order.
   *
   * GET /api/v1/deliveries/order/:orderId
   *
   * Used by customers to see delivery status and rider info.
   * Also used by admins for monitoring.
   */
  @Get('order/:orderId')
  @Roles(UserRole.CUSTOMER, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get delivery info for an order', description: 'Roles: customer, rider, admin' })
  @ApiResponse({ status: 200, description: 'Delivery detail' })
  async getDeliveryByOrder(@Param('orderId') orderId: string) {
    return this.deliveryService.findDeliveryByOrder(orderId);
  }

  /**
   * Track rider location for an active delivery.
   *
   * GET /api/v1/deliveries/order/:orderId/track
   *
   * Returns the rider's real-time location (from Redis) for an active delivery.
   * This is the endpoint a customer's mobile app calls to show the rider on a map.
   *
   * Returns null if no active delivery or rider location unavailable.
   *
   * KEY LEARNING: Polling vs WebSockets
   * ====================================
   * This is a POLLING endpoint — the client calls it every few seconds.
   * For MVP, this is fine and much simpler than WebSockets.
   *
   * In production, you'd upgrade to WebSockets (Socket.io) or Server-Sent
   * Events (SSE) to PUSH updates to the client. This avoids the overhead
   * of repeated HTTP requests and gives truly real-time updates.
   */
  @Get('order/:orderId/track')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Track rider real-time location for a delivery', description: 'Roles: customer, admin. Poll every few seconds.' })
  @ApiResponse({ status: 200, description: 'Rider location or null' })
  async trackDelivery(@Param('orderId') orderId: string) {
    return this.riderLocationService.getDeliveryLocation(orderId);
  }

  // ==================== RIDER ACTIONS ====================

  /**
   * Rider accepts a delivery assignment.
   *
   * PATCH /api/v1/deliveries/:id/accept
   *
   * After being assigned, the rider reviews the delivery details
   * (distance, restaurant, dropoff location) and decides to accept.
   * This links the rider to the order and the rider is committed.
   */
  @Patch(':id/accept')
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a delivery assignment', description: 'Roles: rider' })
  @ApiResponse({ status: 200, description: 'Delivery accepted' })
  async acceptDelivery(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;
    return this.deliveryService.acceptDelivery(id, reqUser.riderProfile.id);
  }

  /**
   * Rider rejects a delivery assignment.
   *
   * PATCH /api/v1/deliveries/:id/reject
   *
   * If the rider can't take this delivery (too far, wrong area, etc.),
   * they reject it. The order goes back to the pool for reassignment.
   * The rider becomes ONLINE again.
   */
  @Patch(':id/reject')
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a delivery assignment', description: 'Roles: rider. Order goes back to pool.' })
  @ApiResponse({ status: 200, description: 'Delivery rejected' })
  async rejectDelivery(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;
    return this.deliveryService.rejectDelivery(id, reqUser.riderProfile.id);
  }

  /**
   * Rider marks food as picked up from vendor.
   *
   * PATCH /api/v1/deliveries/:id/pickup
   *
   * The rider has arrived at the restaurant and collected the food.
   * This also transitions the Order status to PICKED_UP.
   */
  @Patch(':id/pickup')
  @Roles(UserRole.RIDER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark food as picked up from vendor', description: 'Roles: rider' })
  @ApiResponse({ status: 200, description: 'Delivery and order status updated to PICKED_UP' })
  async pickUpDelivery(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;
    return this.deliveryService.pickUpDelivery(id, reqUser.riderProfile.id);
  }

  /**
   * Rider completes the delivery.
   *
   * PATCH /api/v1/deliveries/:id/complete
   * Body (multipart/form-data):
   *   - proofImage (file, optional): Photo of delivered food
   *   - deliveryNotes (string, optional): Notes about the delivery
   *
   * KEY LEARNING: Multipart File Upload
   * =====================================
   * @UseInterceptors(FileInterceptor('proofImage')) tells NestJS to parse
   * multipart/form-data and extract a file named 'proofImage'.
   * The file is passed to the handler via @UploadedFile().
   * Text fields in the form are parsed into the @Body() DTO.
   *
   * This is the same pattern used for product image uploads.
   */
  @Patch(':id/complete')
  @Roles(UserRole.RIDER)
  @UseInterceptors(FileInterceptor('proofImage'))
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Complete a delivery with optional proof image', description: 'Roles: rider. multipart/form-data: proofImage (file) + deliveryNotes (string).' })
  @ApiResponse({ status: 200, description: 'Delivery completed' })
  async completeDelivery(
    @Param('id') id: string,
    @Body() dto: CompleteDeliveryDto,
    @UploadedFile() proofImage: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const reqUser = user as any;
    return this.deliveryService.completeDelivery(
      id,
      reqUser.riderProfile.id,
      proofImage,
      dto.deliveryNotes,
    );
  }

  // ==================== ADMIN: CANCEL ====================

  /**
   * Admin cancels a delivery.
   *
   * PATCH /api/v1/deliveries/:id/cancel
   * Body: { "cancellationReason": "Rider had an emergency" }
   */
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a delivery', description: 'Roles: admin' })
  @ApiResponse({ status: 200, description: 'Delivery cancelled' })
  async cancelDelivery(
    @Param('id') id: string,
    @Body() dto: CancelDeliveryDto,
    @CurrentUser() user: User,
  ) {
    return this.deliveryService.cancelDelivery(
      id,
      user.id,
      dto.cancellationReason,
    );
  }

  // ==================== QUERIES ====================

  /**
   * Get delivery details by ID.
   *
   * GET /api/v1/deliveries/:id
   */
  @Get(':id')
  @Roles(UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get delivery details by ID', description: 'Roles: rider, admin' })
  @ApiResponse({ status: 200, description: 'Delivery detail' })
  async getDelivery(@Param('id') id: string) {
    return this.deliveryService.getDeliveryDetails(id);
  }
}
