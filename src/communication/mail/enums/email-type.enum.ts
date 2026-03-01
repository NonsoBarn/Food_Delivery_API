/**
 * Email Type Enum
 *
 * Each value is the BullMQ job name for that email type.
 *
 * KEY LEARNING: Job names in BullMQ
 * ===================================
 * When you call queue.add(jobName, payload), BullMQ stores that name with
 * the job. The processor's switch(job.name) routes to the right handler.
 *
 * Using an enum here means:
 *   - MailService.queue*() and MailProcessor switch() always agree on the name
 *   - Adding a new email type = add one entry here, one case in the processor
 */
export enum EmailType {
  WELCOME = 'welcome',
  ORDER_CONFIRMATION = 'order.confirmation',
  ORDER_STATUS_UPDATE = 'order.status.update',
  DELIVERY_COMPLETION = 'delivery.completion',
  /**
   * Phase 10.4: Sent to users who have items in their cart
   * but haven't placed an order in the past 3 days.
   * Queued by ReminderEmailsJob (scheduled cron task).
   */
  ABANDONED_CART = 'abandoned.cart',
}
