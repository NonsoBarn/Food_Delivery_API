"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_seeder_js_1 = require("./user.seeder.js");
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: `.env.${process.env.NODE_ENV || 'development'}` });
async function runSeeders() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'food_delivery_dev',
        entities: ['src/**/*.entity{.ts,.js}'],
        migrations: ['src/database/migrations/*{.ts,.js}'],
        synchronize: false,
    });
    await dataSource.initialize();
    try {
        console.log('🌱 Starting database seeding...');
        await (0, user_seeder_js_1.seedUsers)(dataSource);
        console.log('✅ Seeding completed successfully!');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await dataSource.destroy();
        console.log('🔌 Database connection closed');
    }
}
runSeeders();
//# sourceMappingURL=index.js.map