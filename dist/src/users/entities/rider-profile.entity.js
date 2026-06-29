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
exports.RiderProfile = exports.AvailabilityStatus = exports.VehicleType = exports.RiderStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
var RiderStatus;
(function (RiderStatus) {
    RiderStatus["PENDING"] = "pending";
    RiderStatus["APPROVED"] = "approved";
    RiderStatus["REJECTED"] = "rejected";
    RiderStatus["SUSPENDED"] = "suspended";
})(RiderStatus || (exports.RiderStatus = RiderStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["BICYCLE"] = "bicycle";
    VehicleType["MOTORCYCLE"] = "motorcycle";
    VehicleType["CAR"] = "car";
    VehicleType["SCOOTER"] = "scooter";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["OFFLINE"] = "offline";
    AvailabilityStatus["ONLINE"] = "online";
    AvailabilityStatus["BUSY"] = "busy";
})(AvailabilityStatus || (exports.AvailabilityStatus = AvailabilityStatus = {}));
let RiderProfile = class RiderProfile {
    id;
    phoneNumber;
    firstName;
    lastName;
    vehicleType;
    vehicleModel;
    vehiclePlateNumber;
    vehicleColor;
    driverLicense;
    vehicleRegistration;
    insuranceDocument;
    status;
    rejectionReason;
    approvedAt;
    approvedBy;
    availabilityStatus;
    currentLatitude;
    currentLongitude;
    lastLocationUpdate;
    totalDeliveries;
    rating;
    totalReviews;
    user;
    userId;
    createdAt;
    updatedAt;
};
exports.RiderProfile = RiderProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiderProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: VehicleType,
        nullable: true,
    }),
    __metadata("design:type", String)
], RiderProfile.prototype, "vehicleType", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "vehicleModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "vehiclePlateNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "vehicleColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "driverLicense", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "vehicleRegistration", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "insuranceDocument", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RiderStatus,
        default: RiderStatus.PENDING,
    }),
    __metadata("design:type", String)
], RiderProfile.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "rejectionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], RiderProfile.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], RiderProfile.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: AvailabilityStatus,
        default: AvailabilityStatus.OFFLINE,
    }),
    __metadata("design:type", String)
], RiderProfile.prototype, "availabilityStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], RiderProfile.prototype, "currentLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 11, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], RiderProfile.prototype, "currentLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], RiderProfile.prototype, "lastLocationUpdate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], RiderProfile.prototype, "totalDeliveries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], RiderProfile.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], RiderProfile.prototype, "totalReviews", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User, (user) => user.riderProfile, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'userId' }),
    __metadata("design:type", user_entity_1.User)
], RiderProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], RiderProfile.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RiderProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RiderProfile.prototype, "updatedAt", void 0);
exports.RiderProfile = RiderProfile = __decorate([
    (0, typeorm_1.Entity)('rider_profiles')
], RiderProfile);
//# sourceMappingURL=rider-profile.entity.js.map