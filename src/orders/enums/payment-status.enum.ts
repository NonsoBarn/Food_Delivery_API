/**
 * Payment Status Enum
 *
 * Tracks whether the customer has paid for their order.
 * Separate from OrderStatus because payment and delivery are independent concerns.
 *
 * Example flow for Cash on Delivery:
 *   Order placed → paymentStatus = PENDING
 *   Order delivered → paymentStatus = PAID (rider collected cash)
 *   Order cancelled → paymentStatus stays PENDING (nothing to refund)
 *
 * Example flow for Card (future):
 *   Order placed → charge card → paymentStatus = PAID
 *   Order cancelled → refund card → paymentStatus = REFUNDED
 *   Charge fails → paymentStatus = FAILED
 */
export enum PaymentStatus {
  /** Payment not yet received */
  PENDING = 'pending',

  /** Payment received successfully */
  PAID = 'paid',

  /** Payment attempt failed (card declined, etc.) */
  FAILED = 'failed',

  /** Payment was refunded to customer */
  REFUNDED = 'refunded',
}
