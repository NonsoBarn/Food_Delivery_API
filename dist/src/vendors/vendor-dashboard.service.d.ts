import { Repository } from 'typeorm';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { RevenueQueryDto } from './dto/revenue-query.dto';
export declare class VendorDashboardService {
    private readonly vendorProfileRepo;
    private readonly orderRepo;
    private readonly orderItemRepo;
    private readonly productRepo;
    private readonly logger;
    constructor(vendorProfileRepo: Repository<VendorProfile>, orderRepo: Repository<Order>, orderItemRepo: Repository<OrderItem>, productRepo: Repository<Product>);
    getVendorDashboard(userId: string): Promise<object>;
    getProductPerformance(userId: string): Promise<object[]>;
    getRevenueBreakdown(userId: string, query: RevenueQueryDto): Promise<object>;
    private resolveVendorProfile;
    private buildDateRange;
}
