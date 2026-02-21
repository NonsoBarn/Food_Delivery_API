import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SmsProvider } from '../enums/sms-provider.enum';

/**
 * SmsProviderConfig Entity
 *
 * Same pattern as EmailProviderConfig — one row per SMS provider.
 * Admin enables/disables providers at runtime without code changes.
 */
@Entity('sms_provider_configs')
export class SmsProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SmsProvider,
    unique: true,
  })
  provider: SmsProvider;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
