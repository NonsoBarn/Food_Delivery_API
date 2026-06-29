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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reviews_service_1 = require("./reviews.service");
const create_product_review_dto_1 = require("./dto/create-product-review.dto");
const create_vendor_review_dto_1 = require("./dto/create-vendor-review.dto");
const review_filter_dto_1 = require("./dto/review-filter.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const user_entity_1 = require("../users/entities/user.entity");
let ReviewsController = class ReviewsController {
    reviewsService;
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    async createProductReview(productId, user, dto) {
        const review = await this.reviewsService.createProductReview(productId, user.id, dto);
        return {
            message: 'Review submitted successfully',
            review,
        };
    }
    async getProductReviews(productId, filters) {
        const { reviews, total, averageRating } = await this.reviewsService.getProductReviews(productId, filters);
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        return {
            reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                averageRating,
            },
        };
    }
    async createVendorReview(vendorId, user, dto) {
        const review = await this.reviewsService.createVendorReview(vendorId, user.id, dto);
        return {
            message: 'Vendor rated successfully',
            review,
        };
    }
    async getVendorReviews(vendorId, filters) {
        const { reviews, total, averageRating } = await this.reviewsService.getVendorReviews(vendorId, filters);
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;
        return {
            reviews,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                averageRating,
            },
        };
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Post)('products/:productId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a product review', description: 'Roles: customer' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Review submitted' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — not a customer' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        create_product_review_dto_1.CreateProductReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createProductReview", null);
__decorate([
    (0, common_1.Get)('products/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reviews for a product (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated product reviews with average rating' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_filter_dto_1.ReviewFilterDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getProductReviews", null);
__decorate([
    (0, common_1.Post)('vendors/:vendorId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.CUSTOMER),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Rate a vendor after delivery', description: 'Roles: customer' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Vendor rated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden — not a customer' }),
    __param(0, (0, common_1.Param)('vendorId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        create_vendor_review_dto_1.CreateVendorReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "createVendorReview", null);
__decorate([
    (0, common_1.Get)('vendors/:vendorId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reviews for a vendor (public)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated vendor reviews with average rating' }),
    __param(0, (0, common_1.Param)('vendorId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_filter_dto_1.ReviewFilterDto]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "getVendorReviews", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiTags)('Reviews'),
    (0, common_1.Controller)({
        path: 'reviews',
        version: '1',
    }),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map