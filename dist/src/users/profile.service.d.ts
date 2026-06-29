import { Repository } from 'typeorm';
import { CustomerProfile } from './entities/customer-profile.entity';
import { VendorProfile } from './entities/vendor-profile.entity';
import { RiderProfile } from './entities/rider-profile.entity';
import { User } from './entities/user.entity';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateVendorProfileDto } from './dto/create-vendor-profile.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
export declare class ProfileService {
    private readonly customerProfileRepository;
    private readonly vendorProfileRepository;
    private readonly riderProfileRepository;
    private readonly userRepository;
    private readonly logger;
    constructor(customerProfileRepository: Repository<CustomerProfile>, vendorProfileRepository: Repository<VendorProfile>, riderProfileRepository: Repository<RiderProfile>, userRepository: Repository<User>);
    createCustomerProfile(userId: string, createDto: CreateCustomerProfileDto): Promise<CustomerProfile>;
    getCustomerProfile(userId: string): Promise<CustomerProfile>;
    updateCustomerProfile(userId: string, updateDto: UpdateCustomerProfileDto): Promise<CustomerProfile>;
    createVendorProfile(userId: string, createDto: CreateVendorProfileDto): Promise<VendorProfile>;
    getVendorProfile(userId: string): Promise<VendorProfile>;
    updateVendorProfile(userId: string, updateDto: UpdateVendorProfileDto): Promise<VendorProfile>;
    createRiderProfile(userId: string, createDto: CreateRiderProfileDto): Promise<RiderProfile>;
    getRiderProfile(userId: string): Promise<RiderProfile>;
    updateRiderProfile(userId: string, updateDto: UpdateRiderProfileDto): Promise<RiderProfile>;
}
