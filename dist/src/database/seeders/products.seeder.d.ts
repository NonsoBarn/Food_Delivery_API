import { DataSource } from 'typeorm';
import { Category } from '../../products/entities/category.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
export declare function seedProducts(dataSource: DataSource, vendors: VendorProfile[], categories: Category[]): Promise<void>;
