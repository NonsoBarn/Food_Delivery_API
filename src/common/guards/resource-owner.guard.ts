import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';
import { RequestUser } from 'src/auth/interfaces/jwt-payload.interface';

/**
 * ResourceOwnerGuard
 *
 * This guard ensures that a user can only access resources they own,
 * unless they are an admin.
 *
 * Key points:
 * 1. Must be used **after JwtAuthGuard**, since it relies on `request.user`.
 * 2. Admins bypass ownership checks and can access all resources.
 * 3. Ownership is determined by comparing `user.id` with `resourceOwnerId`
 *    from request params or body.
 * 4. Throws ForbiddenException if a non-admin tries to access a resource
 *    they do not own.
 *
 * Typical use cases:
 * - Updating a user profile (`PATCH /users/:userId`)
 * - Accessing private resources (orders, posts, settings)
 *   where only the owner or an admin is allowed.
 */

/**
 * Typed request interface for ResourceOwnerGuard
 */
interface RequestWithUserAndOwner extends Request {
  user: RequestUser;
  params: { userId?: string };
  body: { userId?: string };
}

/**
 * ResourceOwnerGuard
 *
 * Ensures a user can only access resources they own, unless they are an admin.
 * Must be used **after JwtAuthGuard**, since it relies on `request.user`.
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Use fully typed request interface
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUserAndOwner>();
    const { user, params, body } = request;

    // Admins can access anything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get resource owner ID safely
    const resourceOwnerId = params.userId ?? body.userId;

    if (!resourceOwnerId || user.id !== resourceOwnerId) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}
