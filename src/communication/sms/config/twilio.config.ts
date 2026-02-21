import { registerAs } from '@nestjs/config';

/**
 * Twilio Configuration
 *
 * The three values Twilio needs to send an SMS:
 * - accountSid: Your account identifier (starts with "AC...")
 * - authToken:  Secret key for signing API requests
 * - phoneNumber: The "from" number Twilio assigned to your account
 *
 * All three are already in .env.development.
 */
export const twilioConfig = registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
}));
