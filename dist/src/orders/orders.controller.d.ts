import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { User } from '../users/entities/user.entity';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(dto: CreateOrderDto, user: User): Promise<import("./entities/order.entity").Order[]>;
    getMyOrders(user: User, filters: OrderFilterDto): Promise<{
        orders: import("./entities/order.entity").Order[];
        total: number;
    }>;
    getVendorOrders(user: User, filters: OrderFilterDto): Promise<{
        orders: import("./entities/order.entity").Order[];
        total: number;
    }>;
    getAllOrders(filters: OrderFilterDto): Promise<{
        orders: import("./entities/order.entity").Order[];
        total: number;
    }>;
    getOrderGroup(orderGroupId: string, user: User): Promise<import("./entities/order.entity").Order[]>;
    getOrder(id: string, user: User): Promise<import("./entities/order.entity").Order>;
    updateOrderStatus(id: string, dto: UpdateOrderStatusDto, user: User): Promise<import("./entities/order.entity").Order>;
}
