import { IsEnum, IsIn } from 'class-validator';
import { AvailabilityStatus } from '../../users/entities/rider-profile.entity';

/**
 * DTO for toggling rider availability.
 *
 * KEY LEARNING: Restricting Enum Subsets with @IsIn
 * ==================================================
 * The AvailabilityStatus enum has THREE values: ONLINE, OFFLINE, BUSY.
 * But riders should only be able to set ONLINE or OFFLINE themselves.
 * BUSY is a SYSTEM-MANAGED state — it's set automatically when a rider
 * is assigned a delivery.
 *
 * @IsEnum validates against the TypeScript enum (catches typos).
 * @IsIn further restricts to only the values the user is allowed to set.
 *
 * This is the Principle of Least Privilege applied to data:
 * don't let users set values that should be controlled by the system.
 */
export class UpdateAvailabilityDto {
  @IsEnum(AvailabilityStatus)
  @IsIn([AvailabilityStatus.ONLINE, AvailabilityStatus.OFFLINE], {
    message: 'You can only set availability to online or offline',
  })
  availabilityStatus: AvailabilityStatus;
}
