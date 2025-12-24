import { registerAs } from '@nestjs/config';

export default registerAs('digitalocean', () => ({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION || 'nyc3',
  accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
  secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
  bucket: process.env.DO_SPACES_BUCKET,
  publicUrl: process.env.DO_SPACES_PUBLIC_URL,
}));
