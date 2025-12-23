import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Version,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateVendorProfileDto } from './dto/create-vendor-profile.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { API_VERSIONS } from '../common/constants/api-versions';
import type { RequestUser } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ==================== Customer Profile ====================

  @Post('customer')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.CREATED)
  async createCustomerProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateCustomerProfileDto,
  ) {
    return this.profileService.createCustomerProfile(user.id, createDto);
  }

  @Get('customer')
  @Version(API_VERSIONS.V1)
  async getCustomerProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getCustomerProfile(user.id);
  }

  @Put('customer')
  @Version(API_VERSIONS.V1)
  async updateCustomerProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateCustomerProfileDto,
  ) {
    return this.profileService.updateCustomerProfile(user.id, updateDto);
  }

  // ==================== Vendor Profile ====================

  @Post('vendor')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.CREATED)
  async createVendorProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateVendorProfileDto,
  ) {
    return this.profileService.createVendorProfile(user.id, createDto);
  }

  @Get('vendor')
  @Version(API_VERSIONS.V1)
  async getVendorProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getVendorProfile(user.id);
  }

  @Put('vendor')
  @Version(API_VERSIONS.V1)
  async updateVendorProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateVendorProfileDto,
  ) {
    return this.profileService.updateVendorProfile(user.id, updateDto);
  }

  // ==================== Rider Profile ====================

  @Post('rider')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.CREATED)
  async createRiderProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateRiderProfileDto,
  ) {
    return this.profileService.createRiderProfile(user.id, createDto);
  }
  @Get('rider')
  @Version(API_VERSIONS.V1)
  async getRiderProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getRiderProfile(user.id);
  }
  @Put('rider')
  @Version(API_VERSIONS.V1)
  async updateRiderProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateRiderProfileDto,
  ) {
    return this.profileService.updateRiderProfile(user.id, updateDto);
  }
}
