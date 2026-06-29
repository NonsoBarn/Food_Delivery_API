import { OrderStatus } from './enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
export declare function canTransition(from: OrderStatus, to: OrderStatus): boolean;
export declare function canRoleTransition(from: OrderStatus, to: OrderStatus, role: UserRole): boolean;
export declare function getValidNextStatuses(currentStatus: OrderStatus, role: UserRole): OrderStatus[];
