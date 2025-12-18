/**
 * API Version Constants
 *
 * Centralized version definitions for the API.
 * Add new versions here as they are introduced.
 */

export const API_VERSIONS = {
  V1: '1',
  V2: '2',
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

/**
 * Version Changelog
 *
 * V1 (Current):
 * - Initial release
 * - User registration with email + password
 * - Basic CRUD operations
 * - JWT authentication
 *
 * V2 (Future):
 * - Phone number authentication
 * - OAuth integration
 * - Enhanced user profiles
 */
