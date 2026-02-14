/**
 * Order Status State Machine
 *
 * KEY LEARNING: State Machine Pattern
 * ====================================
 * A state machine defines:
 * 1. A set of possible STATES (our OrderStatus enum)
 * 2. A set of valid TRANSITIONS between states
 * 3. Rules about WHO can trigger each transition
 *
 * Why use a state machine instead of if/else chains?
 * - Transitions are DATA, not code → easier to maintain
 * - Adding a new status = adding entries to a map, not rewriting logic
 * - Easy to visualize and test
 * - Prevents "impossible" states (e.g., PENDING → DELIVERED)
 *
 * Visual representation:
 *
 *   PENDING ──→ CONFIRMED ──→ PREPARING ──→ READY_FOR_PICKUP ──→ PICKED_UP ──→ DELIVERED
 *     │              │              │                │
 *     ▼              ▼              ▼                ▼
 *   CANCELLED    CANCELLED    CANCELLED         CANCELLED (admin only)
 *
 * Notice:
 * - You can NEVER go backwards (no CONFIRMED → PENDING)
 * - You can NEVER skip steps (no PENDING → PREPARING)
 * - DELIVERED and CANCELLED are terminal states (no transitions out)
 * - Cancellation becomes more restricted as the order progresses
 *
 * This is a PURE FUNCTION module:
 * - No classes, no NestJS decorators, no injected dependencies
 * - Just data (the transition maps) and functions
 * - This makes it trivially testable: import → call → assert
 */
import { OrderStatus } from './enums/order-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Valid Transitions Map
 *
 * For each status, lists which statuses it can transition TO.
 *
 * Think of it like a graph:
 *   Node = OrderStatus
 *   Edge = Valid transition
 *
 * If a transition isn't in this map, it's ILLEGAL.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],

  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],

  [OrderStatus.PREPARING]: [
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED,
  ],

  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],

  // Terminal states — no transitions out
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Transition Role Permissions
 *
 * Maps "fromStatus→toStatus" to the roles allowed to trigger it.
 *
 * Business Rules:
 * - VENDOR confirms, prepares, and marks ready (they control the kitchen)
 * - RIDER picks up and delivers (they control the delivery)
 * - CUSTOMER can cancel early (before preparation starts)
 * - ADMIN can do anything (for support/emergency)
 *
 * Cancellation gets more restrictive over time:
 * - PENDING: Customer, Vendor, or Admin can cancel
 * - CONFIRMED: Customer, Vendor, or Admin can cancel
 * - PREPARING: Only Vendor or Admin (customer can't cancel once cooking starts)
 * - READY_FOR_PICKUP: Only Admin (food is already made, need manual resolution)
 * - PICKED_UP/DELIVERED: Can't cancel (food is in transit or already delivered)
 */
const TRANSITION_ROLES: Record<string, UserRole[]> = {
  // Vendor confirms the order (accepts it)
  [`${OrderStatus.PENDING}->${OrderStatus.CONFIRMED}`]: [
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Early cancellation (anyone involved)
  [`${OrderStatus.PENDING}->${OrderStatus.CANCELLED}`]: [
    UserRole.CUSTOMER,
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Vendor starts preparing
  [`${OrderStatus.CONFIRMED}->${OrderStatus.PREPARING}`]: [
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Cancellation after confirmation (customer can still cancel)
  [`${OrderStatus.CONFIRMED}->${OrderStatus.CANCELLED}`]: [
    UserRole.CUSTOMER,
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Vendor marks food as ready
  [`${OrderStatus.PREPARING}->${OrderStatus.READY_FOR_PICKUP}`]: [
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Cancellation during preparation (customer can't cancel — food is being made)
  [`${OrderStatus.PREPARING}->${OrderStatus.CANCELLED}`]: [
    UserRole.VENDOR,
    UserRole.ADMIN,
  ],

  // Rider picks up the food
  [`${OrderStatus.READY_FOR_PICKUP}->${OrderStatus.PICKED_UP}`]: [
    UserRole.RIDER,
    UserRole.ADMIN,
  ],

  // Very late cancellation (admin only — food is ready, need manual resolution)
  [`${OrderStatus.READY_FOR_PICKUP}->${OrderStatus.CANCELLED}`]: [
    UserRole.ADMIN,
  ],

  // Rider delivers to customer
  [`${OrderStatus.PICKED_UP}->${OrderStatus.DELIVERED}`]: [
    UserRole.RIDER,
    UserRole.ADMIN,
  ],
};

/**
 * Check if a transition from one status to another is valid.
 *
 * This ONLY checks the transition graph, NOT role permissions.
 *
 * @param from - Current order status
 * @param to - Desired new status
 * @returns true if the transition is structurally valid
 *
 * @example
 * canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)  // true
 * canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)   // false (can't skip)
 * canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED) // false (terminal)
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a specific role can make a specific transition.
 *
 * This checks BOTH the transition graph AND role permissions.
 *
 * @param from - Current order status
 * @param to - Desired new status
 * @param role - The user's role
 * @returns true if both the transition is valid AND the role is permitted
 *
 * @example
 * canRoleTransition(PENDING, CONFIRMED, VENDOR)    // true (vendor confirms)
 * canRoleTransition(PENDING, CONFIRMED, CUSTOMER)   // false (customer can't confirm)
 * canRoleTransition(PENDING, DELIVERED, ADMIN)       // false (can't skip steps, even admin)
 */
export function canRoleTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole,
): boolean {
  // First check: is this transition valid at all?
  if (!canTransition(from, to)) {
    return false;
  }

  // Second check: does this role have permission for this specific transition?
  const key = `${from}->${to}`;
  return TRANSITION_ROLES[key]?.includes(role) ?? false;
}

/**
 * Get all valid next statuses for a given status and role.
 *
 * Useful for:
 * - Showing the user what actions they can take
 * - API error messages ("you can do X, Y, or Z")
 * - Frontend: enabling/disabling status buttons
 *
 * @param currentStatus - Current order status
 * @param role - The user's role
 * @returns Array of statuses this role can transition to
 *
 * @example
 * getValidNextStatuses(PENDING, VENDOR)   // [CONFIRMED, CANCELLED]
 * getValidNextStatuses(PENDING, CUSTOMER) // [CANCELLED]
 * getValidNextStatuses(DELIVERED, ADMIN)  // [] (terminal state)
 */
export function getValidNextStatuses(
  currentStatus: OrderStatus,
  role: UserRole,
): OrderStatus[] {
  const possibleNext = VALID_TRANSITIONS[currentStatus] || [];

  return possibleNext.filter((nextStatus) => {
    const key = `${currentStatus}->${nextStatus}`;
    return TRANSITION_ROLES[key]?.includes(role) ?? false;
  });
}
