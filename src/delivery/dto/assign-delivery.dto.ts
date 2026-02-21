import { IsUUID } from 'class-validator';

/**
 * DTO for manually assigning an order to a rider.
 *
 * KEY LEARNING: UUID Validation
 * ==============================
 * Both orderId and riderId are UUIDs. Using @IsUUID() ensures:
 * - The value is a valid UUID format (not "abc123" or an SQL injection)
 * - We fail fast before hitting the database with an invalid ID
 * - The error message is clear: "orderId must be a UUID"
 */
export class AssignDeliveryDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  riderId: string;
}
