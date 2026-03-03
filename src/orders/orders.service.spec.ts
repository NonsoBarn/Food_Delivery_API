/**
 * OrdersService Unit Tests
 *
 * KEY LEARNING: Mocking DataSource.transaction()
 * ===============================================
 * OrdersService.createOrder() wraps all DB writes in a transaction:
 *   await this.dataSource.transaction(async (manager) => { ... })
 *
 * In unit tests, we can't spin up a real database. Instead, we mock
 * DataSource.transaction() to immediately call the callback with a
 * fake EntityManager. This lets us:
 *   1. Test that the transaction was called at all
 *   2. Verify what was saved inside the transaction
 *   3. Simulate failures by making mock methods throw
 *
 * The pattern:
 *   const mockEntityManager = { create: jest.fn(), save: jest.fn(), ... };
 *   const mockDataSource = {
 *     transaction: jest.fn().mockImplementation(async (cb) => cb(mockEntityManager)),
 *   };
 *
 * When createOrder() calls:
 *   await this.dataSource.transaction(async (manager) => {
 *     await manager.create(Order, { ... });  ← calls mockEntityManager.create
 *     await manager.save(Order, order);      ← calls mockEntityManager.save
 *   });
 *
 * We control what each call returns and can assert they were called correctly.
 *
 * KEY LEARNING: Testing state machine validation
 * ===============================================
 * updateOrderStatus() uses canRoleTransition() from order-status-machine.ts.
 * That function is a pure function (no DI, no DB). We don't mock it — we
 * test actual state machine behaviour:
 *   - PENDING → DELIVERED (skips steps) should throw BadRequestException
 *   - PENDING → CONFIRMED by VENDOR should succeed
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CartService } from '../cart/cart.service';
import { OrderStatus } from './enums/order-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ProductStatus } from '../products/enums/product-status.enum';
import { NOTIFICATION_EVENTS } from '../notifications/events/notification-events';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

// ─── Test fixtures ───────────────────────────────────────────────────────────

/** A minimal Order object for testing */
function makeOrder(overrides: Partial<Order> = {}): Order {
  return Object.assign(new Order(), {
    id: 'order-uuid-789',
    orderNumber: 'ORD-001',
    orderGroupId: 'group-uuid-123',
    status: OrderStatus.PENDING,
    customerId: 'customer-profile-id',
    vendorId: 'vendor-profile-id',
    subtotal: 25.00,
    total: 25.00,
    paymentStatus: PaymentStatus.PENDING,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

/**
 * A minimal RequestUser (what JwtAuthGuard puts on req.user).
 * Includes customerProfile so createOrder() can read the profile ID.
 */
function makeRequestUser(overrides: Partial<RequestUser> = {}): RequestUser {
  return {
    id: 'user-uuid-abc',
    email: 'customer@test.com',
    role: UserRole.CUSTOMER,
    customerProfile: {
      id: 'customer-profile-id',
      deliveryAddress: '123 Main St',
      city: 'Lagos',
      state: 'Lagos',
      postalCode: '100001',
      latitude: 6.45,
      longitude: 3.4,
    } as any,
    vendorProfile: undefined,
    riderProfile: undefined,
    ...overrides,
  } as RequestUser;
}

/** A valid cart response with one vendor group */
function makeValidCart() {
  return {
    isEmpty: false,
    total: 25.00,
    itemsByVendor: {
      'vendor-profile-id': {
        subtotal: 25.00,
        deliveryFee: 0,
        total: 25.00,
        items: [
          {
            productId: 'product-uuid-1',
            name: 'Test Burger',
            price: 25.00,
            quantity: 1,
            subtotal: 25.00,
            vendorId: 'vendor-profile-id',
          },
        ],
      },
    },
  };
}

// ─── Mock dependencies ────────────────────────────────────────────────────────

/**
 * EntityManager mock — represents the `manager` parameter inside
 * the DataSource.transaction() callback.
 */
const mockEntityManager = {
  create: jest.fn().mockImplementation((_cls: any, data: any) => ({ ...data })),
  save: jest.fn().mockImplementation((_cls: any, data: any) =>
    Promise.resolve({ id: 'saved-id', ...data }),
  ),
  findOne: jest.fn(),
};

const mockOrderRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockOrderItemRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockCartService = {
  validateCart: jest.fn(),
  getCart: jest.fn(),
  clearCart: jest.fn().mockResolvedValue(undefined),
};

const mockDataSource = {
  /**
   * transaction() receives a callback and immediately calls it with the
   * fake EntityManager. This simulates the real behaviour: "start a
   * transaction, run the callback inside it."
   */
  transaction: jest.fn().mockImplementation(async (cb: (em: typeof mockEntityManager) => Promise<any>) =>
    cb(mockEntityManager),
  ),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepository },
        { provide: getRepositoryToken(Product), useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CartService, useValue: mockCartService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();

    // Restore default implementations after clearAllMocks
    mockEntityManager.create.mockImplementation((_cls: any, data: any) => ({ ...data }));
    mockEntityManager.save.mockImplementation((_cls: any, data: any) =>
      Promise.resolve({ id: 'saved-id', ...data }),
    );
    /**
     * KEY LEARNING: Restoring mock return values after clearAllMocks()
     * =================================================================
     * jest.clearAllMocks() resets ALL mock implementations and return values,
     * including those set in the mock object declaration.
     *
     * createOrder() calls manager.findOne(Product, ...) inside the transaction
     * to lock the product row and verify stock. Without a return value, findOne
     * returns undefined, causing BadRequestException("Product ... is no longer available").
     *
     * We restore a sensible default here so tests that don't care about the
     * product lookup (e.g. testing event emission) don't need to repeat this setup.
     */
    mockEntityManager.findOne.mockResolvedValue({
      id: 'product-uuid-1',
      name: 'Test Burger',
      price: 25.00,
      stock: 10,
      orderCount: 0,
      status: ProductStatus.PUBLISHED,
    });
    mockDataSource.transaction.mockImplementation(async (cb: any) => cb(mockEntityManager));
    mockCartService.clearCart.mockResolvedValue(undefined);
  });

  // ─── createOrder() ─────────────────────────────────────────────────────────

  describe('createOrder()', () => {
    it('should throw BadRequestException when user has no customer profile', async () => {
      const user = makeRequestUser({ customerProfile: undefined });
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await expect(service.createOrder(user, dto)).rejects.toThrow(BadRequestException);
      // Should fail before ever touching the cart
      expect(mockCartService.validateCart).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when no delivery address is available', async () => {
      const user = makeRequestUser({
        customerProfile: { id: 'cid', deliveryAddress: null } as any,
      });
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await expect(service.createOrder(user, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with validation errors when cart is invalid', async () => {
      mockCartService.validateCart.mockResolvedValue({
        valid: false,
        errors: ['Product "Test Burger" is out of stock'],
        warnings: [],
      });

      const user = makeRequestUser();
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await expect(service.createOrder(user, dto)).rejects.toThrow(BadRequestException);
      expect(mockCartService.getCart).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cart is empty', async () => {
      mockCartService.validateCart.mockResolvedValue({ valid: true, errors: [], warnings: [] });
      mockCartService.getCart.mockResolvedValue({ isEmpty: true });

      const user = makeRequestUser();
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await expect(service.createOrder(user, dto)).rejects.toThrow(
        new BadRequestException('Your cart is empty'),
      );
    });

    it('should call dataSource.transaction() for atomicity on a valid order', async () => {
      // Arrange — valid cart, valid user
      mockCartService.validateCart.mockResolvedValue({ valid: true, errors: [], warnings: [] });
      mockCartService.getCart.mockResolvedValue(makeValidCart());

      const user = makeRequestUser();
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      // Act
      await service.createOrder(user, dto);

      /**
       * KEY LEARNING: Verifying the transaction was used
       * ==================================================
       * We assert that transaction() was called. This is the core invariant:
       * order creation MUST be wrapped in a transaction. If someone removes it
       * and uses direct repository calls instead, this test will catch the regression.
       */
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should emit ORDER_CREATED event AFTER the transaction completes', async () => {
      mockCartService.validateCart.mockResolvedValue({ valid: true, errors: [], warnings: [] });
      mockCartService.getCart.mockResolvedValue(makeValidCart());

      const user = makeRequestUser();
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await service.createOrder(user, dto);

      /**
       * KEY LEARNING: Event fired after transaction
       * =============================================
       * Rule: events are emitted AFTER the DB operation completes.
       * If the transaction fails, the event must NOT fire.
       *
       * We test this by checking:
       * 1. emit() was called (the happy path works)
       * 2. (In the next test) if transaction throws, emit is NOT called
       */
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.ORDER_CREATED,
        expect.objectContaining({ customerId: 'customer-profile-id' }),
      );
    });

    it('should NOT emit ORDER_CREATED event if the transaction throws', async () => {
      mockCartService.validateCart.mockResolvedValue({ valid: true, errors: [], warnings: [] });
      mockCartService.getCart.mockResolvedValue(makeValidCart());
      // Simulate a DB failure inside the transaction
      mockDataSource.transaction.mockRejectedValue(new Error('deadlock detected'));

      const user = makeRequestUser();
      const dto = { paymentMethod: 'cash_on_delivery' as any };

      await expect(service.createOrder(user, dto)).rejects.toThrow('deadlock detected');
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return the order when found', async () => {
      const order = makeOrder();
      mockOrderRepository.findOne.mockResolvedValue(order);

      const result = await service.findOne('order-uuid-789');

      expect(result).toBe(order);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order-uuid-789' } }),
      );
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Order with ID non-existent-id not found'),
      );
    });
  });

  // ─── updateOrderStatus() ───────────────────────────────────────────────────

  describe('updateOrderStatus()', () => {
    /**
     * KEY LEARNING: Testing state machine behaviour
     * ===============================================
     * We test updateOrderStatus() with REAL state machine logic
     * (canRoleTransition is not mocked — it's a pure function).
     * This verifies both the service method AND the state machine integration.
     */
    it('should throw BadRequestException for an illegal status transition (PENDING→DELIVERED)', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING });
      mockOrderRepository.findOne.mockResolvedValue(order);

      const vendorUser = makeRequestUser({
        role: UserRole.VENDOR,
        vendorProfile: { id: 'vendor-profile-id' } as any,
        customerProfile: undefined,
      }) as RequestUser;

      await expect(
        service.updateOrderStatus(
          'order-uuid-789',
          { status: OrderStatus.DELIVERED },
          vendorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a CUSTOMER tries to confirm an order', async () => {
      const order = makeOrder({ status: OrderStatus.PENDING });
      mockOrderRepository.findOne.mockResolvedValue(order);

      const customer = makeRequestUser({ role: UserRole.CUSTOMER });

      await expect(
        service.updateOrderStatus(
          'order-uuid-789',
          { status: OrderStatus.CONFIRMED },
          customer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save and emit ORDER_STATUS_UPDATED when transition is valid', async () => {
      // PENDING → CONFIRMED by VENDOR is a valid transition
      const order = makeOrder({
        status: OrderStatus.PENDING,
        customerId: 'customer-profile-id',
        vendorId: 'vendor-profile-id',
      });
      mockOrderRepository.findOne.mockResolvedValue(order);
      mockOrderRepository.save.mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
      });

      const vendor = makeRequestUser({
        role: UserRole.VENDOR,
        vendorProfile: { id: 'vendor-profile-id' } as any,
        customerProfile: undefined,
      }) as RequestUser;

      const result = await service.updateOrderStatus(
        'order-uuid-789',
        { status: OrderStatus.CONFIRMED },
        vendor,
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,
        expect.objectContaining({
          newStatus: OrderStatus.CONFIRMED,
          previousStatus: OrderStatus.PENDING,
        }),
      );
    });
  });
});
