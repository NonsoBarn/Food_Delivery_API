"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUsers = seedUsers;
const user_entity_1 = require("../../users/entities/user.entity");
const customer_profile_entity_1 = require("../../users/entities/customer-profile.entity");
const rider_profile_entity_1 = require("../../users/entities/rider-profile.entity");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
const rider_profile_entity_2 = require("../../users/entities/rider-profile.entity");
const usersData = [
    {
        email: 'admin@fooddelivery.com',
        password: 'Admin123!',
        role: user_role_enum_1.UserRole.ADMIN,
    },
    {
        email: 'pizzapalace@example.com',
        password: 'Vendor123!',
        role: user_role_enum_1.UserRole.VENDOR,
    },
    {
        email: 'burgerkingdom@example.com',
        password: 'Vendor123!',
        role: user_role_enum_1.UserRole.VENDOR,
    },
    {
        email: 'customer1@example.com',
        password: 'Customer123!',
        role: user_role_enum_1.UserRole.CUSTOMER,
        profile: {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+1234567001',
            deliveryAddress: '123 Main Street',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
        },
    },
    {
        email: 'customer2@example.com',
        password: 'Customer123!',
        role: user_role_enum_1.UserRole.CUSTOMER,
        profile: {
            firstName: 'Jane',
            lastName: 'Smith',
            phoneNumber: '+1234567002',
            deliveryAddress: '456 Oak Avenue',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
        },
    },
    {
        email: 'rider@example.com',
        password: 'Rider123!',
        role: user_role_enum_1.UserRole.RIDER,
        profile: {
            firstName: 'Mike',
            lastName: 'Rider',
            phoneNumber: '+1234567003',
            vehicleType: rider_profile_entity_2.VehicleType.MOTORCYCLE,
            vehicleModel: 'Honda CB300R',
            vehiclePlateNumber: 'LAG-123-RD',
            vehicleColor: 'Black',
            status: rider_profile_entity_2.RiderStatus.APPROVED,
            approvedAt: new Date(),
        },
    },
];
async function seedUsers(dataSource) {
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const customerProfileRepo = dataSource.getRepository(customer_profile_entity_1.CustomerProfile);
    const riderProfileRepo = dataSource.getRepository(rider_profile_entity_1.RiderProfile);
    console.log('👤 Seeding users...');
    const seededUsers = [];
    for (const userData of usersData) {
        let user = await userRepo.findOne({ where: { email: userData.email } });
        if (!user) {
            user = userRepo.create({
                email: userData.email,
                password: userData.password,
                role: userData.role,
            });
            user = await userRepo.save(user);
            console.log(`  ✅ Created user: ${userData.email} (${userData.role})`);
        }
        else {
            console.log(`  ⏭️  User exists: ${userData.email}`);
        }
        if (userData.role === user_role_enum_1.UserRole.CUSTOMER && userData.profile) {
            const existingProfile = await customerProfileRepo.findOne({
                where: { userId: user.id },
            });
            if (!existingProfile) {
                const profile = customerProfileRepo.create({
                    ...userData.profile,
                    userId: user.id,
                });
                await customerProfileRepo.save(profile);
                console.log(`  📋 Created customer profile for ${userData.email}`);
            }
        }
        if (userData.role === user_role_enum_1.UserRole.RIDER && userData.profile) {
            const existingProfile = await riderProfileRepo.findOne({
                where: { userId: user.id },
            });
            if (!existingProfile) {
                const profile = riderProfileRepo.create({
                    ...userData.profile,
                    userId: user.id,
                });
                await riderProfileRepo.save(profile);
                console.log(`  🏍️  Created rider profile for ${userData.email}`);
            }
        }
        seededUsers.push(user);
    }
    console.log(`👤 Users seeding complete (${seededUsers.length} users)\n`);
    return seededUsers;
}
//# sourceMappingURL=users.seeder.js.map