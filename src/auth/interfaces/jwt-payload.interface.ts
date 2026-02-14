import { UserRole } from 'src/common/enums/user-role.enum';
import { VendorStatus } from 'src/users/entities/vendor-profile.entity';

export interface JwtPayload {
  sub: string; // Subject (user ID)
  email: string; // User email
  role: UserRole; // User role
  iat?: number; // Issued at (automatically added)
  exp?: number; // Expiration (automatically added)
}

// Helper type for the user object attached to request
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
}
