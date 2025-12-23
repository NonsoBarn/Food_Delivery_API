import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerProfile } from './entities/customer-profile.entity';
import { VendorProfile, VendorStatus } from './entities/vendor-profile.entity';
import { RiderProfile, RiderStatus } from './entities/rider-profile.entity';
import { User } from './entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateVendorProfileDto } from './dto/create-vendor-profile.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,

    @InjectRepository(VendorProfile)
    private readonly vendorProfileRepository: Repository<VendorProfile>,

    @InjectRepository(RiderProfile)
    private readonly riderProfileRepository: Repository<RiderProfile>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ==================== Customer Profile ====================

  async createCustomerProfile(
    userId: string,
    createDto: CreateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    // Check if profile already exists
    const existing = await this.customerProfileRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Customer profile already exists');
    }

    // Verify user is a customer
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException('User must have customer role');
    }

    const profile = this.customerProfileRepository.create({
      ...createDto,
      userId,
    });

    const savedProfile = await this.customerProfileRepository.save(profile);
    this.logger.log(`Customer profile created for user: ${userId}`);

    return savedProfile;
  }

  async getCustomerProfile(userId: string): Promise<CustomerProfile> {
    const profile = await this.customerProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    return profile;
  }

  async updateCustomerProfile(
    userId: string,
    updateDto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    const profile = await this.getCustomerProfile(userId);

    Object.assign(profile, updateDto);

    const updatedProfile = await this.customerProfileRepository.save(profile);
    this.logger.log(`Customer profile updated for user: ${userId}`);

    return updatedProfile;
  }

  // ==================== Vendor Profile ====================

  async createVendorProfile(
    userId: string,
    createDto: CreateVendorProfileDto,
  ): Promise<VendorProfile> {
    const existing = await this.vendorProfileRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Vendor profile already exists');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.VENDOR) {
      throw new BadRequestException('User must have vendor role');
    }

    const profile = this.vendorProfileRepository.create({
      ...createDto,
      userId,
      status: VendorStatus.PENDING, // Default to pending
    });

    const savedProfile = await this.vendorProfileRepository.save(profile);
    this.logger.log(`Vendor profile created for user: ${userId}`);

    return savedProfile;
  }

  async getVendorProfile(userId: string): Promise<VendorProfile> {
    const profile = await this.vendorProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return profile;
  }

  async updateVendorProfile(
    userId: string,
    updateDto: UpdateVendorProfileDto,
  ): Promise<VendorProfile> {
    const profile = await this.getVendorProfile(userId);

    Object.assign(profile, updateDto);

    const updatedProfile = await this.vendorProfileRepository.save(profile);
    this.logger.log(`Vendor profile updated for user: ${userId}`);

    return updatedProfile;
  }

  // ==================== Rider Profile ====================

  async createRiderProfile(
    userId: string,
    createDto: CreateRiderProfileDto,
  ): Promise<RiderProfile> {
    const existing = await this.riderProfileRepository.findOne({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException('Rider profile already exists');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.RIDER) {
      throw new BadRequestException('User must have rider role');
    }

    const profile = this.riderProfileRepository.create({
      ...createDto,
      userId,
      status: RiderStatus.PENDING, // Default to pending
    });

    const savedProfile = await this.riderProfileRepository.save(profile);
    this.logger.log(`Rider profile created for user: ${userId}`);

    return savedProfile;
  }

  async getRiderProfile(userId: string): Promise<RiderProfile> {
    const profile = await this.riderProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Rider profile not found');
    }

    return profile;
  }

  async updateRiderProfile(
    userId: string,
    updateDto: UpdateRiderProfileDto,
  ): Promise<RiderProfile> {
    const profile = await this.getRiderProfile(userId);

    Object.assign(profile, updateDto);

    const updatedProfile = await this.riderProfileRepository.save(profile);
    this.logger.log(`Rider profile updated for user: ${userId}`);

    return updatedProfile;
  }
}
