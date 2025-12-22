/**
 * PermissionChecker Utility
 *
 * This class provides reusable methods to check user permissions and ownership
 * inside service or business logic layers.
 *
 * Key use cases:
 * 1. Check if a user has one of the required roles (hasRole / ensureRole).
 * 2. Verify admin privileges (isAdmin).
 * 3. Check if the current user owns a resource (isOwner).
 * 4. Allow actions for owners or admins (isOwnerOrAdmin).
 *
 * Why it’s useful:
 * - Guards control route access, but some checks need to happen inside services
 *   where ownership or role-based logic is required.
 * - Centralizes permission logic for consistency and reusability.
 */

import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

export class PermissionChecker {
  /**
   * Check if user has required role
   */
  static hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  /**
   * Ensure user has required role or throw exception
   */
  static ensureRole(userRole: UserRole, requiredRoles: UserRole[]): void {
    if (!this.hasRole(userRole, requiredRoles)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }
  }

  /**
   * Check if user is admin
   */
  static isAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.ADMIN;
  }

  /**
   * Check if user owns resource
   */
  static isOwner(userId: string, resourceOwnerId: string): boolean {
    return userId === resourceOwnerId;
  }

  /**
   * Check if user is owner or admin
   */
  static isOwnerOrAdmin(
    userId: string,
    userRole: UserRole,
    resourceOwnerId: string,
  ): boolean {
    return this.isOwner(userId, resourceOwnerId) || this.isAdmin(userRole);
  }
}
