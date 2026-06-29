"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reviews_controller_1 = require("./reviews.controller");
const reviews_service_1 = require("./reviews.service");
const product_review_entity_1 = require("./entities/product-review.entity");
const vendor_review_entity_1 = require("./entities/vendor-review.entity");
const product_entity_1 = require("../products/entities/product.entity");
const vendor_profile_entity_1 = require("../users/entities/vendor-profile.entity");
const customer_profile_entity_1 = require("../users/entities/customer-profile.entity");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
let ReviewsModule = class ReviewsModule {
};
exports.ReviewsModule = ReviewsModule;
exports.ReviewsModule = ReviewsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                product_review_entity_1.ProductReview,
                vendor_review_entity_1.VendorReview,
                product_entity_1.Product,
                vendor_profile_entity_1.VendorProfile,
                customer_profile_entity_1.CustomerProfile,
                order_entity_1.Order,
                order_item_entity_1.OrderItem,
            ]),
        ],
        controllers: [reviews_controller_1.ReviewsController],
        providers: [reviews_service_1.ReviewsService],
    })
], ReviewsModule);
//# sourceMappingURL=reviews.module.js.map