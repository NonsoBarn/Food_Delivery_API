import { Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
export declare class ReportsJob {
    private readonly orderRepo;
    private readonly userRepo;
    private readonly logger;
    constructor(orderRepo: Repository<Order>, userRepo: Repository<User>);
    generateDailyReport(): Promise<void>;
    generateWeeklyReport(): Promise<void>;
    private getOrderStatsByDateRange;
    private getYesterdayRange;
    private getLastWeekRange;
}
