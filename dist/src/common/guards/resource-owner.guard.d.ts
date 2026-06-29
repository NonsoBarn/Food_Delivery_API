import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ResourceOwnerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
