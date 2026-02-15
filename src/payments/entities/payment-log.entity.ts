/**
 * Payment Log Entity
 *
 * Immutable audit trail for every payment event — webhook payloads,
 * API responses, status changes. Never updated, only inserted.
 *
 * Serves two purposes:
 * 1. Debugging — raw payloads for investigating payment issues
 * 2. Idempotency — providerEventId prevents processing the same webhook twice
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentEventType } from '../enums/payment-event-type.enum';

@Entity('payment_logs')
@Index(['paymentId'])
@Index(['provider', 'eventType'])
@Index(['providerEventId', 'provider'], { unique: true, where: '"providerEventId" IS NOT NULL' })
export class PaymentLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Link to the Payment record (nullable for unmatched webhook events) */
  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentEventType })
  eventType: PaymentEventType;

  /**
   * Provider's unique event ID — used for idempotency.
   * If we receive a webhook with the same providerEventId twice, skip it.
   * Stripe: event.id, Paystack: data.id, Flutterwave: data.id
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  providerEventId: string | null;

  /** Raw payload from webhook or API response */
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  /** Whether this event has been processed */
  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'text', nullable: true })
  processingError: string;

  /** Whether the webhook signature was successfully verified */
  @Column({ type: 'boolean', default: false })
  signatureVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
