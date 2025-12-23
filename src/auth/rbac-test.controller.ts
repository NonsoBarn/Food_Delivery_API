import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { API_VERSIONS } from '../common/constants/api-versions';
import type { RequestUser } from './interfaces/jwt-payload.interface';

@Controller('rbac-test')
@UseGuards(JwtAuthGuard, RolesGuard) // ← Apply to entire controller
export class RbacTestController {
  // Anyone authenticated can access
  @Get('public')
  @Version(API_VERSIONS.V1)
  publicRoute(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is accessible to all authenticated users',
      user,
    };
  }

  // Only customers
  @Get('customer-only')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.CUSTOMER)
  customerOnly(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is only for customers',
      user,
    };
  }

  // Only vendors
  @Get('vendor-only')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.VENDOR)
  vendorOnly(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is only for vendors',
      user,
    };
  }

  // Only riders
  @Get('rider-only')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.RIDER)
  riderOnly(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is only for riders',
      user,
    };
  }

  // Only admins
  @Get('admin-only')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.ADMIN)
  adminOnly(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is only for admins',
      user,
    };
  }

  // Vendors OR Admins
  @Get('vendor-or-admin')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  vendorOrAdmin(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is for vendors or admins',
      user,
    };
  }

  // All roles except customer
  @Get('not-customer')
  @Version(API_VERSIONS.V1)
  @Roles(UserRole.VENDOR, UserRole.RIDER, UserRole.ADMIN)
  notCustomer(@CurrentUser() user: RequestUser) {
    return {
      message: 'This route is for vendors, riders, or admins',
      user,
    };
  }
}
