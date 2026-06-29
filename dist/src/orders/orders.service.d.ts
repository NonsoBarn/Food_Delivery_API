import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../common/enums/user-role.enum';
export declare class OrdersService {
    private readonly orderRepository;
    private readonly orderItemRepository;
    private readonly dataSource;
    private readonly cartService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, dataSource: DataSource, cartService: CartService, eventEmitter: EventEmitter2);
    createOrder(user: RequestUser, dto: CreateOrderDto): Promise<Order[]>;
    findOne(orderId: string): Promise<Order>;
    findOrdersByGroup(orderGroupId: string, userId: string, userRole: UserRole): Promise<Order[]>;
    findCustomerOrders(customerId: string, filters: OrderFilterDto): Promise<{
        orders: Order[];
        total: number;
    }>;
    findVendorOrders(vendorId: string, filters: OrderFilterDto): Promise<{
        orders: Order[];
        total: number;
    }>;
    findAllOrders(filters: OrderFilterDto): Promise<{
        orders: Order[];
        total: number;
    }>;
    updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, user: RequestUser): Promise<Order>;
    private verifyOrderAccess;
    private restoreStock;
    private applyFilters;
    private paginateQuery;
    private generateOrderNumber;
    private generateUUID;
}
