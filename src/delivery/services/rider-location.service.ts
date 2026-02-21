/**
 * Rider Location Service
 *
 * Manages real-time rider locations using Redis GEO commands.
 *
 * KEY LEARNING: Why Redis for Location, Not PostgreSQL?
 * =====================================================
 * Rider locations update FREQUENTLY (every 5-10 seconds from the mobile app).
 * Writing to PostgreSQL that often would:
 * 1. Create heavy write load on your main database
 * 2. Generate massive WAL (Write-Ahead Log) data
 * 3. Be slower than necessary for what's essentially ephemeral data
 *
 * Redis is perfect for this because:
 * - In-memory = sub-millisecond writes
 * - Built-in GEO commands = no need for PostGIS extension
 * - TTL support = stale locations auto-expire
 * - We sync to PostgreSQL periodically (every ~30 seconds) for persistence
 *
 * KEY LEARNING: Redis GEO Under the Hood
 * =======================================
 * Redis GEO is built on top of Sorted Sets (ZSET).
 * When you GEOADD a member, Redis:
 * 1. Converts (longitude, latitude) → a 52-bit Geohash integer
 * 2. Stores it as the "score" in a sorted set
 *
 * Geohashing maps 2D coordinates to a 1D value that preserves proximity:
 * nearby points have similar geohash values. This means Redis can use its
 * efficient sorted set range queries to find nearby members.
 *
 * IMPORTANT: Redis GEO uses (longitude, latitude) order — the OPPOSITE
 * of the common (latitude, longitude) convention! Our service methods
 * accept (latitude, longitude) to match the industry convention and
 * swap them internally when calling Redis.
 *
 * Redis Key Design:
 * - "rider:locations" — GEO set with all rider positions
 *     Members: rider profile IDs
 *     Used for: GEOSEARCH (find nearest riders)
 *
 * - "rider:location:{riderId}" — Hash with detailed location state
 *     Fields: lat, lng, timestamp, heading, speed
 *     TTL: 10 minutes (if not updated, considered stale/offline)
 *     Used for: Getting a specific rider's current location
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import {
  RiderProfile,
  RiderStatus,
  AvailabilityStatus,
} from '../../users/entities/rider-profile.entity';
import { Delivery } from '../entities/delivery.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';

/** How long before a rider's location is considered stale (10 minutes) */
const LOCATION_TTL_SECONDS = 10 * 60;

/** Redis key for the GEO set containing all rider positions */
const RIDER_LOCATIONS_KEY = 'rider:locations';

/** Redis key prefix for individual rider location hashes */
const RIDER_LOCATION_PREFIX = 'rider:location:';

@Injectable()
export class RiderLocationService {
  private readonly logger = new Logger(RiderLocationService.name);

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,

    @InjectRepository(RiderProfile)
    private readonly riderRepository: Repository<RiderProfile>,

    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
  ) {}

  /**
   * Update a rider's current location.
   *
   * Called frequently by the rider's mobile app (every 5-10 seconds).
   * Updates both:
   * 1. Redis GEO set (for proximity queries)
   * 2. Redis Hash (for detailed location state)
   *
   * Periodically syncs to PostgreSQL for persistence (every 30 seconds).
   *
   * KEY LEARNING: Pipeline for Multiple Redis Commands
   * ===================================================
   * We use redis.pipeline() to batch multiple commands into ONE network
   * round-trip. Without pipelining, 3 commands = 3 round-trips.
   * With pipelining, 3 commands = 1 round-trip. This is important when
   * this endpoint is called every 5 seconds for every active rider.
   *
   * @param riderProfileId - The rider's profile ID
   * @param latitude - Current latitude (-90 to 90)
   * @param longitude - Current longitude (-180 to 180)
   * @param heading - Direction in degrees (0-360, 0=North), optional
   * @param speed - Speed in km/h, optional
   */
  async updateLocation(
    riderProfileId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
  ): Promise<void> {
    const now = Date.now();
    const locationKey = `${RIDER_LOCATION_PREFIX}${riderProfileId}`;

    // Pipeline: batch multiple Redis commands into ONE network round-trip
    const pipeline = this.redis.pipeline();

    // 1. GEOADD — update position in the GEO set
    //    NOTE: Redis GEO takes (longitude, latitude) — reversed from convention!
    pipeline.geoadd(RIDER_LOCATIONS_KEY, longitude, latitude, riderProfileId);

    // 2. HSET — store detailed location state
    const locationData: Record<string, string> = {
      lat: latitude.toString(),
      lng: longitude.toString(),
      timestamp: now.toString(),
    };
    if (heading !== undefined) locationData.heading = heading.toString();
    if (speed !== undefined) locationData.speed = speed.toString();

    pipeline.hset(locationKey, locationData);

    // 3. EXPIRE — auto-delete if rider stops updating (crashed app, etc.)
    pipeline.expire(locationKey, LOCATION_TTL_SECONDS);

    await pipeline.exec();

    // Sync to PostgreSQL periodically (every ~30 seconds)
    // We use the timestamp modulo to avoid syncing on every call
    if (now % 30000 < 10000) {
      // Roughly every 30 seconds
      this.syncLocationToDatabase(riderProfileId, latitude, longitude).catch(
        (err) =>
          this.logger.warn(
            `Failed to sync location to DB: ${err.message}`,
          ),
      );
    }
  }

  /**
   * Get a specific rider's current location.
   *
   * Reads from Redis Hash (not GEO set) because we need the
   * detailed data (heading, speed, timestamp), not just coordinates.
   *
   * Returns null if the rider's location has expired (stale).
   */
  async getLocation(
    riderProfileId: string,
  ): Promise<{
    latitude: number;
    longitude: number;
    timestamp: number;
    heading?: number;
    speed?: number;
  } | null> {
    const locationKey = `${RIDER_LOCATION_PREFIX}${riderProfileId}`;
    const data = await this.redis.hgetall(locationKey);

    // hgetall returns {} for non-existent keys
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

  /**
   * Get rider location for a customer tracking their delivery.
   *
   * Finds the active delivery for the order, then gets the rider's location.
   * Returns null if no active delivery or rider location is unavailable.
   */
  async getDeliveryLocation(
    orderId: string,
  ): Promise<{
    riderId: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    heading?: number;
    speed?: number;
    deliveryStatus: DeliveryStatus;
  } | null> {
    // Find active delivery for this order
    const delivery = await this.deliveryRepository.findOne({
      where: {
        orderId,
        status: In([
          DeliveryStatus.ACCEPTED,
          DeliveryStatus.PICKED_UP,
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

  /**
   * Find the nearest available riders to a given point.
   *
   * KEY LEARNING: Redis GEOSEARCH
   * ==============================
   * GEOSEARCH is the modern replacement for GEORADIUS (deprecated in Redis 6.2).
   *
   * Command breakdown:
   *   GEOSEARCH rider:locations
   *     FROMLONLAT <lng> <lat>   ← Center point
   *     BYRADIUS <km> km         ← Search radius
   *     COUNT <n>                ← Max results
   *     ASC                      ← Sort nearest first
   *     WITHCOORD                ← Include coordinates in results
   *     WITHDIST                 ← Include distance in results
   *
   * The result includes each rider's ID, distance, and coordinates.
   * We then filter against the database to only return riders who are
   * APPROVED and ONLINE (Redis only knows locations, not business status).
   *
   * KEY LEARNING: Two-Phase Filtering
   * ==================================
   * 1. Redis phase: Fast geospatial filter (milliseconds for millions of points)
   * 2. Database phase: Business logic filter (is rider approved? online?)
   *
   * This is much faster than querying PostgreSQL with PostGIS for every search,
   * because Redis narrows the candidates first.
   */
  async findNearestRiders(
    latitude: number,
    longitude: number,
    radiusKm: number = 5,
    limit: number = 10,
  ): Promise<
    Array<{
      riderId: string;
      distanceKm: number;
      latitude: number;
      longitude: number;
    }>
  > {
    // Phase 1: Redis geospatial search
    // GEOSEARCH returns: [[member, distance, [lng, lat]], ...]
    const results = await this.redis.call(
      'GEOSEARCH',
      RIDER_LOCATIONS_KEY,
      'FROMLONLAT',
      longitude.toString(),
      latitude.toString(),
      'BYRADIUS',
      radiusKm.toString(),
      'km',
      'COUNT',
      (limit * 3).toString(), // Fetch extra because we'll filter some out
      'ASC',
      'WITHCOORD',
      'WITHDIST',
    ) as Array<[string, string, [string, string]]>;

    if (!results || results.length === 0) {
      return [];
    }

    // Parse Redis results
    const candidates = results.map(([riderId, distance, [lng, lat]]) => ({
      riderId,
      distanceKm: parseFloat(distance),
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    }));

    // Phase 2: Filter by business status in database
    const riderIds = candidates.map((c) => c.riderId);
    const approvedOnlineRiders = await this.riderRepository.find({
      where: {
        id: In(riderIds),
        status: RiderStatus.APPROVED,
        availabilityStatus: AvailabilityStatus.ONLINE,
      },
      select: ['id'],
    });

    const validRiderIds = new Set(approvedOnlineRiders.map((r) => r.id));

    // Return only valid riders, already sorted by distance (from Redis ASC)
    return candidates
      .filter((c) => validRiderIds.has(c.riderId))
      .slice(0, limit);
  }

  /**
   * Remove a rider's location from Redis.
   *
   * Called when a rider goes OFFLINE.
   * Removes from both the GEO set and the detail hash.
   */
  async removeLocation(riderProfileId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.zrem(RIDER_LOCATIONS_KEY, riderProfileId);
    pipeline.del(`${RIDER_LOCATION_PREFIX}${riderProfileId}`);
    await pipeline.exec();

    this.logger.log(`Removed location for rider ${riderProfileId}`);
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Sync location to PostgreSQL for persistence.
   *
   * KEY LEARNING: Write-Behind Caching
   * ===================================
   * This is a "write-behind" pattern: hot data lives in Redis (fast),
   * and we periodically sync to PostgreSQL (durable).
   *
   * If Redis crashes, we lose at most ~30 seconds of location data.
   * That's acceptable because rider locations are ephemeral anyway —
   * a rider who was at coordinates X 30 seconds ago has moved since then.
   *
   * The PostgreSQL copy is mainly for:
   * - Admin dashboards that query historical data
   * - Recovery after a Redis restart
   * - Analytics queries
   */
  private async syncLocationToDatabase(
    riderProfileId: string,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await this.riderRepository.update(riderProfileId, {
      currentLatitude: latitude,
      currentLongitude: longitude,
      lastLocationUpdate: new Date(),
    });
  }
}
