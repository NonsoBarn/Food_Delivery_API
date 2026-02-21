/**
 * Rider Management Service
 *
 * Handles admin operations on riders (approve, reject, suspend)
 * and rider self-service (toggle availability).
 *
 * KEY LEARNING: Separation of Admin vs Self-Service
 * ==================================================
 * This service contains methods for TWO audiences:
 * 1. ADMIN methods: approve, reject, suspend, list riders
 * 2. RIDER methods: toggle own availability, view own deliveries
 *
 * Both live in the same service because they operate on the same entity
 * (RiderProfile). The CONTROLLER layer handles the role-based access
 * control (@Roles decorator), while this service focuses on pure business logic.
 *
 * KEY LEARNING: Guard Rails on State Transitions
 * ===============================================
 * Notice how toggleAvailability() checks that the rider is APPROVED before
 * allowing them to go online. This is a business rule, not a database constraint.
 * The database allows any AvailabilityStatus value, but our SERVICE enforces:
 * "You must be approved before you can start accepting deliveries."
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RiderProfile,
  RiderStatus,
  AvailabilityStatus,
} from '../../users/entities/rider-profile.entity';
import { Delivery } from '../entities/delivery.entity';
import { RiderFilterDto } from '../dto/rider-filter.dto';

@Injectable()
export class RiderManagementService {
  private readonly logger = new Logger(RiderManagementService.name);

  constructor(
    @InjectRepository(RiderProfile)
    private readonly riderRepository: Repository<RiderProfile>,

    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
  ) {}

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Approve a rider application.
   *
   * Business rule: Only PENDING riders can be approved.
   * We record WHO approved and WHEN for the audit trail.
   */
  async approveRider(
    riderId: string,
    adminUserId: string,
  ): Promise<RiderProfile> {
    const rider = await this.findRiderOrFail(riderId);

    if (rider.status !== RiderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve a rider with status "${rider.status}". Only pending riders can be approved.`,
      );
    }

    rider.status = RiderStatus.APPROVED;
    rider.approvedAt = new Date();
    rider.approvedBy = adminUserId;

    const saved = await this.riderRepository.save(rider);
    this.logger.log(`Rider ${riderId} approved by admin ${adminUserId}`);
    return saved;
  }

  /**
   * Reject a rider application.
   *
   * Business rule: Only PENDING riders can be rejected.
   * A reason is REQUIRED (enforced by DTO validation).
   */
  async rejectRider(
    riderId: string,
    rejectionReason: string,
  ): Promise<RiderProfile> {
    const rider = await this.findRiderOrFail(riderId);

    if (rider.status !== RiderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject a rider with status "${rider.status}". Only pending riders can be rejected.`,
      );
    }

    rider.status = RiderStatus.REJECTED;
    rider.rejectionReason = rejectionReason;

    const saved = await this.riderRepository.save(rider);
    this.logger.log(`Rider ${riderId} rejected. Reason: ${rejectionReason}`);
    return saved;
  }

  /**
   * Suspend an active rider.
   *
   * Business rule: Sets both status to SUSPENDED and availability to OFFLINE.
   * A suspended rider cannot go online or accept deliveries until reinstated.
   *
   * KEY LEARNING: Compound State Changes
   * When suspending, we must update TWO fields atomically:
   * - status → SUSPENDED (prevents future approval)
   * - availabilityStatus → OFFLINE (immediately removes from available pool)
   * If we only set status, a suspended rider might still appear as "online."
   */
  async suspendRider(riderId: string): Promise<RiderProfile> {
    const rider = await this.findRiderOrFail(riderId);

    if (rider.status === RiderStatus.SUSPENDED) {
      throw new BadRequestException('Rider is already suspended');
    }

    rider.status = RiderStatus.SUSPENDED;
    rider.availabilityStatus = AvailabilityStatus.OFFLINE;

    const saved = await this.riderRepository.save(rider);
    this.logger.log(`Rider ${riderId} suspended`);
    return saved;
  }

  /**
   * List all riders with optional filters.
   *
   * KEY LEARNING: Pagination with Skip/Take
   * ========================================
   * Database queries should ALWAYS be paginated for list endpoints.
   * Without pagination, a query returning 10,000 riders would:
   * - Consume excessive memory on the server
   * - Take a long time to serialize to JSON
   * - Overwhelm the client with data
   *
   * TypeORM's skip/take maps to SQL's OFFSET/LIMIT:
   *   skip = (page - 1) * limit  →  OFFSET 20
   *   take = limit               →  LIMIT 20
   */
  async findAllRiders(
    filters: RiderFilterDto,
  ): Promise<{ riders: RiderProfile[]; total: number }> {
    const { status, availabilityStatus, page = 1, limit = 20 } = filters;

    const queryBuilder = this.riderRepository
      .createQueryBuilder('rider')
      .leftJoinAndSelect('rider.user', 'user');

    if (status) {
      queryBuilder.andWhere('rider.status = :status', { status });
    }

    if (availabilityStatus) {
      queryBuilder.andWhere('rider.availabilityStatus = :availabilityStatus', {
        availabilityStatus,
      });
    }

    queryBuilder
      .orderBy('rider.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [riders, total] = await queryBuilder.getManyAndCount();

    return { riders, total };
  }

  /**
   * Get all available riders (approved + online).
   *
   * Used by admin when manually assigning a delivery —
   * shows only riders who are ready to accept work.
   */
  async findAvailableRiders(): Promise<RiderProfile[]> {
    return this.riderRepository.find({
      where: {
        status: RiderStatus.APPROVED,
        availabilityStatus: AvailabilityStatus.ONLINE,
      },
      order: { rating: 'DESC' },
    });
  }

  // ==================== RIDER SELF-SERVICE ====================

  /**
   * Toggle rider availability (online/offline).
   *
   * Business rules:
   * 1. Rider must be APPROVED to go online
   * 2. Rider can only set ONLINE or OFFLINE (not BUSY — system-managed)
   * 3. Going OFFLINE is always allowed (rider wants to stop working)
   *
   * KEY LEARNING: Precondition Checks
   * ==================================
   * Before allowing a state change, verify all preconditions:
   * - Is the rider approved? (can't work if not approved)
   * - Is the requested status valid? (DTO handles this)
   *
   * This prevents "impossible" states like an unapproved rider being online.
   */
  async toggleAvailability(
    riderProfileId: string,
    availabilityStatus: AvailabilityStatus,
  ): Promise<RiderProfile> {
    const rider = await this.findRiderOrFail(riderProfileId);

    // Only approved riders can go online
    if (
      availabilityStatus === AvailabilityStatus.ONLINE &&
      rider.status !== RiderStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot go online. Your rider application status is "${rider.status}". Only approved riders can go online.`,
      );
    }

    rider.availabilityStatus = availabilityStatus;
    const saved = await this.riderRepository.save(rider);

    this.logger.log(
      `Rider ${riderProfileId} is now ${availabilityStatus}`,
    );
    return saved;
  }

  /**
   * Get a rider's delivery history.
   *
   * Returns all deliveries assigned to this rider, newest first.
   * Includes the related order for context (order number, customer, etc.).
   */
  async findRiderDeliveries(
    riderId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ deliveries: Delivery[]; total: number }> {
    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: { riderId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { deliveries, total };
  }

  // ==================== HELPERS ====================

  /**
   * Find a rider or throw NotFoundException.
   *
   * KEY LEARNING: "OrFail" Pattern
   * ===============================
   * This is a common pattern in service layers: wrap the "find" call
   * with a check and throw if not found. This DRYs up the "not found"
   * logic — every method that needs a rider calls this instead of
   * duplicating the check.
   */
  private async findRiderOrFail(riderId: string): Promise<RiderProfile> {
    const rider = await this.riderRepository.findOne({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException(`Rider with ID "${riderId}" not found`);
    }

    return rider;
  }
}
