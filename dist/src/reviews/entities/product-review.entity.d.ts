import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { Product } from '../../products/entities/product.entity';
export declare class ProductReview {
    id: string;
    customer: CustomerProfile;
    customerId: string;
    product: Product;
    productId: string;
    rating: number;
    comment: string;
    createdAt: Date;
    updatedAt: Date;
}
