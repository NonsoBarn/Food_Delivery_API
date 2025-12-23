import { UserRole } from 'src/common/enums/user-role.enum';
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
}
