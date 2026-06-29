import { ReviewsService } from './reviews.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateVendorReviewDto } from './dto/create-vendor-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
import { User } from '../users/entities/user.entity';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    createProductReview(productId: string, user: User, dto: CreateProductReviewDto): Promise<{
        message: string;
        review: import("./entities/product-review.entity").ProductReview;
    }>;
    getProductReviews(productId: string, filters: ReviewFilterDto): Promise<{
        reviews: import("./entities/product-review.entity").ProductReview[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            averageRating: number;
        };
    }>;
    createVendorReview(vendorId: string, user: User, dto: CreateVendorReviewDto): Promise<{
        message: string;
        review: import("./entities/vendor-review.entity").VendorReview;
    }>;
    getVendorReviews(vendorId: string, filters: ReviewFilterDto): Promise<{
        reviews: import("./entities/vendor-review.entity").VendorReview[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            averageRating: number;
        };
    }>;
}
