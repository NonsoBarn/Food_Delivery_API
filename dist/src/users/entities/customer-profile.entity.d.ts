import { User } from './user.entity';
export declare class CustomerProfile {
    id: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    deliveryAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    user: User;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
