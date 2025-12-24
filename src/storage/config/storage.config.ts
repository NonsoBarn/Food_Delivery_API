import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || 'local',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10),
  // 5MB
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
