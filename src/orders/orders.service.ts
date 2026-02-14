/**
 * Orders Service
 *
 * Handles all order-related business logic:
 * - Creating orders from cart (with database transactions)
 * - Retrieving orders by role (customer, vendor, admin)
 * - Updating order status (with state machine validation)
 *
 * KEY LEARNING: Database Transactions
 * ====================================
 * The createOrder() method is the centerpiece of this module.
 * It demonstrates WHY transactions exist and HOW to use them.
 *
 * A transaction groups multiple database operations into ONE atomic unit:
 * either ALL operations succeed, or NONE of them do. This prevents
 * "half-done" states like "order created but stock not decremented."
 *
 * TypeORM Transaction API:
 * ```
 * await this.dataSource.transaction(async (manager) => {
 *   // Everything inside uses `manager` instead of repositories
 *   // If any operation throws, ALL changes roll back
 *   await manager.save(Order, order);
 *   await manager.save(Product, product); // rolls back if this fails
 * });
 * ```
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { ProductStatus } from '../products/enums/product-status.enum';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/user-role.enum';
import {
  canRoleTransition,
  getValidNextStatuses,
} from './order-status-machine';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    /**
     * DataSource is TypeORM's main entry point.
     * We use it to create TRANSACTIONS — grouped database operations
     * that either all succeed or all roll back.
     *
     * Why not just use the repositories?
     * Repositories use separate database connections.
     * A transaction needs all operations on the SAME connection
     * so the database can group them together.
     *
     * DataSource.transaction() gives us an EntityManager that
     * is bound to a single connection with a transaction started.
     */
    private readonly dataSource: DataSource,

    private readonly cartService: CartService,
  ) {}

  // ==================== ORDER CREATION ====================

  /**
   * Create Order(s) from Cart
   *
   * This is the most important method in the order system.
   * It converts the customer's Redis cart into permanent database orders.
   *
   * FLOW:
   * 1. Validate the cart (check stock, availability, etc.)
   * 2. Get cart contents grouped by vendor
   * 3. START TRANSACTION
   *    a. For each vendor group, create an Order + OrderItems
   *    b. Decrement product stock (with pessimistic locking)
   *    c. If ANY step fails, ROLL BACK everything
   * 4. END TRANSACTION
   * 5. Clear the cart from Redis (only after transaction succeeds)
   * 6. Return created orders
   *
   * WHY TRANSACTIONS MATTER (the learning point):
   * Without a transaction, imagine this sequence:
   *   ✅ Order saved to database
   *   ✅ Stock for item 1 decremented
   *   ❌ Stock for item 2 fails (insufficient)
   *
   * Now you have an order in the database but inconsistent stock!
   * The customer thinks they ordered both items, but item 2's stock
   * wasn't actually reserved. Another customer might buy that last item.
   *
   * With a transaction:
   *   ✅ Order saved (but not committed yet)
   *   ✅ Stock for item 1 decremented (but not committed yet)
   *   ❌ Stock for item 2 fails → ROLLBACK
   *   ↩️ Order is UN-saved, stock for item 1 is UN-decremented
   *   → Database is back to exactly how it was before we started
   *
   * @param user - The authenticated customer
   * @param dto - Payment method, optional address override, notes
   * @returns Array of created orders (one per vendor)
   */
  async createOrder(
    user: RequestUser,
    dto: CreateOrderDto,
  ): Promise<Order[]> {
    // ---- Pre-checks ----

    if (!user.customerProfile) {
      throw new BadRequestException(
        'You need a customer profile to place an order. Please create one first.',
      );
    }

    const customerProfile = user.customerProfile;

    // Determine delivery address (DTO override or profile default)
    const deliveryAddress = dto.deliveryAddress || customerProfile.deliveryAddress;

    if (!deliveryAddress) {
      throw new BadRequestException(
        'No delivery address provided. Either set one in your profile or include it in the order.',
      );
    }

    // ---- Step 1: Validate Cart ----
    // This checks that all products still exist, are published, and in stock.
    // We do this BEFORE starting the transaction to fail fast.
    const validation = await this.cartService.validateCart(user.id);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Cart validation failed. Please review your cart.',
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    // ---- Step 2: Get Cart Contents ----
    const cart = await this.cartService.getCart(user.id, true);

    if (cart.isEmpty) {
      throw new BadRequestException('Your cart is empty');
    }

    // Generate a shared orderGroupId for all orders in this checkout.
    // If the cart has items from 3 vendors, all 3 orders share this ID.
    const orderGroupId = this.generateUUID();

    // ---- Step 3: DATABASE TRANSACTION ----
    // Everything inside this callback is wrapped in a transaction.
    // The `manager` parameter is a special EntityManager bound to
    // a single database connection with a transaction started.
    const createdOrders = await this.dataSource.transaction(
      async (manager) => {
        const orders: Order[] = [];

        // Iterate over each vendor group in the cart
        // e.g., { "vendor-1": { items: [...], subtotal: 25.99 }, "vendor-2": { ... } }
        for (const [vendorId, vendorGroup] of Object.entries(
          cart.itemsByVendor,
        )) {
          // ---- 3a: Generate human-readable order number ----
          const orderNumber = this.generateOrderNumber();

          // ---- 3b: Create Order entity ----
          const order = manager.create(Order, {
            orderNumber,
            orderGroupId,
            customerId: customerProfile.id,
            vendorId,
            deliveryAddress,
            deliveryCity: customerProfile.city,
            deliveryState: customerProfile.state,
            deliveryPostalCode: customerProfile.postalCode,
            deliveryLatitude: customerProfile.latitude,
            deliveryLongitude: customerProfile.longitude,
            subtotal: vendorGroup.subtotal,
            tax: 0, // Future: calculate tax
            deliveryFee: 0, // Future: calculate delivery fee
            total: vendorGroup.subtotal, // subtotal + tax + deliveryFee
            paymentMethod: dto.paymentMethod,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            customerNotes: dto.customerNotes,
          });

          // Save the order to get its generated ID
          const savedOrder = await manager.save(Order, order);

          // ---- 3c: Create OrderItems ----
          const orderItems: OrderItem[] = [];

          for (const cartItem of vendorGroup.items) {
            const orderItem = manager.create(OrderItem, {
              orderId: savedOrder.id,
              productId: cartItem.productId,
              productName: cartItem.name,
              productSlug: cartItem.slug,
              productImageUrl: cartItem.imageUrl ?? undefined,
              quantity: cartItem.quantity,
              unitPrice: cartItem.price,
              subtotal: cartItem.price * cartItem.quantity,
            });

            orderItems.push(orderItem);

            // ---- 3d: Decrement Stock ----
            // This is where pessimistic locking protects us from race conditions.
            //
            // Scenario without locking:
            //   Customer A reads stock=1, Customer B reads stock=1
            //   Both think they can buy it
            //   Customer A sets stock=0, Customer B sets stock=0
            //   Two orders placed for ONE item! (oversold)
            //
            // With pessimistic_write lock:
            //   Customer A locks the row, reads stock=1, sets stock=0
            //   Customer B waits for the lock, reads stock=0, FAILS
            //   Only one order goes through. Correct!
            const product = await manager.findOne(Product, {
              where: { id: cartItem.productId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!product) {
              throw new BadRequestException(
                `Product "${cartItem.name}" is no longer available`,
              );
            }

            if (product.status !== ProductStatus.PUBLISHED) {
              throw new BadRequestException(
                `Product "${product.name}" is no longer available for purchase`,
              );
            }

            // Only decrement if stock is tracked (stock !== -1)
            if (product.stock !== -1) {
              if (product.stock < cartItem.quantity) {
                throw new BadRequestException(
                  `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${cartItem.quantity}`,
                );
              }

              product.stock -= cartItem.quantity;

              // Auto-mark as out of stock if depleted
              if (product.stock === 0) {
                product.status = ProductStatus.OUT_OF_STOCK;
              }
            }

            // Increment order count for analytics
            product.orderCount = (product.orderCount || 0) + 1;

            await manager.save(Product, product);
          }

          // Save all order items at once (batch save)
          await manager.save(OrderItem, orderItems);

          // Attach items to the order for the response
          savedOrder.items = orderItems;
          orders.push(savedOrder);
        }

        // If we reach here, ALL operations succeeded.
        // The transaction will COMMIT automatically when the callback returns.
        return orders;
      },
    );

    // ---- Step 5: Clear Cart ----
    // IMPORTANT: This happens OUTSIDE the transaction!
    // Why? Redis operations can't participate in PostgreSQL transactions.
    // If the transaction succeeded but Redis clear fails, the customer
    // might see old cart items — but their order IS created and correct.
    // The cart will expire via TTL eventually.
    try {
      await this.cartService.clearCart(user.id, true);
    } catch (error) {
      // Log but don't fail — the order was successfully created
      this.logger.warn(
        `Failed to clear cart for user ${user.id} after order creation: ${error.message}`,
      );
    }

    this.logger.log(
      `Created ${createdOrders.length} order(s) for customer ${customerProfile.id} (group: ${orderGroupId})`,
    );

    return createdOrders;
  }

  // ==================== ORDER RETRIEVAL ====================

  /**
   * Get a single order by ID
   *
   * Loads the order with all its relationships:
   * - items (what was ordered)
   * - customer (who ordered)
   * - vendor (who fulfills)
   */
  async findOne(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'customer', 'vendor'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Get all orders from a single checkout (by group ID)
   *
   * When a customer buys from 2 vendors in one checkout, this returns
   * both orders. Useful for the "order confirmation" page.
   */
  async findOrdersByGroup(
    orderGroupId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .where('order.orderGroupId = :orderGroupId', { orderGroupId });

    // Non-admins can only see their own order groups
    if (userRole !== UserRole.ADMIN) {
      query.andWhere('order.customerId = :customerId', {
        customerId: userId,
      });
    }

    return await query.orderBy('order.createdAt', 'ASC').getMany();
  }

  /**
   * Get customer's order history
   *
   * Shows all orders placed by a specific customer,
   * with filtering, sorting, and pagination.
   *
   * The QueryBuilder pattern used here is like building an SQL query
   * piece by piece. It's more flexible than repository.find() when
   * you need dynamic WHERE clauses based on optional filters.
   */
  async findCustomerOrders(
    customerId: string,
    filters: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.vendor', 'vendor')
      .where('order.customerId = :customerId', { customerId });

    this.applyFilters(query, filters);

    return await this.paginateQuery(query, filters);
  }

  /**
   * Get orders for a vendor's products
   *
   * Shows all orders that contain items from a specific vendor.
   * This is the vendor's "incoming orders" dashboard.
   */
  async findVendorOrders(
    vendorId: string,
    filters: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.vendorId = :vendorId', { vendorId });

    this.applyFilters(query, filters);

    return await this.paginateQuery(query, filters);
  }

  /**
   * Get all orders (admin only)
   *
   * Shows every order in the system with optional filtering.
   * Admins can filter by vendor, customer, status, date range.
   */
  async findAllOrders(
    filters: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vendor', 'vendor');

    // Admin-only filters: filter by specific vendor or customer
    if (filters.vendorId) {
      query.andWhere('order.vendorId = :vendorId', {
        vendorId: filters.vendorId,
      });
    }

    if (filters.customerId) {
      query.andWhere('order.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }

    this.applyFilters(query, filters);

    return await this.paginateQuery(query, filters);
  }

  // ==================== ORDER STATUS MANAGEMENT ====================

  /**
   * Update Order Status
   *
   * Uses the state machine to validate that the status transition is legal
   * and that the user has permission to make it.
   *
   * KEY LEARNING: State Machine Pattern
   * ====================================
   * Instead of writing spaghetti if/else chains like:
   *   if (status === 'pending' && newStatus === 'confirmed') { ok }
   *   else if (status === 'pending' && newStatus === 'preparing') { error }
   *   else if ...
   *
   * We define transitions as DATA (a map), and write ONE generic check.
   * This is cleaner, easier to maintain, and harder to get wrong.
   * See order-status-machine.ts for the transition rules.
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    user: RequestUser,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    // ---- Permission Check ----
    // Each role can only update orders they're associated with.
    this.verifyOrderAccess(order, user);

    // ---- State Machine Validation ----
    // Can this role make this transition?
    if (!canRoleTransition(order.status, dto.status, user.role)) {
      const validNext = getValidNextStatuses(order.status, user.role);
      throw new BadRequestException(
        `Cannot transition from "${order.status}" to "${dto.status}". ` +
          `Valid next statuses for your role: [${validNext.join(', ')}]`,
      );
    }

    // ---- Apply Status-Specific Logic ----
    const previousStatus = order.status;
    order.status = dto.status;

    switch (dto.status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = new Date();
        if (dto.estimatedPrepTimeMinutes) {
          order.estimatedPrepTimeMinutes = dto.estimatedPrepTimeMinutes;
        }
        break;

      case OrderStatus.PREPARING:
        order.preparingAt = new Date();
        break;

      case OrderStatus.READY_FOR_PICKUP:
        order.readyAt = new Date();
        break;

      case OrderStatus.PICKED_UP:
        order.pickedUpAt = new Date();
        break;

      case OrderStatus.DELIVERED:
        order.deliveredAt = new Date();
        // For Cash on Delivery, mark as paid when delivered
        if (order.paymentStatus === PaymentStatus.PENDING) {
          order.paymentStatus = PaymentStatus.PAID;
        }
        break;

      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        order.cancellationReason =
          dto.cancellationReason || 'No reason provided';

        // Restore stock for cancelled orders
        await this.restoreStock(order);
        break;
    }

    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(
      `Order ${order.orderNumber} status changed: ${previousStatus} → ${dto.status} by ${user.role} (${user.id})`,
    );

    return savedOrder;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Verify that a user has access to an order
   *
   * - Customers can only access their own orders
   * - Vendors can only access orders for their products
   * - Admins can access any order
   */
  private verifyOrderAccess(order: Order, user: RequestUser): void {
    switch (user.role) {
      case UserRole.CUSTOMER:
        if (order.customerId !== user.customerProfile?.id) {
          throw new ForbiddenException('You can only manage your own orders');
        }
        break;

      case UserRole.VENDOR:
        if (order.vendorId !== user.vendorProfile?.id) {
          throw new ForbiddenException(
            'You can only manage orders for your products',
          );
        }
        break;

      case UserRole.ADMIN:
        // Admins can access any order
        break;

      default:
        throw new ForbiddenException('You do not have access to this order');
    }
  }

  /**
   * Restore product stock when an order is cancelled
   *
   * This reverses the stock decrement from order creation.
   * Uses a transaction to ensure all stock updates are atomic.
   */
  private async restoreStock(order: Order): Promise<void> {
    // Load items if not already loaded
    if (!order.items) {
      order.items = await this.orderItemRepository.find({
        where: { orderId: order.id },
      });
    }

    await this.dataSource.transaction(async (manager) => {
      for (const item of order.items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (product && product.stock !== -1) {
          product.stock += item.quantity;

          // If it was out of stock, restore to published
          if (product.status === ProductStatus.OUT_OF_STOCK) {
            product.status = ProductStatus.PUBLISHED;
          }

          await manager.save(Product, product);
        }
      }
    });
  }

  /**
   * Apply common filters to an order query
   *
   * This method is used by findCustomerOrders, findVendorOrders,
   * and findAllOrders to avoid code duplication.
   *
   * Pattern: Query Builder + Dynamic WHERE clauses
   * Instead of building different queries for each filter combination,
   * we conditionally add WHERE clauses. TypeORM's QueryBuilder uses
   * parameterized queries internally, so this is SQL-injection safe.
   */
  private applyFilters(
    query: ReturnType<Repository<Order>['createQueryBuilder']>,
    filters: OrderFilterDto,
  ): void {
    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.fromDate) {
      query.andWhere('order.createdAt >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }

    if (filters.toDate) {
      query.andWhere('order.createdAt <= :toDate', {
        toDate: filters.toDate,
      });
    }
  }

  /**
   * Apply pagination and sorting to a query
   *
   * Pagination prevents loading ALL orders at once (imagine a vendor
   * with 50,000 orders — you don't want to load them all in one request).
   *
   * .skip() and .take() translate to SQL OFFSET and LIMIT:
   *   SELECT * FROM orders LIMIT 20 OFFSET 40  -- page 3 of 20-per-page
   *
   * .getManyAndCount() runs TWO queries in parallel:
   *   1. SELECT * FROM orders ... LIMIT 20 OFFSET 40  (the page)
   *   2. SELECT COUNT(*) FROM orders ...               (total for pagination UI)
   */
  private async paginateQuery(
    query: ReturnType<Repository<Order>['createQueryBuilder']>,
    filters: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';

    query
      .orderBy(`order.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await query.getManyAndCount();

    return { orders, total };
  }

  /**
   * Generate a human-readable order number
   *
   * Format: ORD-YYYYMMDD-XXXXXX
   * Example: ORD-20260214-A3F8K2
   *
   * Why this format?
   * - "ORD" prefix makes it obvious this is an order number
   * - Date helps with quick visual sorting and debugging
   * - Random suffix prevents guessing (unlike sequential IDs)
   * - Short enough to read over the phone to customer support
   *
   * Uniqueness is enforced by the database unique index.
   * Collisions are astronomically rare (36^6 = 2.1 billion combinations per day).
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `ORD-${dateStr}-${suffix}`;
  }

  /**
   * Generate a UUID v4
   *
   * Used for orderGroupId. We use crypto.randomUUID() which is
   * built into Node.js (no external library needed).
   */
  private generateUUID(): string {
    return crypto.randomUUID();
  }
}
