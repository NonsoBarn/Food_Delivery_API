/**
 * Create Order DTO
 *
 * What the customer sends when placing an order.
 *
 * IMPORTANT: Notice what's NOT here — no items, no prices, no quantities!
 * The service reads cart items directly from Redis. This is a security pattern:
 *
 * Why not send items in the request body?
 * 1. Price tampering: A malicious client could send { price: 0.01 }
 * 2. Quantity manipulation: Client could claim they ordered 1 but send 100
 * 3. Single source of truth: The cart is already validated and up-to-date
 * 4. Simpler API: Customer just says "checkout my cart" + payment method
 *
 * The customer CAN optionally override their delivery address
 * (e.g., delivering to office instead of home).
 */
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Payment method for the order',
    enum: PaymentMethod,
    example: PaymentMethod.CASH_ON_DELIVERY,
  })
  @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description:
      'Delivery address override. If omitted, uses the address from your customer profile.',
    example: '123 Main Street, Apt 4B',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Delivery address must not exceed 500 characters' })
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Special instructions for the restaurant or rider',
    example: 'Please ring the doorbell twice. No onions on the burger.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  customerNotes?: string;
}
