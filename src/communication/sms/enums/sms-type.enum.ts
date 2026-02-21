/**
 * SMS Type Enum
 *
 * Each value is the BullMQ job name for that SMS type.
 * SMS types are fewer than email types because SMS is short (160 chars)
 * and should only be used for time-sensitive, high-value messages.
 */
export enum SmsType {
  ORDER_CONFIRMATION = 'sms.order.confirmation',
  ORDER_CANCELLED = 'sms.order.cancelled',
  DELIVERY_ASSIGNED = 'sms.delivery.assigned',
  DELIVERY_COMPLETION = 'sms.delivery.completion',
}
