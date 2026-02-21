/**
 * SMS Templates
 *
 * KEY LEARNING: SMS is fundamentally different from email
 * ========================================================
 * - Max 160 characters for a single-segment SMS (or it's billed as multiple)
 * - Plain text only — no HTML, no links (they add ~20 chars)
 * - Every character counts — be concise
 * - Recipient reads this on a phone lock screen; get to the point immediately
 *
 * All templates here are functions (same pattern as email templates)
 * but return short plain strings instead of HTML.
 *
 * We keep all SMS templates in one file (unlike email which has one file each)
 * because SMS messages are so short — a separate file per template would be overkill.
 */

/**
 * Sent to customer after order is placed.
 * Example: "Your order ORD-20260221-A3F8K2 at Mama's Kitchen is confirmed! We'll notify you when it's ready."
 */
export function smsOrderConfirmation(
  orderNumber: string,
  vendorName?: string,
): string {
  const vendor = vendorName ? ` at ${vendorName}` : '';
  return `Your order ${orderNumber}${vendor} is confirmed! We'll notify you when it's ready.`;
}

/**
 * Sent to customer when order is cancelled.
 * Example: "Sorry, your order ORD-20260221-A3F8K2 was cancelled. Contact support if you need help."
 */
export function smsOrderCancelled(orderNumber: string): string {
  return `Sorry, your order ${orderNumber} was cancelled. Contact support if you need help.`;
}

/**
 * Sent to customer when a rider is assigned.
 * Example: "Great news! A rider is on the way with your order ORD-20260221-A3F8K2."
 */
export function smsDeliveryAssigned(
  orderNumber: string,
  riderName?: string,
): string {
  const rider = riderName ? ` Your rider is ${riderName}.` : '';
  return `A rider is on the way with your order ${orderNumber}.${rider}`;
}

/**
 * Sent to customer when the delivery is complete.
 * Example: "Your order ORD-20260221-A3F8K2 has been delivered. Enjoy your meal!"
 */
export function smsDeliveryCompletion(orderNumber: string): string {
  return `Your order ${orderNumber} has been delivered. Enjoy your meal!`;
}
