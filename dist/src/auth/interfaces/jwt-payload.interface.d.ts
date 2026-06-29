import { UserRole } from 'src/common/enums/user-role.enum';
import { VendorStatus } from 'src/users/entities/vendor-profile.entity';
import { RiderStatus, AvailabilityStatus } from 'src/users/entities/rider-profile.entity';
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface RequestUser {
    id: string;
    email: string;
    role: UserRole;
    vendorProfile?: {
        id: string;
        businessName: string;
        status: VendorStatus;
    };
    customerProfile?: {
        id: string;
        deliveryAddress: string;
        city: string;
        state: string;
        postalCode: string;
        latitude: number;
        longitude: number;
    };
    riderProfile?: {
        id: string;
        status: RiderStatus;
        availabilityStatus: AvailabilityStatus;
    };
}
