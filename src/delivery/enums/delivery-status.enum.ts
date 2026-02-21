/**
 * Delivery Status Enum
 *
 * Represents the lifecycle of a delivery assignment.
 *
 * KEY LEARNING: Separate Lifecycle from Parent Entity
 * ===================================================
 * Why does Delivery have its OWN status instead of reusing OrderStatus?
 *
 * Because a delivery and an order are different concepts with different lifecycles:
 * - An ORDER tracks: placed → confirmed → cooked → ready → picked up → delivered
 * - A DELIVERY tracks: assigned → accepted → picked up → delivered
 *
 * A delivery can be REJECTED without affecting the order (the order stays
 * READY_FOR_PICKUP and can be reassigned to another rider).
 *
 * This is the Single Responsibility Principle (SRP) applied to data:
 * each entity owns its own lifecycle, and they sync at key transition points.
 *
 * State Diagram:
 *
 *   PENDING_ACCEPTANCE ──→ ACCEPTED ──→ PICKED_UP ──→ DELIVERED
 *          │                                              (terminal)
 *          ▼
 *       REJECTED (terminal — order gets reassigned)
 *
 *   Any active state ──→ CANCELLED (admin only, terminal)
 */
export enum DeliveryStatus {
  /** Rider has been assigned but hasn't responded yet */
  PENDING_ACCEPTANCE = 'pending_acceptance',

  /** Rider accepted — they're heading to the vendor */
  ACCEPTED = 'accepted',

  /** Rider declined — order goes back to the assignment pool */
  REJECTED = 'rejected',

  /** Rider collected the food from the vendor */
  PICKED_UP = 'picked_up',

  /** Rider delivered to the customer — delivery complete */
  DELIVERED = 'delivered',

  /** Admin cancelled this delivery (e.g., rider emergency) */
  CANCELLED = 'cancelled',
}
