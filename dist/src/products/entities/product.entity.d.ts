import { Category } from './category.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { ProductImage } from './product-image.entity';
import { ProductStatus } from '../enums/product-status.enum';
export declare class Product {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
    sku: string;
    status: ProductStatus;
    category: Category;
    categoryId: string;
    vendor: VendorProfile;
    vendorId: string;
    images: ProductImage[];
    viewCount: number;
    orderCount: number;
    rating: number;
    reviewCount: number;
    createdAt: Date;
    updatedAt: Date;
}
