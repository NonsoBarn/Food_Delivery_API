import { Repository, DataSource } from 'typeorm';
import { ProductReview } from './entities/product-review.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { Product } from '../products/entities/product.entity';
import { VendorProfile } from '../users/entities/vendor-profile.entity';
import { CustomerProfile } from '../users/entities/customer-profile.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateVendorReviewDto } from './dto/create-vendor-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
export declare class ReviewsService {
    private readonly productReviewRepo;
    private readonly vendorReviewRepo;
    private readonly productRepo;
    private readonly vendorProfileRepo;
    private readonly customerProfileRepo;
    private readonly orderRepo;
    private readonly orderItemRepo;
    private readonly dataSource;
    private readonly logger;
    constructor(productReviewRepo: Repository<ProductReview>, vendorReviewRepo: Repository<VendorReview>, productRepo: Repository<Product>, vendorProfileRepo: Repository<VendorProfile>, customerProfileRepo: Repository<CustomerProfile>, orderRepo: Repository<Order>, orderItemRepo: Repository<OrderItem>, dataSource: DataSource);
    createProductReview(productId: string, userId: string, dto: CreateProductReviewDto): Promise<ProductReview>;
    getProductReviews(productId: string, filters: ReviewFilterDto): Promise<{
        reviews: ProductReview[];
        total: number;
        averageRating: number;
    }>;
    createVendorReview(vendorId: string, userId: string, dto: CreateVendorReviewDto): Promise<VendorReview>;
    getVendorReviews(vendorId: string, filters: ReviewFilterDto): Promise<{
        reviews: VendorReview[];
        total: number;
        averageRating: number;
    }>;
}
