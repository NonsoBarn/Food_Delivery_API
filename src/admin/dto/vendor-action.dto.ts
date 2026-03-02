/**
 * VendorActionDto
 *
 * Request body for PATCH /api/v1/admin/vendors/:id/status
 *
 * KEY LEARNING: @ValidateIf — Conditional Validation
 * ===================================================
 * Sometimes a field is only required under certain conditions.
 * For example, a rejection reason is only meaningful (and required)
 * when the status is being set to REJECTED.
 *
 * @ValidateIf(condition) tells class-validator:
 *   "Only run the decorators below me if this condition is true."
 *
 * Without @ValidateIf, @IsNotEmpty() would fire for ALL statuses,
 * making it impossible to approve a vendor without also providing a reason.
 *
 * Compare:
 *   @IsOptional()    — "skip all validation if field is null/undefined"
 *   @ValidateIf(fn) — "only validate if fn() returns true"
 *
 * They serve different purposes:
 * - @IsOptional: the field can simply be absent
 * - @ValidateIf: the field's validation depends on another field's value
 *
 * KEY LEARNING: @IsEnum for constrained string fields
 * ====================================================
 * Accepting any string for `status` is dangerous — what if a client
 * sends "superadmin"? @IsEnum ensures only valid VendorStatus values
 * are accepted. class-validator compares against the enum's VALUES,
 * not its keys.
 *
 * Double safety: the database ENUM type also rejects invalid values,
 * but we catch bad input at the HTTP layer first (faster feedback to client).
 */
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ValidateIf } from 'class-validator';
import { VendorStatus } from '../../users/entities/vendor-profile.entity';

export class VendorActionDto {
  /**
   * The new status to apply to the vendor account.
   * Must be one of: pending, approved, rejected, suspended
   */
  @IsEnum(VendorStatus, {
    message: `status must be one of: ${Object.values(VendorStatus).join(', ')}`,
  })
  status: VendorStatus;

  /**
   * Reason for rejection — required ONLY when status = 'rejected'.
   *
   * @ValidateIf runs the @IsString() decorator below it only when the
   * condition is true. If status is 'approved' or 'suspended', this
   * validator is skipped and rejectionReason can be absent.
   *
   * Why require it for rejections?
   * - Vendors deserve an explanation for why they were rejected
   * - Prevents admins from rejecting silently (accountability)
   * - The vendor can fix the issue and reapply
   */
  @ValidateIf((dto: VendorActionDto) => dto.status === VendorStatus.REJECTED)
  @IsString({ message: 'Rejection reason must be a string' })
  rejectionReason?: string;

  /**
   * Optional reason for suspension (for internal records).
   * Not required — the admin might have an out-of-band reason.
   */
  @IsString({ message: 'Suspension reason must be a string' })
  @IsOptional()
  suspensionReason?: string;
}
