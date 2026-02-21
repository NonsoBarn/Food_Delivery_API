import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SmsFactoryService } from './sms-factory.service';
import { SmsType } from './enums/sms-type.enum';
import type { SmsOrderData, SmsDeliveryData } from './interfaces/sms-service.interface';

/**
 * SmsProcessor — BullMQ consumer for the 'sms' queue.
 *
 * Same structure as MailProcessor.
 * Each job.name maps to one ISmsService method.
 */
@Processor('sms')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private readonly factory: SmsFactoryService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing SMS job: ${job.name} (id: ${job.id})`);

    const smsService = await this.factory.getSmsService();

    switch (job.name) {
      case SmsType.ORDER_CONFIRMATION: {
        const data = job.data as SmsOrderData;
        await smsService.sendOrderConfirmation(data);
        break;
      }

      case SmsType.ORDER_CANCELLED: {
        const data = job.data as SmsOrderData;
        await smsService.sendOrderCancelled(data);
        break;
      }

      case SmsType.DELIVERY_ASSIGNED: {
        const data = job.data as SmsDeliveryData;
        await smsService.sendDeliveryAssigned(data);
        break;
      }

      case SmsType.DELIVERY_COMPLETION: {
        const data = job.data as SmsDeliveryData;
        await smsService.sendDeliveryCompletion(data);
        break;
      }

      default:
        this.logger.warn(`Unknown SMS job type: ${job.name}. Skipping.`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.logger.log(`SMS job completed: ${job.name} (id: ${job.id})`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `SMS job FAILED: ${job.name} (id: ${job.id}) | attempt ${job.attemptsMade}/${job.opts.attempts} | Error: ${error.message}`,
    );
  }
}
