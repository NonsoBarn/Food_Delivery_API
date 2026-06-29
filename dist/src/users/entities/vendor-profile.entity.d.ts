import { User } from './user.entity';
import { Product } from 'src/products/entities/product.entity';
export declare enum VendorStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    SUSPENDED = "suspended"
}
export declare class VendorProfile {
    id: string;
    businessName: string;
    businessDescription: string;
    businessPhone: string;
    businessAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    businessLicense: string;
    taxId: string;
    logoUrl: string;
    bannerUrl: string;
    status: VendorStatus;
    rejectionReason: string;
    approvedAt: Date;
    approvedBy: string;
    businessHours: {
        monday?: {
            open: string;
            close: string;
        };
        tuesday?: {
            open: string;
            close: string;
        };
        wednesday?: {
            open: string;
            close: string;
        };
        thursday?: {
            open: string;
            close: string;
        };
        friday?: {
            open: string;
            close: string;
        };
        saturday?: {
            open: string;
            close: string;
        };
        sunday?: {
            open: string;
            close: string;
        };
    };
    rating: number;
    totalReviews: number;
    user: User;
    products: Product[];
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
