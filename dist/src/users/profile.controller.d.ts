import { ProfileService } from './profile.service';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateVendorProfileDto } from './dto/create-vendor-profile.dto';
import { UpdateVendorProfileDto } from './dto/update-vendor-profile.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import type { RequestUser } from 'src/auth/interfaces/jwt-payload.interface';
export declare class ProfileController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    createCustomerProfile(user: RequestUser, createDto: CreateCustomerProfileDto): Promise<import("./entities/customer-profile.entity").CustomerProfile>;
    getCustomerProfile(user: RequestUser): Promise<import("./entities/customer-profile.entity").CustomerProfile>;
    updateCustomerProfile(user: RequestUser, updateDto: UpdateCustomerProfileDto): Promise<import("./entities/customer-profile.entity").CustomerProfile>;
    createVendorProfile(user: RequestUser, createDto: CreateVendorProfileDto): Promise<import("./entities/vendor-profile.entity").VendorProfile>;
    getVendorProfile(user: RequestUser): Promise<import("./entities/vendor-profile.entity").VendorProfile>;
    updateVendorProfile(user: RequestUser, updateDto: UpdateVendorProfileDto): Promise<import("./entities/vendor-profile.entity").VendorProfile>;
    createRiderProfile(user: RequestUser, createDto: CreateRiderProfileDto): Promise<import("./entities/rider-profile.entity").RiderProfile>;
    getRiderProfile(user: RequestUser): Promise<import("./entities/rider-profile.entity").RiderProfile>;
    updateRiderProfile(user: RequestUser, updateDto: UpdateRiderProfileDto): Promise<import("./entities/rider-profile.entity").RiderProfile>;
}
