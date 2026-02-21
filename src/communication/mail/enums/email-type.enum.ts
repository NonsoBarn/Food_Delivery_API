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
}
