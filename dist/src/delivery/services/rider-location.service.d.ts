import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { Delivery } from '../entities/delivery.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';
export declare class RiderLocationService {
    private readonly redis;
    private readonly riderRepository;
    private readonly deliveryRepository;
    private readonly logger;
    constructor(redis: Redis, riderRepository: Repository<RiderProfile>, deliveryRepository: Repository<Delivery>);
    updateLocation(riderProfileId: string, latitude: number, longitude: number, heading?: number, speed?: number): Promise<void>;
    getLocation(riderProfileId: string): Promise<{
        latitude: number;
        longitude: number;
        timestamp: number;
        heading?: number;
        speed?: number;
    } | null>;
    getDeliveryLocation(orderId: string): Promise<{
        riderId: string;
        latitude: number;
        longitude: number;
        timestamp: number;
        heading?: number;
        speed?: number;
        deliveryStatus: DeliveryStatus;
    } | null>;
    findNearestRiders(latitude: number, longitude: number, radiusKm?: number, limit?: number): Promise<Array<{
        riderId: string;
        distanceKm: number;
        latitude: number;
        longitude: number;
    }>>;
    removeLocation(riderProfileId: string): Promise<void>;
    private syncLocationToDatabase;
}
