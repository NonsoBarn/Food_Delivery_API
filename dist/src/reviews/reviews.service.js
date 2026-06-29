"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_review_entity_1 = require("./entities/product-review.entity");
const vendor_review_entity_1 = require("./entities/vendor-review.entity");
const product_entity_1 = require("../products/entities/product.entity");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const customer_profile_entity_1 = require("../users/entities/customer-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const order_status_enum_1 = require("../orders/enums/order-status.enum");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    productReviewRepo;
    vendorReviewRepo;
    productRepo;
    vendorProfileRepo;
    customerProfileRepo;
    orderRepo;
    orderItemRepo;
    dataSource;
    logger = new common_1.Logger(ReviewsService_1.name);
    constructor(productReviewRepo, vendorReviewRepo, productRepo, vendorProfileRepo, customerProfileRepo, orderRepo, orderItemRepo, dataSource) {
        this.productReviewRepo = productReviewRepo;
        this.vendorReviewRepo = vendorReviewRepo;
        this.productRepo = productRepo;
        this.vendorProfileRepo = vendorProfileRepo;
        this.customerProfileRepo = customerProfileRepo;
        this.orderRepo = orderRepo;
        this.orderItemRepo = orderItemRepo;
        this.dataSource = dataSource;
    }
    async createProductReview(productId, userId, dto) {
        const customerProfile = await this.customerProfileRepo.findOne({
            where: { userId },
        });
        if (!customerProfile) {
            throw new common_1.ForbiddenException('Customer profile not found');
        }
        const product = await this.productRepo.findOne({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        const purchasedItem = await this.orderItemRepo
            .createQueryBuilder('item')
            .innerJoin('item.order', 'order')
            .where('item.productId = :productId', { productId })
            .andWhere('order.customerId = :customerId', { customerId: customerProfile.id })
            .andWhere('order.status = :status', { status: order_status_enum_1.OrderStatus.DELIVERED })
            .getOne();
        if (!purchasedItem) {
            throw new common_1.ForbiddenException('You can only review products from your delivered orders');
        }
        const existing = await this.productReviewRepo.findOne({
            where: { customerId: customerProfile.id, productId },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already reviewed this product. You can only leave one review per product.');
        }
        const review = await this.dataSource.transaction(async (manager) => {
            const newReview = manager.create(product_review_entity_1.ProductReview, {
                productId,
                customerId: customerProfile.id,
                rating: dto.rating,
                comment: dto.comment,
            });
            const savedReview = await manager.save(newReview);
            const rawProduct = await manager
                .createQueryBuilder(product_review_entity_1.ProductReview, 'review')
                .select('AVG(review.rating)', 'avg')
                .addSelect('COUNT(*)', 'count')
                .where('review.productId = :productId', { productId })
                .getRawOne();
            const newAvg = parseFloat(rawProduct?.avg ?? '0') || 0;
            const newCount = parseInt(rawProduct?.count ?? '0', 10) || 0;
            await manager.update(product_entity_1.Product, productId, {
                rating: Math.round(newAvg * 100) / 100,
                reviewCount: newCount,
            });
            this.logger.log(`Product ${productId} rating updated: ${newAvg.toFixed(2)} (${newCount} reviews)`);
            return savedReview;
        });
        return review;
    }
    async getProductReviews(productId, filters) {
        const productExists = await this.productRepo.findOne({
            where: { id: productId },
            select: ['id', 'rating', 'reviewCount'],
        });
        if (!productExists) {
            throw new common_1.NotFoundException('Product not found');
        }
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const query = this.productReviewRepo
            .createQueryBuilder('review')
            .leftJoin('review.customer', 'customer')
            .addSelect(['customer.firstName', 'customer.lastName'])
            .where('review.productId = :productId', { productId })
            .orderBy('review.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (filters.rating) {
            query.andWhere('review.rating = :rating', { rating: filters.rating });
        }
        const [reviews, total] = await query.getManyAndCount();
        return {
            reviews,
            total,
            averageRating: Number(productExists.rating) || 0,
        };
    }
    async createVendorReview(vendorId, userId, dto) {
        const customerProfile = await this.customerProfileRepo.findOne({
            where: { userId },
        });
        if (!customerProfile) {
            throw new common_1.ForbiddenException('Customer profile not found');
        }
        const vendor = await this.vendorProfileRepo.findOne({
            where: { id: vendorId },
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        const order = await this.orderRepo.findOne({
            where: {
                id: dto.orderId,
                vendorId,
                customerId: customerProfile.id,
                status: order_status_enum_1.OrderStatus.DELIVERED,
            },
        });
        if (!order) {
            throw new common_1.ForbiddenException('You can only rate vendors from your own delivered orders. ' +
                'Make sure the order ID belongs to a completed order from this vendor.');
        }
        const existing = await this.vendorReviewRepo.findOne({
            where: { customerId: customerProfile.id, orderId: dto.orderId },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already rated this order. Each order can only be rated once.');
        }
        const review = await this.dataSource.transaction(async (manager) => {
            const newReview = manager.create(vendor_review_entity_1.VendorReview, {
                vendorId,
                customerId: customerProfile.id,
                orderId: dto.orderId,
                rating: dto.rating,
                comment: dto.comment,
            });
            const savedReview = await manager.save(newReview);
            const rawVendor = await manager
                .createQueryBuilder(vendor_review_entity_1.VendorReview, 'review')
                .select('AVG(review.rating)', 'avg')
                .addSelect('COUNT(*)', 'count')
                .where('review.vendorId = :vendorId', { vendorId })
                .getRawOne();
            const newAvg = parseFloat(rawVendor?.avg ?? '0') || 0;
            const newCount = parseInt(rawVendor?.count ?? '0', 10) || 0;
            await manager.update(vendor_profile_entity_1.VendorProfile, vendorId, {
                rating: Math.round(newAvg * 100) / 100,
                totalReviews: newCount,
            });
            this.logger.log(`Vendor ${vendorId} rating updated: ${newAvg.toFixed(2)} (${newCount} reviews)`);
            return savedReview;
        });
        return review;
    }
    async getVendorReviews(vendorId, filters) {
        const vendor = await this.vendorProfileRepo.findOne({
            where: { id: vendorId },
            select: ['id', 'rating', 'totalReviews'],
        });
        if (!vendor) {
            throw new common_1.NotFoundException('Vendor not found');
        }
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        const query = this.vendorReviewRepo
            .createQueryBuilder('review')
            .leftJoin('review.customer', 'customer')
            .addSelect(['customer.firstName', 'customer.lastName'])
            .where('review.vendorId = :vendorId', { vendorId })
            .orderBy('review.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (filters.rating) {
            query.andWhere('review.rating = :rating', { rating: filters.rating });
        }
        const [reviews, total] = await query.getManyAndCount();
        return {
            reviews,
            total,
            averageRating: Number(vendor.rating) || 0,
        };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_review_entity_1.ProductReview)),
    __param(1, (0, typeorm_1.InjectRepository)(vendor_review_entity_1.VendorReview)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(vendor_profile_entity_1.VendorProfile)),
    __param(4, (0, typeorm_1.InjectRepository)(customer_profile_entity_1.CustomerProfile)),
    __param(5, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(6, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map