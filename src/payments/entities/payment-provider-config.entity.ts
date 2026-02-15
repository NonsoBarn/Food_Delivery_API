/**
 * Payment Provider Config Entity
 *
 * Admin-managed configuration for each payment provider on the platform.
 * Controls which providers are available to customers at checkout.
 *
 * The admin can:
 * - Enable/disable providers
 * - Set platform fee percentages per provider
 * - Configure supported currencies
 * - Add display names and descriptions for the checkout UI
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentProvider } from '../enums/payment-provider.enum';

@Entity('payment_provider_configs')
export class PaymentProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** One config per provider — unique constraint */
  @Column({ type: 'enum', enum: PaymentProvider, unique: true })
  provider: PaymentProvider;

  /** Whether this provider is available to customers */
  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  /** Display name shown to customers (e.g., "Pay with Card (Stripe)") */
  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string;

  /** Description shown on checkout page */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Currencies this provider supports on the platform (e.g., ["USD", "EUR"]) */
  @Column({ type: 'jsonb', default: [] })
  supportedCurrencies: string[];

  /** Platform fee as a percentage of the transaction (e.g., 15.00 = 15%) */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  platformFeePercentage: number;

  /** Fixed platform fee per transaction */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFeeFixed: number;

  /** Additional provider-specific config (non-sensitive) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
