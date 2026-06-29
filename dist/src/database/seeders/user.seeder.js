"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUsers = seedUsers;
const user_entity_1 = require("../../users/entities/user.entity");
const user_role_enum_1 = require("../../common/enums/user-role.enum");
const bcrypt = __importStar(require("bcrypt"));
async function seedUsers(dataSource) {
    const userRepository = dataSource.getRepository(user_entity_1.User);
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
        console.log('Users already seeded, skipping...');
        return;
    }
    const users = [
        {
            email: 'admin@fooddelivery.com',
            password: await bcrypt.hash('Admin123!', 10),
            role: user_role_enum_1.UserRole.ADMIN,
        },
        {
            email: 'vendor@fooddelivery.com',
            password: await bcrypt.hash('Vendor123!', 10),
            role: user_role_enum_1.UserRole.VENDOR,
        },
        {
            email: 'customer@fooddelivery.com',
            password: await bcrypt.hash('Customer123!', 10),
            role: user_role_enum_1.UserRole.CUSTOMER,
        },
        {
            email: 'rider@fooddelivery.com',
            password: await bcrypt.hash('Rider123!', 10),
            role: user_role_enum_1.UserRole.RIDER,
        },
    ];
    await userRepository.save(users);
    console.log('✅ Users seeded successfully!');
}
//# sourceMappingURL=user.seeder.js.map