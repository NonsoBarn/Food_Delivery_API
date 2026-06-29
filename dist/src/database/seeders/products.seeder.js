"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedProducts = seedProducts;
const product_entity_1 = require("../../products/entities/product.entity");
const product_status_enum_1 = require("../../products/enums/product-status.enum");
const slug_util_1 = require("../../common/utils/slug.util");
const productsData = [
    {
        name: 'Classic Burger',
        description: 'A timeless classic with juicy beef patty, fresh lettuce, tomatoes, and our signature sauce.',
        price: 8.99,
        stock: 50,
        sku: 'PP-BURG-001',
        vendorName: 'Pizza Palace',
        categoryName: 'Burgers',
    },
    {
        name: 'Cheese Burger',
        description: 'Our classic burger topped with melted cheddar cheese and caramelized onions.',
        price: 9.99,
        stock: 45,
        sku: 'PP-BURG-002',
        vendorName: 'Pizza Palace',
        categoryName: 'Burgers',
    },
    {
        name: 'Veggie Burger',
        description: 'A hearty plant-based patty with avocado, fresh greens, and chipotle mayo.',
        price: 10.99,
        stock: 30,
        sku: 'PP-BURG-003',
        vendorName: 'Pizza Palace',
        categoryName: 'Burgers',
    },
    {
        name: 'Double Burger',
        description: 'Two juicy beef patties stacked high with double cheese, bacon, and BBQ sauce.',
        price: 13.99,
        stock: 35,
        sku: 'PP-BURG-004',
        vendorName: 'Pizza Palace',
        categoryName: 'Burgers',
    },
    {
        name: 'Chicken Burger',
        description: 'Crispy fried chicken breast with coleslaw, pickles, and spicy mayo.',
        price: 9.49,
        stock: 40,
        sku: 'PP-BURG-005',
        vendorName: 'Pizza Palace',
        categoryName: 'Burgers',
    },
    {
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with San Marzano tomato sauce, fresh mozzarella, and basil.',
        price: 11.99,
        stock: 25,
        sku: 'PP-PIZ-001',
        vendorName: 'Pizza Palace',
        categoryName: 'Pizza',
    },
    {
        name: 'Pepperoni Pizza',
        description: 'Loaded with spicy pepperoni slices, mozzarella cheese, and our house-made tomato sauce.',
        price: 12.99,
        stock: 30,
        sku: 'PP-PIZ-002',
        vendorName: 'Pizza Palace',
        categoryName: 'Pizza',
    },
    {
        name: 'Veggie Pizza',
        description: 'A garden-fresh pizza with bell peppers, mushrooms, olives, onions, and tomatoes.',
        price: 11.49,
        stock: 20,
        sku: 'PP-PIZ-003',
        vendorName: 'Pizza Palace',
        categoryName: 'Pizza',
    },
    {
        name: 'Royal Burger',
        description: 'The king of burgers! Premium Angus beef with truffle aioli, arugula, and aged cheddar.',
        price: 14.99,
        stock: 25,
        sku: 'BK-BURG-001',
        vendorName: 'Burger Kingdom',
        categoryName: 'Burgers',
    },
    {
        name: 'Bacon Burger',
        description: 'Smoky bacon strips, melted Swiss cheese, caramelized onions, and honey mustard.',
        price: 12.49,
        stock: 35,
        sku: 'BK-BURG-002',
        vendorName: 'Burger Kingdom',
        categoryName: 'Burgers',
    },
];
async function seedProducts(dataSource, vendors, categories) {
    const productRepo = dataSource.getRepository(product_entity_1.Product);
    console.log('🍔 Seeding products...');
    let created = 0;
    let skipped = 0;
    for (const productData of productsData) {
        const existing = await productRepo.findOne({
            where: { name: productData.name, vendorId: getVendorId(vendors, productData.vendorName) },
        });
        if (existing) {
            console.log(`  ⏭️  Product exists: ${productData.name}`);
            skipped++;
            continue;
        }
        const vendor = vendors.find((v) => v.businessName === productData.vendorName);
        if (!vendor) {
            console.log(`  ⚠️  Vendor not found: ${productData.vendorName}`);
            continue;
        }
        const category = categories.find((c) => c.name === productData.categoryName);
        if (!category) {
            console.log(`  ⚠️  Category not found: ${productData.categoryName}`);
            continue;
        }
        const product = productRepo.create({
            name: productData.name,
            slug: (0, slug_util_1.slugify)(productData.name),
            description: productData.description,
            price: productData.price,
            stock: productData.stock,
            sku: productData.sku,
            status: product_status_enum_1.ProductStatus.PUBLISHED,
            vendorId: vendor.id,
            categoryId: category.id,
        });
        await productRepo.save(product);
        console.log(`  ✅ Created product: ${productData.name} (${productData.vendorName})`);
        created++;
    }
    console.log(`🍔 Products seeding complete (${created} created, ${skipped} skipped)\n`);
}
function getVendorId(vendors, vendorName) {
    return vendors.find((v) => v.businessName === vendorName)?.id;
}
//# sourceMappingURL=products.seeder.js.map