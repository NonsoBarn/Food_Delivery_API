import { Repository } from 'typeorm';
import { RiderProfile, AvailabilityStatus } from '../../users/entities/rider-profile.entity';
import { Delivery } from '../entities/delivery.entity';
import { RiderFilterDto } from '../dto/rider-filter.dto';
export declare class RiderManagementService {
    private readonly riderRepository;
    private readonly deliveryRepository;
    private readonly logger;
    constructor(riderRepository: Repository<RiderProfile>, deliveryRepository: Repository<Delivery>);
    approveRider(riderId: string, adminUserId: string): Promise<RiderProfile>;
    rejectRider(riderId: string, rejectionReason: string): Promise<RiderProfile>;
    suspendRider(riderId: string): Promise<RiderProfile>;
    findAllRiders(filters: RiderFilterDto): Promise<{
        riders: RiderProfile[];
        total: number;
    }>;
    findAvailableRiders(): Promise<RiderProfile[]>;
    toggleAvailability(riderProfileId: string, availabilityStatus: AvailabilityStatus): Promise<RiderProfile>;
    findRiderDeliveries(riderId: string, page?: number, limit?: number): Promise<{
        deliveries: Delivery[];
        total: number;
    }>;
    private findRiderOrFail;
}
