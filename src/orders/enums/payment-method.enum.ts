/**
 * Payment Method Enum
 *
 * How the customer will pay for their order.
 * Starting with Cash on Delivery only — the simplest payment method
 * that requires no third-party integration.
 *
 * Why start with COD?
 * - No payment gateway needed (Stripe, PayPal, etc.)
 * - Common in food delivery markets (especially outside US/EU)
 * - Lets us build the full order flow first, add payments later
 * - The rider collects cash and the platform settles with vendors separately
 */
export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  // Future additions:
  // CARD = 'card',
  // WALLET = 'wallet',
  // BANK_TRANSFER = 'bank_transfer',
}
