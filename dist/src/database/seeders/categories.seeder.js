"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCategories = seedCategories;
const category_entity_1 = require("../../products/entities/category.entity");
const slug_util_1 = require("../../common/utils/slug.util");
const categoriesData = [
    {
        name: 'Fast Food',
        description: 'Quick and delicious meals ready in minutes',
        displayOrder: 1,
        children: [
            {
                name: 'Burgers',
                description: 'Juicy burgers with premium toppings',
                displayOrder: 1,
            },
            {
                name: 'Pizza',
                description: 'Hand-tossed pizzas with fresh ingredients',
                displayOrder: 2,
            },
            {
                name: 'Fried Chicken',
                description: 'Crispy fried chicken made to perfection',
                displayOrder: 3,
            },
        ],
    },
    {
        name: 'Beverages',
        description: 'Refreshing drinks and smoothies',
        displayOrder: 2,
    },
    {
        name: 'Desserts',
        description: 'Sweet treats and indulgent desserts',
        displayOrder: 3,
    },
];
async function seedCategories(dataSource) {
    const categoryRepo = dataSource.getRepository(category_entity_1.Category);
    console.log('📂 Seeding categories...');
    const allCategories = [];
    for (const catData of categoriesData) {
        let parent = await categoryRepo.findOne({
            where: { name: catData.name },
        });
        if (!parent) {
            parent = categoryRepo.create({
                name: catData.name,
                slug: (0, slug_util_1.slugify)(catData.name),
                description: catData.description,
                displayOrder: catData.displayOrder,
                isActive: true,
            });
            parent = await categoryRepo.save(parent);
            console.log(`  ✅ Created category: ${catData.name}`);
        }
        else {
            console.log(`  ⏭️  Category exists: ${catData.name}`);
        }
        allCategories.push(parent);
        if (catData.children) {
            for (const childData of catData.children) {
                let child = await categoryRepo.findOne({
                    where: { name: childData.name },
                });
                if (!child) {
                    child = categoryRepo.create({
                        name: childData.name,
                        slug: (0, slug_util_1.slugify)(childData.name),
                        description: childData.description,
                        displayOrder: childData.displayOrder,
                        parentId: parent.id,
                        isActive: true,
                    });
                    child = await categoryRepo.save(child);
                    console.log(`  ✅ Created subcategory: ${parent.name} > ${childData.name}`);
                }
                else {
                    console.log(`  ⏭️  Subcategory exists: ${childData.name}`);
                }
                allCategories.push(child);
            }
        }
    }
    console.log(`📂 Categories seeding complete (${allCategories.length} categories)\n`);
    return allCategories;
}
//# sourceMappingURL=categories.seeder.js.map