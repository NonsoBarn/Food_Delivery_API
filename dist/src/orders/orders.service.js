"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const product_entity_1 = require("../products/entities/product.entity");
const cart_service_1 = require("../cart/cart.service");
const order_status_enum_1 = require("./enums/order-status.enum");
const payment_status_enum_1 = require("./enums/payment-status.enum");
const product_status_enum_1 = require("../products/enums/product-status.enum");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const order_status_machine_1 = require("./order-status-machine");
const notification_events_1 = require("../notifications/events/notification-events");
let OrdersService = OrdersService_1 = class OrdersService {
    orderRepository;
    orderItemRepository;
    dataSource;
    cartService;
    eventEmitter;
    logger = new common_1.Logger(OrdersService_1.name);
    constructor(orderRepository, orderItemRepository, dataSource, cartService, eventEmitter) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.dataSource = dataSource;
        this.cartService = cartService;
        this.eventEmitter = eventEmitter;
    }
    async createOrder(user, dto) {
        if (!user.customerProfile) {
            throw new common_1.BadRequestException('You need a customer profile to place an order. Please create one first.');
        }
        const customerProfile = user.customerProfile;
        const deliveryAddress = dto.deliveryAddress || customerProfile.deliveryAddress;
        if (!deliveryAddress) {
            throw new common_1.BadRequestException('No delivery address provided. Either set one in your profile or include it in the order.');
        }
        const validation = await this.cartService.validateCart(user.id);
        if (!validation.valid) {
            throw new common_1.BadRequestException({
                message: 'Cart validation failed. Please review your cart.',
                errors: validation.errors,
                warnings: validation.warnings,
            });
        }
        const cart = await this.cartService.getCart(user.id, true);
        if (cart.isEmpty) {
            throw new common_1.BadRequestException('Your cart is empty');
        }
        const orderGroupId = this.generateUUID();
        const createdOrders = await this.dataSource.transaction(async (manager) => {
            const orders = [];
            for (const [vendorId, vendorGroup] of Object.entries(cart.itemsByVendor)) {
                const orderNumber = this.generateOrderNumber();
                const order = manager.create(order_entity_1.Order, {
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
                    tax: 0,
                    deliveryFee: 0,
                    total: vendorGroup.subtotal,
                    paymentMethod: dto.paymentMethod,
                    status: order_status_enum_1.OrderStatus.PENDING,
                    paymentStatus: payment_status_enum_1.PaymentStatus.PENDING,
                    customerNotes: dto.customerNotes,
                });
                const savedOrder = await manager.save(order_entity_1.Order, order);
                const orderItems = [];
                for (const cartItem of vendorGroup.items) {
                    const orderItem = manager.create(order_item_entity_1.OrderItem, {
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
                    const product = await manager.findOne(product_entity_1.Product, {
                        where: { id: cartItem.productId },
                        lock: { mode: 'pessimistic_write' },
                    });
                    if (!product) {
                        throw new common_1.BadRequestException(`Product "${cartItem.name}" is no longer available`);
                    }
                    if (product.status !== product_status_enum_1.ProductStatus.PUBLISHED) {
                        throw new common_1.BadRequestException(`Product "${product.name}" is no longer available for purchase`);
                    }
                    if (product.stock !== -1) {
                        if (product.stock < cartItem.quantity) {
                            throw new common_1.BadRequestException(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${cartItem.quantity}`);
                        }
                        product.stock -= cartItem.quantity;
                        if (product.stock === 0) {
                            product.status = product_status_enum_1.ProductStatus.OUT_OF_STOCK;
                        }
                    }
                    product.orderCount = (product.orderCount || 0) + 1;
                    await manager.save(product_entity_1.Product, product);
                }
                await manager.save(order_item_entity_1.OrderItem, orderItems);
                savedOrder.items = orderItems;
                orders.push(savedOrder);
            }
            return orders;
        });
        try {
            await this.cartService.clearCart(user.id, true);
        }
        catch (error) {
            this.logger.warn(`Failed to clear cart for user ${user.id} after order creation: ${error.message}`);
        }
        this.logger.log(`Created ${createdOrders.length} order(s) for customer ${customerProfile.id} (group: ${orderGroupId})`);
        for (const order of createdOrders) {
            const event = {
                orderId: order.id,
                orderNumber: order.orderNumber,
                orderGroupId: order.orderGroupId,
                customerId: order.customerId,
                vendorProfileId: order.vendorId,
                total: Number(order.total),
                itemCount: order.items?.length ?? 0,
                createdAt: order.createdAt,
            };
            this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.ORDER_CREATED, event);
        }
        return createdOrders;
    }
    async findOne(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'vendor'],
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found`);
        }
        return order;
    }
    async findOrdersByGroup(orderGroupId, userId, userRole) {
        const query = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.vendor', 'vendor')
            .where('order.orderGroupId = :orderGroupId', { orderGroupId });
        if (userRole !== user_role_enum_1.UserRole.ADMIN) {
            query.andWhere('order.customerId = :customerId', {
                customerId: userId,
            });
        }
        return await query.orderBy('order.createdAt', 'ASC').getMany();
    }
    async findCustomerOrders(customerId, filters) {
        const query = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.vendor', 'vendor')
            .where('order.customerId = :customerId', { customerId });
        this.applyFilters(query, filters);
        return await this.paginateQuery(query, filters);
    }
    async findVendorOrders(vendorId, filters) {
        const query = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.customer', 'customer')
            .where('order.vendorId = :vendorId', { vendorId });
        this.applyFilters(query, filters);
        return await this.paginateQuery(query, filters);
    }
    async findAllOrders(filters) {
        const query = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.customer', 'customer')
            .leftJoinAndSelect('order.vendor', 'vendor');
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
    async updateOrderStatus(orderId, dto, user) {
        const order = await this.findOne(orderId);
        this.verifyOrderAccess(order, user);
        if (!(0, order_status_machine_1.canRoleTransition)(order.status, dto.status, user.role)) {
            const validNext = (0, order_status_machine_1.getValidNextStatuses)(order.status, user.role);
            throw new common_1.BadRequestException(`Cannot transition from "${order.status}" to "${dto.status}". ` +
                `Valid next statuses for your role: [${validNext.join(', ')}]`);
        }
        const previousStatus = order.status;
        order.status = dto.status;
        switch (dto.status) {
            case order_status_enum_1.OrderStatus.CONFIRMED:
                order.confirmedAt = new Date();
                if (dto.estimatedPrepTimeMinutes) {
                    order.estimatedPrepTimeMinutes = dto.estimatedPrepTimeMinutes;
                }
                break;
            case order_status_enum_1.OrderStatus.PREPARING:
                order.preparingAt = new Date();
                break;
            case order_status_enum_1.OrderStatus.READY_FOR_PICKUP:
                order.readyAt = new Date();
                break;
            case order_status_enum_1.OrderStatus.PICKED_UP:
                order.pickedUpAt = new Date();
                break;
            case order_status_enum_1.OrderStatus.DELIVERED:
                order.deliveredAt = new Date();
                if (order.paymentStatus === payment_status_enum_1.PaymentStatus.PENDING) {
                    order.paymentStatus = payment_status_enum_1.PaymentStatus.PAID;
                }
                break;
            case order_status_enum_1.OrderStatus.CANCELLED:
                order.cancelledAt = new Date();
                order.cancellationReason =
                    dto.cancellationReason || 'No reason provided';
                await this.restoreStock(order);
                break;
        }
        const savedOrder = await this.orderRepository.save(order);
        this.logger.log(`Order ${order.orderNumber} status changed: ${previousStatus} → ${dto.status} by ${user.role} (${user.id})`);
        const statusEvent = {
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            previousStatus,
            newStatus: dto.status,
            customerId: savedOrder.customerId,
            vendorProfileId: savedOrder.vendorId,
            riderId: savedOrder.riderId ?? undefined,
            updatedBy: user.role,
            timestamp: new Date(),
            estimatedPrepTimeMinutes: savedOrder.estimatedPrepTimeMinutes ?? undefined,
            cancellationReason: savedOrder.cancellationReason ?? undefined,
        };
        this.eventEmitter.emit(notification_events_1.NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED, statusEvent);
        return savedOrder;
    }
    verifyOrderAccess(order, user) {
        switch (user.role) {
            case user_role_enum_1.UserRole.CUSTOMER:
                if (order.customerId !== user.customerProfile?.id) {
                    throw new common_1.ForbiddenException('You can only manage your own orders');
                }
                break;
            case user_role_enum_1.UserRole.VENDOR:
                if (order.vendorId !== user.vendorProfile?.id) {
                    throw new common_1.ForbiddenException('You can only manage orders for your products');
                }
                break;
            case user_role_enum_1.UserRole.ADMIN:
                break;
            default:
                throw new common_1.ForbiddenException('You do not have access to this order');
        }
    }
    async restoreStock(order) {
        if (!order.items) {
            order.items = await this.orderItemRepository.find({
                where: { orderId: order.id },
            });
        }
        await this.dataSource.transaction(async (manager) => {
            for (const item of order.items) {
                const product = await manager.findOne(product_entity_1.Product, {
                    where: { id: item.productId },
                });
                if (product && product.stock !== -1) {
                    product.stock += item.quantity;
                    if (product.status === product_status_enum_1.ProductStatus.OUT_OF_STOCK) {
                        product.status = product_status_enum_1.ProductStatus.PUBLISHED;
                    }
                    await manager.save(product_entity_1.Product, product);
                }
            }
        });
    }
    applyFilters(query, filters) {
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
    async paginateQuery(query, filters) {
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
    generateOrderNumber() {
        const now = new Date();
        const dateStr = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let suffix = '';
        for (let i = 0; i < 6; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `ORD-${dateStr}-${suffix}`;
    }
    generateUUID() {
        return crypto.randomUUID();
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        cart_service_1.CartService,
        event_emitter_1.EventEmitter2])
], OrdersService);
//# sourceMappingURL=orders.service.js.map