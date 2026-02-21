import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a rider application.
 *
 * KEY LEARNING: Required Reasons for Negative Actions
 * ====================================================
 * Whenever your system performs a negative action (reject, suspend, cancel),
 * always require a reason. This creates an audit trail and:
 * - Helps the rider understand WHY they were rejected
 * - Protects the platform from arbitrary decisions
 * - Enables analysis of common rejection reasons
 */
export class RejectRiderDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MaxLength(500)
  rejectionReason: string;
}
