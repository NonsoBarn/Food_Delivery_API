import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailType } from './enums/email-type.enum';
import type {
  OrderEmailData,
  StatusEmailData,
  DeliveryEmailData,
} from './interfaces/email-service.interface';

/**
 * MailService — the BullMQ job PRODUCER
 *
 * KEY LEARNING: Producer / Consumer pattern
 * ==========================================
 * In a queue system, there are two roles:
 *
 * PRODUCER (this file):
 *   - Adds jobs to the queue
 *   - Returns immediately — it does NOT wait for the email to send
 *   - The HTTP request can finish before the email is even started
 *
 * CONSUMER (mail.processor.ts):
 *   - Reads jobs from the queue one by one
 *   - Actually calls SendGrid / Nodemailer
 *   - Runs in the background, independently of HTTP
 *
 * KEY LEARNING: Queue options (attempts + backoff)
 * ==================================================
 * { attempts: 3 } — BullMQ will retry the job up to 3 times if it throws
 * { backoff: { type: 'exponential', delay: 5000 } }
 *   - 1st retry: wait 5s  (5000ms)
 *   - 2nd retry: wait 25s (5000ms × 5^1)
 *   - 3rd retry: wait 125s (5000ms × 5^2)
 * This prevents hammering a temporarily unavailable service (e.g. SendGrid 503).
 *
 * { removeOnComplete: 100 } — keep the last 100 completed jobs in Redis for debugging
 * { removeOnFail: 500 }     — keep failed jobs so you can inspect and retry them
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // @InjectQueue('email') injects the BullMQ Queue registered with name 'email'
  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  private readonly defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  };

  /**
   * Queue a welcome email job.
   * Called by CommunicationEventsListener after 'user.registered' event.
   */
  async queueWelcomeEmail(to: string, role: string): Promise<void> {
    await this.emailQueue.add(
      EmailType.WELCOME,
      { to, role },
      this.defaultJobOptions,
    );

    this.logger.log(`Queued welcome email for: ${to}`);
  }

  /**
   * Queue an order confirmation email job.
   */
  async queueOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
    await this.emailQueue.add(
      EmailType.ORDER_CONFIRMATION,
      data,
      this.defaultJobOptions,
    );

    this.logger.log(`Queued order confirmation email for: ${data.to} (${data.orderNumber})`);
  }

  /**
   * Queue an order status update email job.
   */
  async queueOrderStatusUpdateEmail(data: StatusEmailData): Promise<void> {
    await this.emailQueue.add(
      EmailType.ORDER_STATUS_UPDATE,
      data,
      this.defaultJobOptions,
    );

    this.logger.log(`Queued order status update email for: ${data.to} (${data.orderNumber} → ${data.newStatus})`);
  }

  /**
   * Queue a delivery completion email job.
   */
  async queueDeliveryCompletionEmail(data: DeliveryEmailData): Promise<void> {
    await this.emailQueue.add(
      EmailType.DELIVERY_COMPLETION,
      data,
      this.defaultJobOptions,
    );

    this.logger.log(`Queued delivery completion email for: ${data.to} (${data.orderNumber})`);
  }

  /**
   * Queue an abandoned cart reminder email.
   *
   * Phase 10.4 — called by ReminderEmailsJob (scheduled cron task)
   * when a user has items in their Redis cart but hasn't ordered in 3+ days.
   *
   * KEY LEARNING: Re-using the same BullMQ queue for a new job type
   * =================================================================
   * We add a job with name EmailType.ABANDONED_CART to the same 'email' queue.
   * The MailProcessor switch(job.name) routes it to the correct handler.
   * No new queue is needed — one queue, multiple job types via the job name.
   *
   * KEY LEARNING: Job priority
   * ===========================
   * BullMQ supports priority-based job ordering.
   * Lower number = higher priority. Default = 0 (highest).
   * We use priority: 10 for reminders — they're lower priority than
   * transactional emails (order confirmation, delivery completion).
   * This ensures transactional emails always process first.
   */
  async queueAbandonedCartEmail(to: string, cartItemCount: number): Promise<void> {
    await this.emailQueue.add(
      EmailType.ABANDONED_CART,
      { to, cartItemCount },
      {
        ...this.defaultJobOptions,
        priority: 10, // Lower than transactional emails
      },
    );

    this.logger.log(`Queued abandoned cart reminder for: ${to} (${cartItemCount} items)`);
  }
}
