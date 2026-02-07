import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  RiderStatus,
  VehicleType,
} from '../../users/entities/rider-profile.entity';

const usersData = [
  {
    email: 'admin@fooddelivery.com',
    password: 'Admin123!',
    role: UserRole.ADMIN,
  },
  {
    email: 'pizzapalace@example.com',
    password: 'Vendor123!',
    role: UserRole.VENDOR,
  },
  {
    email: 'burgerkingdom@example.com',
    password: 'Vendor123!',
    role: UserRole.VENDOR,
  },
  {
    email: 'customer1@example.com',
    password: 'Customer123!',
    role: UserRole.CUSTOMER,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+1234567001',
      deliveryAddress: '123 Main Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    },
  },
  {
    email: 'customer2@example.com',
    password: 'Customer123!',
    role: UserRole.CUSTOMER,
    profile: {
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+1234567002',
      deliveryAddress: '456 Oak Avenue',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    },
  },
  {
    email: 'rider@example.com',
    password: 'Rider123!',
    role: UserRole.RIDER,
    profile: {
      firstName: 'Mike',
      lastName: 'Rider',
      phoneNumber: '+1234567003',
      vehicleType: VehicleType.MOTORCYCLE,
      vehicleModel: 'Honda CB300R',
      vehiclePlateNumber: 'LAG-123-RD',
      vehicleColor: 'Black',
      status: RiderStatus.APPROVED,
      approvedAt: new Date(),
    },
  },
];

export async function seedUsers(dataSource: DataSource): Promise<User[]> {
  const userRepo = dataSource.getRepository(User);
  const customerProfileRepo = dataSource.getRepository(CustomerProfile);
  const riderProfileRepo = dataSource.getRepository(RiderProfile);

  console.log('👤 Seeding users...');

  const seededUsers: User[] = [];

  for (const userData of usersData) {
    let user = await userRepo.findOne({ where: { email: userData.email } });

    if (!user) {
      // User entity has @BeforeInsert that auto-hashes the password
      user = userRepo.create({
        email: userData.email,
        password: userData.password,
        role: userData.role,
      });
      user = await userRepo.save(user);
      console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
    } else {
      console.log(`  ⏭️  User exists: ${userData.email}`);
    }

    // Create customer profile
    if (userData.role === UserRole.CUSTOMER && userData.profile) {
      const existingProfile = await customerProfileRepo.findOne({
        where: { userId: user.id },
      });
      if (!existingProfile) {
        const profile = customerProfileRepo.create({
          ...userData.profile,
          userId: user.id,
        });
        await customerProfileRepo.save(profile);
        console.log(`  📋 Created customer profile for ${userData.email}`);
      }
    }

    // Create rider profile
    if (userData.role === UserRole.RIDER && userData.profile) {
      const existingProfile = await riderProfileRepo.findOne({
        where: { userId: user.id },
      });
      if (!existingProfile) {
        const profile = riderProfileRepo.create({
          ...userData.profile,
          userId: user.id,
        });
        await riderProfileRepo.save(profile);
        console.log(`  🏍️  Created rider profile for ${userData.email}`);
      }
    }

    seededUsers.push(user);
  }

  console.log(`👤 Users seeding complete (${seededUsers.length} users)\n`);
  return seededUsers;
}
