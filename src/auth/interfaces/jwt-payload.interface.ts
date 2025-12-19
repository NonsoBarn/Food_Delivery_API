export interface JwtPayload {
  sub: string; // Subject (user ID)
  email: string; // User email
  role: string; // User role
  iat?: number; // Issued at (automatically added)
  exp?: number; // Expiration (automatically added)
}
