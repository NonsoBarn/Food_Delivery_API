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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorReview = void 0;
const typeorm_1 = require("typeorm");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../../users/entities/vendor-profile.entity");
const order_entity_1 = require("../../orders/entities/order.entity");
let VendorReview = class VendorReview {
    id;
    customer;
    customerId;
    vendor;
    vendorId;
    order;
    orderId;
    rating;
    comment;
    createdAt;
    updatedAt;
};
exports.VendorReview = VendorReview;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], VendorReview.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_profile_entity_1.CustomerProfile, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'customerId' }),
    __metadata("design:type", customer_profile_entity_1.CustomerProfile)
], VendorReview.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], VendorReview.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => vendor_profile_entity_1.VendorProfile, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'vendorId' }),
    __metadata("design:type", vendor_profile_entity_1.VendorProfile)
], VendorReview.prototype, "vendor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], VendorReview.prototype, "vendorId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", order_entity_1.Order)
], VendorReview.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], VendorReview.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer' }),
    __metadata("design:type", Number)
], VendorReview.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], VendorReview.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], VendorReview.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], VendorReview.prototype, "updatedAt", void 0);
exports.VendorReview = VendorReview = __decorate([
    (0, typeorm_1.Entity)('vendor_reviews'),
    (0, typeorm_1.Unique)(['customerId', 'orderId']),
    (0, typeorm_1.Index)(['vendorId', 'createdAt']),
    (0, typeorm_1.Index)(['customerId'])
], VendorReview);
//# sourceMappingURL=vendor-review.entity.js.map