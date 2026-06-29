import { DeliveryService } from '../services/delivery.service';
import { RiderLocationService } from '../services/rider-location.service';
import { AssignDeliveryDto } from '../dto/assign-delivery.dto';
import { AutoAssignDto } from '../dto/auto-assign.dto';
import { CompleteDeliveryDto } from '../dto/complete-delivery.dto';
import { CancelDeliveryDto } from '../dto/cancel-delivery.dto';
import { User } from '../../users/entities/user.entity';
export declare class DeliveryController {
    private readonly deliveryService;
    private readonly riderLocationService;
    constructor(deliveryService: DeliveryService, riderLocationService: RiderLocationService);
    assignDelivery(dto: AssignDeliveryDto, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    autoAssignDelivery(dto: AutoAssignDto): Promise<{
        message: string;
        assigned: boolean;
        delivery?: undefined;
    } | {
        delivery: import("../entities/delivery.entity").Delivery;
        assigned: boolean;
        message?: undefined;
    }>;
    getActiveDelivery(user: User): Promise<import("../entities/delivery.entity").Delivery | null>;
    getDeliveryByOrder(orderId: string): Promise<import("../entities/delivery.entity").Delivery | null>;
    trackDelivery(orderId: string): Promise<{
        riderId: string;
        latitude: number;
        longitude: number;
        timestamp: number;
        heading?: number;
        speed?: number;
        deliveryStatus: import("../enums/delivery-status.enum").DeliveryStatus;
    } | null>;
    acceptDelivery(id: string, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    rejectDelivery(id: string, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    pickUpDelivery(id: string, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    completeDelivery(id: string, dto: CompleteDeliveryDto, proofImage: Express.Multer.File, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    cancelDelivery(id: string, dto: CancelDeliveryDto, user: User): Promise<import("../entities/delivery.entity").Delivery>;
    getDelivery(id: string): Promise<import("../entities/delivery.entity").Delivery>;
}
