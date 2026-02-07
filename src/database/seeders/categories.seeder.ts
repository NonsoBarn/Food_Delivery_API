import { DataSource } from 'typeorm';
import { Category } from '../../products/entities/category.entity';
import { slugify } from '../../common/utils/slug.util';

interface CategoryData {
  name: string;
  description: string;
  displayOrder: number;
  children?: CategoryData[];
}

const categoriesData: CategoryData[] = [
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

export async function seedCategories(
  dataSource: DataSource,
): Promise<Category[]> {
  const categoryRepo = dataSource.getRepository(Category);

  console.log('📂 Seeding categories...');

  const allCategories: Category[] = [];

  for (const catData of categoriesData) {
    // Seed parent category
    let parent = await categoryRepo.findOne({
      where: { name: catData.name },
    });

    if (!parent) {
      parent = categoryRepo.create({
        name: catData.name,
        slug: slugify(catData.name),
        description: catData.description,
        displayOrder: catData.displayOrder,
        isActive: true,
      });
      parent = await categoryRepo.save(parent);
      console.log(`  ✅ Created category: ${catData.name}`);
    } else {
      console.log(`  ⏭️  Category exists: ${catData.name}`);
    }

    allCategories.push(parent);

    // Seed child categories
    if (catData.children) {
      for (const childData of catData.children) {
        let child = await categoryRepo.findOne({
          where: { name: childData.name },
        });

        if (!child) {
          child = categoryRepo.create({
            name: childData.name,
            slug: slugify(childData.name),
            description: childData.description,
            displayOrder: childData.displayOrder,
            parentId: parent.id,
            isActive: true,
          });
          child = await categoryRepo.save(child);
          console.log(`  ✅ Created subcategory: ${parent.name} > ${childData.name}`);
        } else {
          console.log(`  ⏭️  Subcategory exists: ${childData.name}`);
        }

        allCategories.push(child);
      }
    }
  }

  console.log(
    `📂 Categories seeding complete (${allCategories.length} categories)\n`,
  );
  return allCategories;
}
