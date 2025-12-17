import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'food_delivery_dev',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false, // Always false for migrations
});
