import { User } from './user.entity';
export declare enum RiderStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    SUSPENDED = "suspended"
}
export declare enum VehicleType {
    BICYCLE = "bicycle",
    MOTORCYCLE = "motorcycle",
    CAR = "car",
    SCOOTER = "scooter"
}
export declare enum AvailabilityStatus {
    OFFLINE = "offline",
    ONLINE = "online",
    BUSY = "busy"
}
export declare class RiderProfile {
    id: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    vehicleType: VehicleType;
    vehicleModel: string;
    vehiclePlateNumber: string;
    vehicleColor: string;
    driverLicense: string;
    vehicleRegistration: string;
    insuranceDocument: string;
    status: RiderStatus;
    rejectionReason: string;
    approvedAt: Date;
    approvedBy: string;
    availabilityStatus: AvailabilityStatus;
    currentLatitude: number;
    currentLongitude: number;
    lastLocationUpdate: Date;
    totalDeliveries: number;
    rating: number;
    totalReviews: number;
    user: User;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
