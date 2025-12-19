import { registerAs } from '@nestjs/config';

interface JwtConfig {
  secret: string;
  accessTokenExpiration: string;
  refreshTokenSecret: string;
  refreshTokenExpiration: string;
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: process.env.JWT_SECRET || 'default-access-secret',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenSecret:
      process.env.JWT_REFRESH_TOKEN_SECRET || 'default-refresh-secret',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  }),
);
