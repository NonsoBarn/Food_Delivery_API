import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailProvider } from '../enums/email-provider.enum';

/**
 * EmailProviderConfig Entity
 *
 * Stores admin-controlled configuration for each email provider.
 * One row per provider (SENDGRID, NODEMAILER, ...).
 *
 * KEY LEARNING: Why store provider config in the DB?
 * ===================================================
 * Environment variables require a server restart to change.
 * A DB row can be toggled via an admin API call — no downtime.
 *
 * This mirrors PaymentProviderConfig from the payments module.
 * Admin flow:
 *   1. Admin calls PATCH /communication/mail/providers/sendgrid { isEnabled: true }
 *   2. Row is updated in DB
 *   3. Next email job picks up the new active provider from DB
 *
 * The factory queries this table on every send:
 *   SELECT * FROM email_provider_configs WHERE isEnabled = true LIMIT 1
 *
 * KEY LEARNING: jsonb column for metadata
 * ========================================
 * 'metadata' is a flexible JSON column for provider-specific settings
 * that don't fit neatly into fixed columns (e.g. reply-to address,
 * sandbox mode flag, custom headers). Avoids ALTER TABLE for minor config.
 */
@Entity('email_provider_configs')
export class EmailProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EmailProvider,
    unique: true, // One row per provider — no duplicates
  })
  provider: EmailProvider;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean; // Only one provider should be true at a time

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string | null; // Human-readable label for the admin UI

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null; // Flexible extra config

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
