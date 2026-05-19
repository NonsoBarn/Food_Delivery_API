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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
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

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ==================== Customer Profile ====================

  @Post('customer')
  @Version(API_VERSIONS.V1)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create customer profile' })
  @ApiResponse({ status: 201, description: 'Customer profile created' })
  async createCustomerProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateCustomerProfileDto,
  ) {
    return this.profileService.createCustomerProfile(user.id, createDto);
  }

  @Get('customer')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Get customer profile' })
  @ApiResponse({ status: 200, description: 'Customer profile' })
  async getCustomerProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getCustomerProfile(user.id);
  }

  @Put('customer')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Update customer profile' })
  @ApiResponse({ status: 200, description: 'Updated customer profile' })
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
  @ApiOperation({ summary: 'Create vendor profile' })
  @ApiResponse({ status: 201, description: 'Vendor profile created' })
  async createVendorProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateVendorProfileDto,
  ) {
    return this.profileService.createVendorProfile(user.id, createDto);
  }

  @Get('vendor')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Get vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile' })
  async getVendorProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getVendorProfile(user.id);
  }

  @Put('vendor')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Updated vendor profile' })
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
  @ApiOperation({ summary: 'Create rider profile' })
  @ApiResponse({ status: 201, description: 'Rider profile created' })
  async createRiderProfile(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateRiderProfileDto,
  ) {
    return this.profileService.createRiderProfile(user.id, createDto);
  }

  @Get('rider')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Get rider profile' })
  @ApiResponse({ status: 200, description: 'Rider profile' })
  async getRiderProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getRiderProfile(user.id);
  }

  @Put('rider')
  @Version(API_VERSIONS.V1)
  @ApiOperation({ summary: 'Update rider profile' })
  @ApiResponse({ status: 200, description: 'Updated rider profile' })
  async updateRiderProfile(
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateRiderProfileDto,
  ) {
    return this.profileService.updateRiderProfile(user.id, updateDto);
  }
}
