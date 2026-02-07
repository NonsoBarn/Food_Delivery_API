import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  VendorProfile,
  VendorStatus,
} from '../../users/entities/vendor-profile.entity';

const vendorsData = [
  {
    email: 'pizzapalace@example.com',
    businessName: 'Pizza Palace',
    businessDescription:
      'The finest artisan pizzas and burgers in town. Fresh ingredients, authentic recipes.',
    businessPhone: '+1234567010',
    businessAddress: '10 Victoria Island Road',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '100001',
    country: 'Nigeria',
    rating: 4.5,
    totalReviews: 120,
    businessHours: {
      monday: { open: '09:00', close: '22:00' },
      tuesday: { open: '09:00', close: '22:00' },
      wednesday: { open: '09:00', close: '22:00' },
      thursday: { open: '09:00', close: '22:00' },
      friday: { open: '09:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '21:00' },
    },
  },
  {
    email: 'burgerkingdom@example.com',
    businessName: 'Burger Kingdom',
    businessDescription:
      'Premium burgers crafted with love. Juicy patties, fresh toppings, unforgettable taste.',
    businessPhone: '+1234567020',
    businessAddress: '25 Lekki Phase 1',
    city: 'Lagos',
    state: 'Lagos',
    postalCode: '100002',
    country: 'Nigeria',
    rating: 4.2,
    totalReviews: 85,
    businessHours: {
      monday: { open: '10:00', close: '22:00' },
      tuesday: { open: '10:00', close: '22:00' },
      wednesday: { open: '10:00', close: '22:00' },
      thursday: { open: '10:00', close: '22:00' },
      friday: { open: '10:00', close: '23:00' },
      saturday: { open: '11:00', close: '23:00' },
      sunday: { open: '11:00', close: '21:00' },
    },
  },
];

export async function seedVendorProfiles(
  dataSource: DataSource,
  users: User[],
): Promise<VendorProfile[]> {
  const vendorProfileRepo = dataSource.getRepository(VendorProfile);
  const userRepo = dataSource.getRepository(User);

  console.log('🏪 Seeding vendor profiles...');

  const adminUser = users.find((u) => u.email === 'admin@fooddelivery.com');
  const seededProfiles: VendorProfile[] = [];

  for (const vendorData of vendorsData) {
    const user = users.find((u) => u.email === vendorData.email);
    if (!user) {
      console.log(`  ⚠️  User not found for vendor: ${vendorData.email}`);
      continue;
    }

    let profile = await vendorProfileRepo.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      const { email, ...profileData } = vendorData;
      profile = vendorProfileRepo.create({
        ...profileData,
        userId: user.id,
        status: VendorStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminUser?.id,
      });
      profile = await vendorProfileRepo.save(profile);
      console.log(`  ✅ Created vendor profile: ${vendorData.businessName}`);
    } else {
      console.log(`  ⏭️  Vendor profile exists: ${vendorData.businessName}`);
    }

    seededProfiles.push(profile);
  }

  console.log(
    `🏪 Vendor profiles seeding complete (${seededProfiles.length} profiles)\n`,
  );
  return seededProfiles;
}
