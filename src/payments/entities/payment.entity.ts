/**
 * Payment Entity
 *
 * Tracks every payment transaction on the platform — charges, refunds, and transfers.
 *
 * Architecture:
 * - One Payment record per provider transaction (charge, refund, or transfer)
 * - Links to orders via orderGroupId (multi-vendor) or orderId (single)
 * - transactionId is the provider's reference (Stripe PaymentIntent ID, Paystack reference, etc.)
 * - Unique on (transactionId, provider) to prevent duplicate records
 *
 * Flow:
 *   Customer initiates → Payment created (PENDING)
 *   Provider confirms → Payment updated (PAID)
 *   Admin refunds → New Payment created (type: REFUND), original marked as refunded
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../../orders/enums/payment-status.enum';

export enum PaymentTransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  TRANSFER = 'transfer',
}

@Entity('payments')
@Index(['orderId'])
@Index(['orderGroupId'])
@Index(['transactionId', 'provider'], { unique: true })
@Index(['status', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== ORDER LINK ====================

  @Column({ type: 'uuid', nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  /** Links all payments from one multi-vendor checkout */
  @Column({ type: 'uuid', nullable: true })
  orderGroupId: string;

  // ==================== PROVIDER DETAILS ====================

  @Column({ type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  /** Provider's transaction reference (Stripe PI ID, Paystack reference, Flutterwave tx_ref) */
  @Column({ type: 'varchar', length: 255 })
  transactionId: string;

  @Column({ type: 'enum', enum: PaymentTransactionType })
  transactionType: PaymentTransactionType;

  // ==================== AMOUNT ====================

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // ==================== STATUS ====================

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // ==================== CUSTOMER ====================

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string;

  // ==================== VENDOR ====================

  @Column({ type: 'uuid', nullable: true })
  vendorId: string;

  // ==================== METADATA ====================

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // ==================== ERROR TRACKING ====================

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  errorCode: string;

  // ==================== REFUND TRACKING ====================

  /** If this is a refund, links to the original charge payment */
  @Column({ type: 'uuid', nullable: true })
  refundedPaymentId: string;

  @Column({ type: 'boolean', default: false })
  isRefunded: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundedAmount: number;

  // ==================== TRANSFER TRACKING ====================

  /** Provider's transfer/payout ID for vendor splits */
  @Column({ type: 'varchar', length: 255, nullable: true })
  transferId: string;

  @Column({ type: 'boolean', default: false })
  isTransferred: boolean;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date;

  // ==================== TIMESTAMPS ====================

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
