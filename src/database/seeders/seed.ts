import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Import entities
import { User } from '../../users/entities/user.entity';
import { CustomerProfile } from '../../users/entities/customer-profile.entity';
import { VendorProfile } from '../../users/entities/vendor-profile.entity';
import { RiderProfile } from '../../users/entities/rider-profile.entity';
import { Category } from '../../products/entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductImage } from '../../products/entities/product-image.entity';

// Import seeders
import { seedUsers } from './users.seeder';
import { seedVendorProfiles } from './vendor-profiles.seeder';
import { seedCategories } from './categories.seeder';
import { seedProducts } from './products.seeder';

async function runSeeders() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'food_delivery_dev',
    entities: [
      User,
      CustomerProfile,
      VendorProfile,
      RiderProfile,
      Category,
      Product,
      ProductImage,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('🔌 Database connected\n');
    console.log('🌱 Starting database seeding...\n');

    // 1. Seed users (must be first - other seeders depend on users)
    const users = await seedUsers(dataSource);

    // 2. Seed vendor profiles (depends on users)
    const vendors = await seedVendorProfiles(dataSource, users);

    // 3. Seed categories (independent but needed before products)
    const categories = await seedCategories(dataSource);

    // 4. Seed products (depends on vendors and categories)
    await seedProducts(dataSource, vendors, categories);

    console.log('✅ All seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

runSeeders();
