import { VendorDashboardService } from './vendor-dashboard.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { User } from '../users/entities/user.entity';
export declare class VendorDashboardController {
    private readonly vendorDashboardService;
    constructor(vendorDashboardService: VendorDashboardService);
    getDashboard(user: User): Promise<{
        message: string;
        data: object;
    }>;
    getProductPerformance(user: User): Promise<{
        message: string;
        data: object[];
    }>;
    getRevenueBreakdown(user: User, query: RevenueQueryDto): Promise<{
        message: string;
        data: object;
    }>;
}
