import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard
 *
 * Like JwtAuthGuard but does NOT throw if the token is missing or invalid.
 * Instead, it sets request.user = null and lets the route handler decide
 * what to do (e.g., treat as anonymous).
 *
 * Used on cart routes where both anonymous and authenticated users can shop.
 *
 * KEY LEARNING: When to use optional auth
 * =========================================
 * Use JwtAuthGuard (strict) when the route REQUIRES authentication.
 * Use OptionalJwtAuthGuard when the route WORKS for both auth and anon.
 *
 * Cart routes need this pattern:
 *   - Anonymous: cart stored under session ID → migrated on login
 *   - Authenticated: cart stored under user.id → persists across devices
 *
 * Without this guard, @CurrentUser() always returns undefined even when
 * the Authorization header is present, because the JWT passport strategy
 * never runs (no guard = no strategy invocation).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override canActivate so a missing/invalid token never throws
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // handleRequest is called after the JWT strategy runs.
  // Returning null here (instead of throwing) makes the token optional.
  handleRequest(_err: any, user: any) {
    // If JWT is missing or invalid, user is null/undefined — that's fine.
    // Return null so request.user = null; @CurrentUser() returns undefined.
    return user || null;
  }
}
