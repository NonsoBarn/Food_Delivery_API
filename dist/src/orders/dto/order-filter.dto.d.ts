import { OrderStatus } from '../enums/order-status.enum';
export declare class OrderFilterDto {
    status?: OrderStatus;
    vendorId?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: 'createdAt' | 'total' | 'status';
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
}
