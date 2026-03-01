/**
 * GetNotificationsDto
 *
 * Query parameters for GET /api/v1/notifications
 *
 * KEY LEARNING: Query Parameters vs Request Body
 * ================================================
 * @Body() is for POST/PATCH — sending data to CREATE or MODIFY a resource.
 * @Query() is for GET — filtering/sorting/paginating READ operations.
 *
 * URL example:
 *   GET /api/v1/notifications?limit=10&offset=0&unreadOnly=true
 *   ↑ limit, offset, unreadOnly are query parameters
 *
 * KEY LEARNING: Pagination with limit/offset
 * ============================================
 * `limit` = how many items per page (page size)
 * `offset` = how many items to skip (starting position)
 *
 * Page 1: limit=20&offset=0  → items 1–20
 * Page 2: limit=20&offset=20 → items 21–40
 * Page 3: limit=20&offset=40 → items 41–60
 *
 * Alternative: cursor-based pagination (uses `createdAt < :cursor` instead
 * of OFFSET). Cursor-based is better at scale because OFFSET has to
 * scan and discard rows, but limit/offset is simpler to understand.
 *
 * KEY LEARNING: @Type(() => Number) + @IsInt()
 * =============================================
 * Query parameters arrive as strings from the URL.
 * ?limit=20 → limit is the STRING "20", not the NUMBER 20.
 *
 * Without transformation:
 *   @IsInt() would fail because "20" !== 20
 *   Math operations like take: query.limit would do string arithmetic
 *
 * With @Type(() => Number) (from class-transformer):
 *   NestJS transforms "20" → 20 before validation runs.
 *   @IsInt() then passes correctly.
 *
 * This works because ValidationPipe is configured with
 * `transform: true` in main.ts.
 */

import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetNotificationsDto {
  /**
   * Maximum number of notifications to return.
   *
   * Default: 20 (a reasonable "page" size for an inbox).
   * Max: 100 (prevents huge queries that could slow down the DB).
   *
   * @Min(1) — asking for 0 notifications makes no sense.
   * @Max(100) — prevents the client from requesting unlimited rows.
   */
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * Number of notifications to skip (for pagination).
   *
   * Default: 0 (start from the beginning — most recent notification).
   * @Min(0) — negative offset doesn't make sense.
   */
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  /**
   * When true, only return unread notifications.
   *
   * KEY LEARNING: Boolean query params need special handling
   * =========================================================
   * URL query parameters are always strings.
   * ?unreadOnly=true sends the STRING "true", not the boolean true.
   *
   * @Transform converts:
   *   "true"  → true
   *   "false" → false
   *   "1"     → true
   *   "0"     → false
   *
   * Without this transform, @IsBoolean() would reject the string "true".
   */
  @IsOptional()
  @Transform(({ value }: { value: string }) => {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  unreadOnly?: boolean = false;
}
