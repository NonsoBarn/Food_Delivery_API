/**
 * NotificationType Enum
 *
 * Defines all possible categories of in-app notifications.
 * Stored as a PostgreSQL ENUM column in the notifications table.
 *
 * KEY LEARNING: Why use an Enum instead of a plain string?
 * =========================================================
 * Plain string:
 *   type: 'ORDER_CREATEDD'  // ← typo, silently stored — no error
 *
 * Enum:
 *   type: NotificationType.ORDER_CREATED  // ← typo caught at compile time
 *
 * PostgreSQL also enforces the enum at the database level — you cannot
 * insert a value that isn't in the ENUM definition.
 * This gives you TWO layers of protection: TypeScript + database.
 *
 * KEY LEARNING: Enum Naming Convention
 * =======================================
 * We prefix each variant with its domain:
 *   ORDER_*     → order lifecycle events (from customer and vendor perspective)
 *   DELIVERY_*  → delivery lifecycle events (from rider and customer perspective)
 *   SYSTEM      → admin broadcasts, platform announcements
 *
 * This makes it easy to filter notifications by domain:
 *   WHERE type LIKE 'ORDER_%'  → all order notifications
 */
export enum NotificationType {
  // ── Order events ─────────────────────────────────────────────────────────────

  /**
   * Sent to the VENDOR when a new order arrives.
   * The vendor needs to confirm or reject quickly.
   */
  ORDER_CREATED = 'ORDER_CREATED',

  /**
   * Sent to the CUSTOMER when the vendor confirms their order.
   * "Great news! Your order is confirmed and is being prepared."
   */
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',

  /**
   * Sent to the CUSTOMER when the kitchen starts preparing their food.
   * "Your food is being prepared!"
   */
  ORDER_PREPARING = 'ORDER_PREPARING',

  /**
   * Sent to the CUSTOMER when the order is ready for pickup by the rider.
   * "Your order is packed and waiting for the rider."
   */
  ORDER_READY = 'ORDER_READY',

  /**
   * Sent to both the CUSTOMER and VENDOR when an order is cancelled.
   * The reason may differ (vendor cancelled vs customer cancelled).
   */
  ORDER_CANCELLED = 'ORDER_CANCELLED',

  // ── Delivery events ───────────────────────────────────────────────────────────

  /**
   * Sent to the RIDER when they are assigned a delivery.
   * This is urgent — the rider needs to accept quickly.
   */
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',

  /**
   * Sent to the CUSTOMER when the rider accepts and is heading to the restaurant.
   * "Your rider is on their way to pick up your food!"
   */
  DELIVERY_ACCEPTED = 'DELIVERY_ACCEPTED',

  /**
   * Sent to the CUSTOMER when the rider picks up their food.
   * "Your food has been picked up! The rider is heading to you."
   */
  DELIVERY_PICKED_UP = 'DELIVERY_PICKED_UP',

  /**
   * Sent to both the CUSTOMER and VENDOR when delivery is completed.
   * Triggers any order review prompts in the client app.
   */
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',

  // ── System events ─────────────────────────────────────────────────────────────

  /**
   * Platform-wide announcements, admin messages, or maintenance notices.
   * Can be targeted to all users or specific roles.
   */
  SYSTEM = 'SYSTEM',
}
