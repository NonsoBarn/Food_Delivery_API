import { OrderStatus } from '../enums/order-status.enum';
export declare class UpdateOrderStatusDto {
    status: OrderStatus;
    cancellationReason?: string;
    estimatedPrepTimeMinutes?: number;
}
