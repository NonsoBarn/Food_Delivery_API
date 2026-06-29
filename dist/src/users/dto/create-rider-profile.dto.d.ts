import { VehicleType } from '../entities/rider-profile.entity';
export declare class CreateRiderProfileDto {
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    vehicleType: VehicleType;
    vehicleModel?: string;
    vehiclePlateNumber?: string;
    vehicleColor?: string;
}
