import { RiderStatus, AvailabilityStatus } from '../../users/entities/rider-profile.entity';
export declare class RiderFilterDto {
    status?: RiderStatus;
    availabilityStatus?: AvailabilityStatus;
    page?: number;
    limit?: number;
}
