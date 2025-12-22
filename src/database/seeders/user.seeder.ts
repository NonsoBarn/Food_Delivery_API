import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    console.log('Users already seeded, skipping...');
    return;
  }

  // Create test users with enum roles
  const users: Partial<User>[] = [
    {
      email: 'admin@fooddelivery.com',
      password: await bcrypt.hash('Admin123!', 10),
      role: UserRole.ADMIN,
    },
    {
      email: 'vendor@fooddelivery.com',
      password: await bcrypt.hash('Vendor123!', 10),
      role: UserRole.VENDOR,
    },
    {
      email: 'customer@fooddelivery.com',
      password: await bcrypt.hash('Customer123!', 10),
      role: UserRole.CUSTOMER,
    },
    {
      email: 'rider@fooddelivery.com',
      password: await bcrypt.hash('Rider123!', 10),
      role: UserRole.RIDER,
    },
  ];

  await userRepository.save(users);
  console.log('✅ Users seeded successfully!');
}
