/**
 * Email Provider Enum
 *
 * Lists all supported email providers.
 *
 * KEY LEARNING: Why an enum instead of plain strings?
 * ====================================================
 * - Strings like 'sendgrid' can be mistyped anywhere: 'sengrid', 'SendGrid'.
 *   TypeScript won't catch that at compile time.
 * - Enum values are checked at compile time. EmailProvider.SENDGRID is always
 *   correct; you can't accidentally write EmailProvider.SENGRID.
 * - The enum value (the string 'sendgrid') is what gets stored in the database.
 *   This way the DB column and the code both use the exact same string.
 */
export enum EmailProvider {
  SENDGRID = 'sendgrid',
  NODEMAILER = 'nodemailer',
}
