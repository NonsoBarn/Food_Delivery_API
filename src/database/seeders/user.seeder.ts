import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const existingUsers = await userRepository.count();
  if (existingUsers > 0) {
    console.log('Users already seeded, skipping...');
    return;
  }

  // Create test users with type assertion
  const users = [
    {
      email: 'admin@fooddelivery.com',
      password: (await bcrypt.hash('Admin123!', 10)) as string,
      role: 'admin',
    },
    {
      email: 'vendor@fooddelivery.com',
      password: (await bcrypt.hash('Vendor123!', 10)) as string,
      role: 'vendor',
    },
    {
      email: 'customer@fooddelivery.com',
      password: (await bcrypt.hash('Customer123!', 10)) as string,
      role: 'customer',
    },
    {
      email: 'rider@fooddelivery.com',
      password: (await bcrypt.hash('Rider123!', 10)) as string,
      role: 'rider',
    },
  ];

  await userRepository.save(users);
  console.log('✅ Users seeded successfully!');
}
