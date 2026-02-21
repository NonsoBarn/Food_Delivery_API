import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for completing a delivery.
 *
 * The proof-of-delivery image is handled via multipart file upload
 * (not in this DTO — it comes via @UploadedFile() in the controller).
 * This DTO only handles the text fields.
 */
export class CompleteDeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;
}
