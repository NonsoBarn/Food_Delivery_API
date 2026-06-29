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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RiderLocationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiderLocationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = __importDefault(require("ioredis"));
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const delivery_entity_1 = require("../entities/delivery.entity");
const delivery_status_enum_1 = require("../enums/delivery-status.enum");
const LOCATION_TTL_SECONDS = 10 * 60;
const RIDER_LOCATIONS_KEY = 'rider:locations';
const RIDER_LOCATION_PREFIX = 'rider:location:';
let RiderLocationService = RiderLocationService_1 = class RiderLocationService {
    redis;
    riderRepository;
    deliveryRepository;
    logger = new common_1.Logger(RiderLocationService_1.name);
    constructor(redis, riderRepository, deliveryRepository) {
        this.redis = redis;
        this.riderRepository = riderRepository;
        this.deliveryRepository = deliveryRepository;
    }
    async updateLocation(riderProfileId, latitude, longitude, heading, speed) {
        const now = Date.now();
        const locationKey = `${RIDER_LOCATION_PREFIX}${riderProfileId}`;
        const pipeline = this.redis.pipeline();
        pipeline.geoadd(RIDER_LOCATIONS_KEY, longitude, latitude, riderProfileId);
        const locationData = {
            lat: latitude.toString(),
            lng: longitude.toString(),
            timestamp: now.toString(),
        };
        if (heading !== undefined)
            locationData.heading = heading.toString();
        if (speed !== undefined)
            locationData.speed = speed.toString();
        pipeline.hset(locationKey, locationData);
        pipeline.expire(locationKey, LOCATION_TTL_SECONDS);
        await pipeline.exec();
        if (now % 30000 < 10000) {
            this.syncLocationToDatabase(riderProfileId, latitude, longitude).catch((err) => this.logger.warn(`Failed to sync location to DB: ${err.message}`));
        }
    }
    async getLocation(riderProfileId) {
        const locationKey = `${RIDER_LOCATION_PREFIX}${riderProfileId}`;
        const data = await this.redis.hgetall(locationKey);
        if (!data || !data.lat) {
            return null;
        }
        return {
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lng),
            timestamp: parseInt(data.timestamp, 10),
            heading: data.heading ? parseFloat(data.heading) : undefined,
            speed: data.speed ? parseFloat(data.speed) : undefined,
        };
    }
    async getDeliveryLocation(orderId) {
        const delivery = await this.deliveryRepository.findOne({
            where: {
                orderId,
                status: (0, typeorm_2.In)([
                    delivery_status_enum_1.DeliveryStatus.ACCEPTED,
                    delivery_status_enum_1.DeliveryStatus.PICKED_UP,
                ]),
            },
        });
        if (!delivery) {
            return null;
        }
        const location = await this.getLocation(delivery.riderId);
        if (!location) {
            return null;
        }
        return {
            riderId: delivery.riderId,
            ...location,
            deliveryStatus: delivery.status,
        };
    }
    async findNearestRiders(latitude, longitude, radiusKm = 5, limit = 10) {
        const results = await this.redis.call('GEOSEARCH', RIDER_LOCATIONS_KEY, 'FROMLONLAT', longitude.toString(), latitude.toString(), 'BYRADIUS', radiusKm.toString(), 'km', 'COUNT', (limit * 3).toString(), 'ASC', 'WITHCOORD', 'WITHDIST');
        if (!results || results.length === 0) {
            return [];
        }
        const candidates = results.map(([riderId, distance, [lng, lat]]) => ({
            riderId,
            distanceKm: parseFloat(distance),
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
        }));
        const riderIds = candidates.map((c) => c.riderId);
        const approvedOnlineRiders = await this.riderRepository.find({
            where: {
                id: (0, typeorm_2.In)(riderIds),
                status: rider_profile_entity_1.RiderStatus.APPROVED,
                availabilityStatus: rider_profile_entity_1.AvailabilityStatus.ONLINE,
            },
            select: ['id'],
        });
        const validRiderIds = new Set(approvedOnlineRiders.map((r) => r.id));
        return candidates
            .filter((c) => validRiderIds.has(c.riderId))
            .slice(0, limit);
    }
    async removeLocation(riderProfileId) {
        const pipeline = this.redis.pipeline();
        pipeline.zrem(RIDER_LOCATIONS_KEY, riderProfileId);
        pipeline.del(`${RIDER_LOCATION_PREFIX}${riderProfileId}`);
        await pipeline.exec();
        this.logger.log(`Removed location for rider ${riderProfileId}`);
    }
    async syncLocationToDatabase(riderProfileId, latitude, longitude) {
        await this.riderRepository.update(riderProfileId, {
            currentLatitude: latitude,
            currentLongitude: longitude,
            lastLocationUpdate: new Date(),
        });
    }
};
exports.RiderLocationService = RiderLocationService;
exports.RiderLocationService = RiderLocationService = RiderLocationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('REDIS_CLIENT')),
    __param(1, (0, typeorm_1.InjectRepository)(rider_profile_entity_1.RiderProfile)),
    __param(2, (0, typeorm_1.InjectRepository)(delivery_entity_1.Delivery)),
    __metadata("design:paramtypes", [ioredis_1.default,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RiderLocationService);
//# sourceMappingURL=rider-location.service.js.map