/**
 * Orders Controller
 *
 * Handles all HTTP requests for order management.
 * Routes: /api/v1/orders
 *
 * Endpoint Summary:
 * ┌────────┬──────────────────────────┬───────────────────┬──────────────────────────────┐
 * │ Method │ Route                    │ Roles             │ Description                  │
 * ├────────┼──────────────────────────┼───────────────────┼──────────────────────────────┤
 * │ POST   │ /                        │ Customer          │ Place order from cart         │
 * │ GET    │ /my-orders               │ Customer          │ Customer's order history      │
 * │ GET    │ /vendor-orders           │ Vendor            │ Vendor's incoming orders      │
 * │ GET    │ /                        │ Admin             │ All orders                   │
 * │ GET    │ /group/:orderGroupId     │ Any authenticated │ Orders from one checkout      │
 * │ GET    │ /:id                     │ Any authenticated │ Single order detail           │
 * │ PATCH  │ /:id/status              │ All roles         │ Update order status           │
 * └────────┴──────────────────────────┴───────────────────┴──────────────────────────────┘
 *
 * Guard Stack Pattern:
 * @UseGuards(JwtAuthGuard, RolesGuard)  ← runs LEFT to RIGHT
 *   1. JwtAuthGuard: Is the user authenticated? (valid JWT token?)
 *   2. RolesGuard: Does the user have the required role? (@Roles decorator)
 *
 * If JwtAuthGuard fails → 401 Unauthorized
 * If RolesGuard fails → 403 Forbidden
 *
 * NOTE on @CurrentUser() type:
 * We use the User entity class (not the RequestUser interface) because
 * TypeScript's `isolatedModules` + `emitDecoratorMetadata` requires
 * decorated parameter types to be concrete classes (not interfaces).
 * Interfaces are erased at compile time and can't be emitted as metadata.
 * The products controller follows the same pattern.
 */
import {
  Controller,
  ForbiddenException,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller({
  path: 'orders',
  version: '1',
})
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ==================== ORDER CREATION ====================

  /**
   * Place an order from the shopping cart
   *
   * POST /api/v1/orders
   *
   * This is the "checkout" endpoint. It:
   * 1. Validates the customer's cart
   * 2. Creates order(s) — one per vendor in the cart
   * 3. Decrements product stock (inside a transaction)
   * 4. Clears the cart
   * 5. Returns the created order(s)
   *
   * The customer only sends:
   * - paymentMethod (e.g., "cash_on_delivery")
   * - optional deliveryAddress override
   * - optional customerNotes
   *
   * Cart items are read directly from Redis (NOT from the request body).
   * This prevents price tampering — the customer can't send fake prices.
   *
   * Why @Roles(CUSTOMER)?
   * Only customers can place orders. Vendors make food, riders deliver it.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place an order (checkout)', description: 'Roles: customer. Cart is read from Redis — no prices in body.' })
  @ApiResponse({ status: 201, description: 'Order(s) created' })
  @ApiResponse({ status: 403, description: 'Forbidden — not a customer' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return await this.ordersService.createOrder(user as any, dto);
  }

  // ==================== ORDER RETRIEVAL ====================

  /**
   * Get customer's order history
   *
   * GET /api/v1/orders/my-orders
   * GET /api/v1/orders/my-orders?status=delivered&page=1&limit=10
   *
   * Returns orders placed by the authenticated customer.
   * Supports filtering by status, date range, and pagination.
   *
   * Why a dedicated endpoint instead of GET / with a filter?
   * - Clearer intent: "my orders" vs "all orders"
   * - Simpler permission model: no risk of accidentally exposing other customers' orders
   * - Different roles get different endpoints, each scoped to their data
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: "Get customer's order history", description: 'Roles: customer' })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  async getMyOrders(
    @CurrentUser() user: User,
    @Query() filters: OrderFilterDto,
  ) {
    if (!user.customerProfile) {
      return { orders: [], total: 0 };
    }

    return await this.ordersService.findCustomerOrders(
      user.customerProfile.id,
      filters,
    );
  }

  /**
   * Get vendor's incoming orders
   *
   * GET /api/v1/orders/vendor-orders
   * GET /api/v1/orders/vendor-orders?status=pending
   *
   * Returns orders that contain products from the authenticated vendor.
   * This is the vendor's "order management dashboard."
   *
   * Common use cases:
   * - ?status=pending → Orders waiting for vendor confirmation
   * - ?status=confirmed → Orders to start preparing
   * - ?status=preparing → Orders currently in the kitchen
   * - ?status=ready_for_pickup → Orders waiting for rider
   */
  @Get('vendor-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: "Get vendor's incoming orders", description: 'Roles: vendor' })
  @ApiResponse({ status: 200, description: 'Paginated vendor order list' })
  async getVendorOrders(
    @CurrentUser() user: User,
    @Query() filters: OrderFilterDto,
  ) {
    if (!user.vendorProfile) {
      return { orders: [], total: 0 };
    }

    return await this.ordersService.findVendorOrders(
      user.vendorProfile.id,
      filters,
    );
  }

  /**
   * Get all orders (admin only)
   *
   * GET /api/v1/orders
   * GET /api/v1/orders?status=cancelled&vendorId=xxx&fromDate=2026-01-01
   *
   * Admin-only endpoint for viewing all orders in the system.
   * Supports additional filters: vendorId, customerId (not available to other roles).
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all orders (admin)', description: 'Roles: admin' })
  @ApiResponse({ status: 200, description: 'All orders with filters' })
  async getAllOrders(@Query() filters: OrderFilterDto) {
    return await this.ordersService.findAllOrders(filters);
  }

  /**
   * Get all orders from a single checkout
   *
   * GET /api/v1/orders/group/:orderGroupId
   *
   * When a customer checks out a cart with items from multiple vendors,
   * multiple orders are created sharing one orderGroupId. This endpoint
   * returns all of them — useful for the "order confirmation" page.
   *
   * Why not use GET /:id?
   * Because /:id returns ONE order. A multi-vendor checkout creates MULTIPLE orders.
   * The customer needs to see all of them together.
   */
  @Get('group/:orderGroupId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all orders from one checkout (multi-vendor)' })
  @ApiResponse({ status: 200, description: 'Orders in the group' })
  async getOrderGroup(
    @Param('orderGroupId') orderGroupId: string,
    @CurrentUser() user: User,
  ) {
    const reqUser = user;
    return await this.ordersService.findOrdersByGroup(
      orderGroupId,
      reqUser.customerProfile?.id || reqUser.vendorProfile?.id || reqUser.id,
      reqUser.role,
    );
  }

  /**
   * Get a single order by ID
   *
   * GET /api/v1/orders/:id
   *
   * Returns full order details including items, customer, and vendor.
   * Access is checked based on the user's role:
   * - Customer: can only see their own orders
   * - Vendor: can only see orders for their products
   * - Admin: can see any order
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single order by ID' })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your order' })
  async getOrder(@Param('id') id: string, @CurrentUser() user: User) {
    const reqUser = user;
    const order = await this.ordersService.findOne(id);

    // Verify the user has access to this order
    if (reqUser.role === UserRole.CUSTOMER) {
      if (order.customerId !== reqUser.customerProfile?.id) {
        throw new ForbiddenException('You can only view your own orders');
      }
    } else if (reqUser.role === UserRole.VENDOR) {
      if (order.vendorId !== reqUser.vendorProfile?.id) {
        throw new ForbiddenException(
          'You can only view orders for your products',
        );
      }
    } else if (reqUser.role === UserRole.RIDER) {
      if (order.riderId !== reqUser.riderProfile?.id) {
        throw new ForbiddenException(
          'You can only view orders assigned to you',
        );
      }
    }
    // Admin can see any order

    return order;
  }

  // ==================== ORDER STATUS MANAGEMENT ====================

  /**
   * Update order status
   *
   * PATCH /api/v1/orders/:id/status
   *
   * This is how the order moves through its lifecycle:
   * - Vendor sends { status: "confirmed" } → accepts the order
   * - Vendor sends { status: "preparing" } → starts cooking
   * - Vendor sends { status: "ready_for_pickup" } → food is ready
   * - Rider sends { status: "picked_up" } → collected the food
   * - Rider sends { status: "delivered" } → delivered to customer
   * - Anyone sends { status: "cancelled" } → cancel (if allowed)
   *
   * The state machine in order-status-machine.ts validates:
   * 1. Is this transition valid? (can't skip PENDING → DELIVERED)
   * 2. Does this user's role have permission? (customer can't confirm)
   *
   * Why all 4 roles in @Roles()?
   * Because different roles trigger different transitions.
   * The state machine handles the fine-grained permission check.
   * The @Roles guard just ensures the user is authenticated and has a valid role.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER, UserRole.RIDER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status', description: 'Roles: all. State machine enforces valid transitions per role.' })
  @ApiResponse({ status: 200, description: 'Updated order' })
  @ApiResponse({ status: 403, description: 'Invalid transition for your role' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return await this.ordersService.updateOrderStatus(id, dto, user);
  }
}
