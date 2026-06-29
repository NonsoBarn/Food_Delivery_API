import { UserRole } from 'src/common/enums/user-role.enum';
import { CustomerProfile } from './customer-profile.entity';
import { VendorProfile } from './vendor-profile.entity';
import { RiderProfile } from './rider-profile.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    role: UserRole;
    customerProfile?: CustomerProfile;
    vendorProfile?: VendorProfile;
    riderProfile?: RiderProfile;
    createdAt: Date;
    updatedAt: Date;
    hashPassword(): Promise<void>;
    comparePassword(plainPassword: string): Promise<boolean>;
}
