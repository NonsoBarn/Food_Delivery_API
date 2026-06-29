import { UserRole } from '../enums/user-role.enum';
export declare class PermissionChecker {
    static hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean;
    static ensureRole(userRole: UserRole, requiredRoles: UserRole[]): void;
    static isAdmin(userRole: UserRole): boolean;
    static isOwner(userId: string, resourceOwnerId: string): boolean;
    static isOwnerOrAdmin(userId: string, userRole: UserRole, resourceOwnerId: string): boolean;
}
