"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('storage', () => ({
    provider: process.env.STORAGE_PROVIDER || 'local',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10),
    allowedMimeTypes: {
        images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        documents: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        all: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
    },
}));
//# sourceMappingURL=storage.config.js.map