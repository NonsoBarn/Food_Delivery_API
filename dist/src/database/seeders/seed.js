"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const user_entity_1 = require("../../users/entities/user.entity");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const vendor_profile_entity_1 = require("../../users/entities/vendor-profile.entity");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const category_entity_1 = require("../../products/entities/category.entity");
const product_entity_1 = require("../../products/entities/product.entity");
const product_image_entity_1 = require("../../products/entities/product-image.entity");
const users_seeder_1 = require("./users.seeder");
const vendor_profiles_seeder_1 = require("./vendor-profiles.seeder");
const categories_seeder_1 = require("./categories.seeder");
const products_seeder_1 = require("./products.seeder");
async function runSeeders() {
    const dataSource = new typeorm_1.DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'food_delivery_dev',
        entities: [
            user_entity_1.User,
            customer_profile_entity_1.CustomerProfile,
            vendor_profile_entity_1.VendorProfile,
            rider_profile_entity_1.RiderProfile,
            category_entity_1.Category,
            product_entity_1.Product,
            product_image_entity_1.ProductImage,
        ],
        synchronize: false,
    });
    try {
        await dataSource.initialize();
        console.log('🔌 Database connected\n');
        console.log('🌱 Starting database seeding...\n');
        const users = await (0, users_seeder_1.seedUsers)(dataSource);
        const vendors = await (0, vendor_profiles_seeder_1.seedVendorProfiles)(dataSource, users);
        const categories = await (0, categories_seeder_1.seedCategories)(dataSource);
        await (0, products_seeder_1.seedProducts)(dataSource, vendors, categories);
        console.log('✅ All seeding completed successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}
runSeeders();
//# sourceMappingURL=seed.js.map