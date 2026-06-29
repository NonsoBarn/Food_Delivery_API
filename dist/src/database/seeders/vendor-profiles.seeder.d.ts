import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
export declare function seedVendorProfiles(dataSource: DataSource, users: User[]): Promise<VendorProfile[]>;
