import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToOne,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CustomerProfile } from './customer-profile.entity';
import { VendorProfile } from './vendor-profile.entity';
import { RiderProfile } from './rider-profile.entity';

@Entity('users') // Table name
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  // Profile relationships
  @OneToOne(() => CustomerProfile, (profile) => profile.user, {
    eager: false, // Don't load automatically
    cascade: true, // Save profile when saving user
  })
  customerProfile?: CustomerProfile;

  @OneToOne(() => VendorProfile, (profile) => profile.user, {
    eager: false,
    cascade: true,
  })
  vendorProfile?: VendorProfile;

  @OneToOne(() => RiderProfile, (profile) => profile.user, {
    eager: false,
    cascade: true,
  })
  riderProfile?: RiderProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Method to hash password before saving
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  // Method to compare passwords
  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}
