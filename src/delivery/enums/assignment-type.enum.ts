/**
 * Assignment Type Enum
 *
 * Tracks HOW a rider was assigned to a delivery.
 *
 * KEY LEARNING: Audit Trail in Enums
 * ===================================
 * In production systems, knowing HOW something happened is as important
 * as knowing WHAT happened. This enum records the assignment method so
 * you can later analyze:
 * - Do auto-assigned deliveries complete faster?
 * - What's the rejection rate for manual vs auto assignments?
 * - Should we adjust the auto-assignment radius?
 */
export enum AssignmentType {
  /** Admin manually chose this rider */
  MANUAL = 'manual',

  /** System auto-selected the nearest available rider */
  AUTO = 'auto',
}
