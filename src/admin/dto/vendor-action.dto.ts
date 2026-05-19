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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorStatus } from '../../users/entities/vendor-profile.entity';

export class VendorActionDto {
  @ApiProperty({ enum: VendorStatus, example: VendorStatus.APPROVED })
  @IsEnum(VendorStatus, {
    message: `status must be one of: ${Object.values(VendorStatus).join(', ')}`,
  })
  status: VendorStatus;

  @ApiPropertyOptional({ example: 'Documents are incomplete', description: 'Required when status is rejected' })
  @ValidateIf((dto: VendorActionDto) => dto.status === VendorStatus.REJECTED)
  @IsString({ message: 'Rejection reason must be a string' })
  rejectionReason?: string;

  @ApiPropertyOptional({ example: 'Multiple customer complaints' })
  @IsString({ message: 'Suspension reason must be a string' })
  @IsOptional()
  suspensionReason?: string;
}
