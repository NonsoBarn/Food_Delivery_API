import { seedUsers } from './user.seeder';
import ormconfig from '../../../ormconfig';

async function runSeeders() {
  const dataSource = await ormconfig.initialize();

  try {
    console.log('🌱 Starting database seeding...');

    await seedUsers(dataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1); // Exit with error code
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

runSeeders();
