import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SmsType } from './enums/sms-type.enum';
import type { SmsOrderData, SmsDeliveryData } from './interfaces/sms-service.interface';

/**
 * SmsService — the BullMQ job PRODUCER for SMS.
 *
 * Same pattern as MailService — adds jobs to the 'sms' queue and returns.
 * The actual Twilio API call happens in SmsProcessor (the consumer).
 *
 * KEY LEARNING: Why separate 'email' and 'sms' queues?
 * ======================================================
 * Each queue has its own:
 * - Worker concurrency settings (SMS can have higher concurrency than email)
 * - Retry configuration (Twilio vs SendGrid have different rate limits)
 * - Monitoring (you can see email failures separately from SMS failures)
 * - Pause/resume (you can pause SMS without affecting email, e.g. maintenance)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@InjectQueue('sms') private readonly smsQueue: Queue) {}

  private readonly defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  };

  async queueOrderConfirmationSms(data: SmsOrderData): Promise<void> {
    await this.smsQueue.add(SmsType.ORDER_CONFIRMATION, data, this.defaultJobOptions);
    this.logger.log(`Queued order confirmation SMS to: ${data.to}`);
  }

  async queueOrderCancelledSms(data: SmsOrderData): Promise<void> {
    await this.smsQueue.add(SmsType.ORDER_CANCELLED, data, this.defaultJobOptions);
    this.logger.log(`Queued order cancelled SMS to: ${data.to}`);
  }

  async queueDeliveryAssignedSms(data: SmsDeliveryData): Promise<void> {
    await this.smsQueue.add(SmsType.DELIVERY_ASSIGNED, data, this.defaultJobOptions);
    this.logger.log(`Queued delivery assigned SMS to: ${data.to}`);
  }

  async queueDeliveryCompletionSms(data: SmsDeliveryData): Promise<void> {
    await this.smsQueue.add(SmsType.DELIVERY_COMPLETION, data, this.defaultJobOptions);
    this.logger.log(`Queued delivery completion SMS to: ${data.to}`);
  }
}
