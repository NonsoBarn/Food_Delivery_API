import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailFactoryService } from './mail-factory.service';
import { EmailType } from './enums/email-type.enum';
import type {
  OrderEmailData,
  StatusEmailData,
  DeliveryEmailData,
} from './interfaces/email-service.interface';

/**
 * MailProcessor — the BullMQ job CONSUMER for the 'email' queue.
 *
 * KEY LEARNING: @Processor decorator
 * =====================================
 * @Processor('email') binds this class to the BullMQ queue named 'email'.
 * BullMQ's worker polls Redis for new jobs. When it finds one, it calls
 * this class's process() method with the job object.
 *
 * KEY LEARNING: WorkerHost
 * ==========================
 * WorkerHost is the NestJS base class for BullMQ processors.
 * It handles the worker lifecycle (start, stop, error handling).
 * You must implement the abstract process(job: Job) method.
 *
 * KEY LEARNING: Why switch(job.name)?
 * =====================================
 * All email types go into the SAME 'email' queue.
 * BullMQ stores the job name (e.g. 'welcome', 'order.confirmation') with the job.
 * The switch statement routes each job to the correct email method.
 *
 * Alternative: use separate queues per email type.
 * Drawback: more queues = more Redis connections + more BullModule registrations.
 * One queue + job.name routing is simpler for this scale.
 *
 * KEY LEARNING: @OnWorkerEvent
 * ==============================
 * These decorators let you react to job lifecycle events:
 * - 'completed': log success, update analytics, etc.
 * - 'failed': alert on-call, increment error counter, etc.
 * - 'active': log when a job starts processing (useful for debugging slow jobs)
 *
 * BullMQ handles retries automatically based on the attempts/backoff config
 * set in MailService. You don't need to manually re-add failed jobs.
 */
@Processor('email')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly factory: EmailFactoryService) {
    super();
  }

  /**
   * Main entry point — called by BullMQ for each job dequeued.
   *
   * The factory resolves the active provider (DB → env fallback).
   * Then we delegate to the correct send method based on job.name.
   */
  async process(job: Job): Promise<void> {
    this.logger.log(`Processing email job: ${job.name} (id: ${job.id})`);

    // Resolve the active provider — SendGrid, Nodemailer, etc.
    const emailService = await this.factory.getEmailService();

    switch (job.name) {
      case EmailType.WELCOME: {
        /**
         * job.data is typed as unknown by BullMQ because any payload
         * can be stored. We cast to the expected shape here.
         * The payload was shaped in MailService.queueWelcomeEmail().
         */
        const { to, role } = job.data as { to: string; role: string };
        await emailService.sendWelcome(to, role);
        break;
      }

      case EmailType.ORDER_CONFIRMATION: {
        const data = job.data as OrderEmailData;
        await emailService.sendOrderConfirmation(data);
        break;
      }

      case EmailType.ORDER_STATUS_UPDATE: {
        const data = job.data as StatusEmailData;
        await emailService.sendOrderStatusUpdate(data);
        break;
      }

      case EmailType.DELIVERY_COMPLETION: {
        const data = job.data as DeliveryEmailData;
        await emailService.sendDeliveryCompletion(data);
        break;
      }

      case EmailType.ABANDONED_CART: {
        /**
         * Phase 10.4 — Abandoned cart reminder.
         *
         * KEY LEARNING: Graceful degradation / scaffolding
         * ==================================================
         * The actual email send is a TODO — you'd add sendAbandonedCart()
         * to the IEmailService interface and implement it in the providers.
         *
         * For now we log it to demonstrate the complete pipeline:
         *   Cron job → Redis SCAN → DB check → BullMQ job → Processor ← here
         *
         * The scaffolding is complete. Swapping the logger for a real
         * email send is a single-method change in the email providers.
         *
         * This also teaches an important pattern: build the pipeline first,
         * implement the terminal action last — you can verify the whole
         * flow without needing working SMTP credentials.
         */
        const { to, cartItemCount } = job.data as { to: string; cartItemCount: number };
        this.logger.log(
          `[ABANDONED_CART] Reminder email queued for ${to} (${cartItemCount} items). ` +
          `Implement sendAbandonedCart() in IEmailService to send real emails.`,
        );
        break;
      }

      default:
        this.logger.warn(`Unknown email job type: ${job.name}. Skipping.`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(
      `Email job completed: ${job.name} (id: ${job.id}) — provider: ${job.data?.to}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Email job FAILED: ${job.name} (id: ${job.id}) | attempt ${job.attemptsMade}/${job.opts.attempts} | Error: ${error.message}`,
    );
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    this.logger.debug(`Email job started: ${job.name} (id: ${job.id})`);
  }
}
