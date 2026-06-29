import { RiderManagementService } from '../services/rider-management.service';
import { RiderLocationService } from '../services/rider-location.service';
import { RejectRiderDto } from '../dto/reject-rider.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { FindNearbyRidersDto } from '../dto/find-nearby-riders.dto';
import { RiderFilterDto } from '../dto/rider-filter.dto';
import { User } from '../../users/entities/user.entity';
export declare class RiderManagementController {
    private readonly riderManagementService;
    private readonly riderLocationService;
    constructor(riderManagementService: RiderManagementService, riderLocationService: RiderLocationService);
    getAllRiders(filters: RiderFilterDto): Promise<{
        riders: import("../../users/entities/rider-profile.entity").RiderProfile[];
        total: number;
    }>;
    getAvailableRiders(): Promise<import("../../users/entities/rider-profile.entity").RiderProfile[]>;
    toggleAvailability(dto: UpdateAvailabilityDto, user: User): Promise<import("../../users/entities/rider-profile.entity").RiderProfile | {
        message: string;
    }>;
    updateLocation(dto: UpdateLocationDto, user: User): Promise<{
        message: string;
    }>;
    findNearbyRiders(dto: FindNearbyRidersDto): Promise<{
        riderId: string;
        distanceKm: number;
        latitude: number;
        longitude: number;
    }[]>;
    getMyDeliveries(user: User, page?: number, limit?: number): Promise<{
        deliveries: import("../entities/delivery.entity").Delivery[];
        total: number;
    }>;
    approveRider(riderId: string, user: User): Promise<import("../../users/entities/rider-profile.entity").RiderProfile>;
    rejectRider(riderId: string, dto: RejectRiderDto): Promise<import("../../users/entities/rider-profile.entity").RiderProfile>;
    suspendRider(riderId: string): Promise<import("../../users/entities/rider-profile.entity").RiderProfile>;
}
