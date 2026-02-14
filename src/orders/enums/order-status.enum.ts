/**
 * Order Status Enum
 *
 * Represents the lifecycle of a food delivery order.
 * These statuses follow a strict progression — you can't skip steps.
 *
 * Flow:
 *   PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
 *                                                                        ↓
 *   Any early stage ──────────────────────────────────────────────→ CANCELLED
 *
 * Why string enums?
 * - Database stores readable values ('pending', not 0)
 * - API responses are self-documenting
 * - Debugging is easier (you see 'preparing' in logs, not 2)
 */
export enum OrderStatus {
  /** Order just placed, awaiting vendor confirmation */
  PENDING = 'pending',

  /** Vendor accepted the order */
  CONFIRMED = 'confirmed',

  /** Kitchen is actively working on it */
  PREPARING = 'preparing',

  /** Food is ready, waiting for rider to collect */
  READY_FOR_PICKUP = 'ready_for_pickup',

  /** Rider has collected the food, en route to customer */
  PICKED_UP = 'picked_up',

  /** Customer received the food — terminal state */
  DELIVERED = 'delivered',

  /** Order was cancelled — terminal state */
  CANCELLED = 'cancelled',
}
