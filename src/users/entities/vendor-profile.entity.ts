import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum VendorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('vendor_profiles')
export class VendorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column({ type: 'text', nullable: true })
  businessDescription: string;

  @Column({ nullable: true })
  businessPhone: string;

  @Column({ type: 'text', nullable: true })
  businessAddress: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  // Business documents (we'll store file paths)
  @Column({ nullable: true })
  businessLicense: string; // File path or URL

  @Column({ nullable: true })
  taxId: string; // Tax identification number

  @Column({ nullable: true })
  logoUrl: string; // Store logo path

  @Column({ nullable: true })
  bannerUrl: string; // Store banner path

  // Vendor approval status
  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.PENDING,
  })
  status: VendorStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string; // Why vendor was rejected

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  approvedBy: string; // Admin user ID who approved

  // Business hours (simplified - can be expanded later)
  @Column({ type: 'simple-json', nullable: true })
  businessHours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  // Rating (calculated from reviews - we'll implement later)
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  totalReviews: number;

  // One-to-One relationship with User
  @OneToOne(() => User, (user: User) => user.vendorProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
