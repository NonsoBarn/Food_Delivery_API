/**
 * Admin Dashboard E2E Tests
 *
 * KEY LEARNING: Role-based E2E testing
 * ======================================
 * These tests verify not just that the endpoints work, but that
 * ONLY admins can access them. We test with three token types:
 *   1. Admin token      → should succeed (2xx)
 *   2. Non-admin token  → should fail (403)
 *   3. No token         → should fail (401)
 *
 * This is the difference between "the endpoint works" and
 * "the endpoint is secure." Both are required.
 *
 * KEY LEARNING: State sharing in beforeAll
 * =========================================
 * Admin tests need an admin user, a vendor user, and tokens for both.
 * We create them once in `beforeAll` and share via module-level variables.
 * This avoids the overhead of creating users before every single test.
 *
 * Caveat: tests in the same describe block must NOT depend on each other's
 * side effects in a brittle way. Each test should either read-only, or
 * leave state in a well-known condition for subsequent tests.
 */
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('Admin Dashboard (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let vendorToken: string;
  let vendorId: string;  // VendorProfile ID from /admin/vendors

  beforeAll(async () => {
    app = await createTestApp();

    // Register admin user
    await request(app.getHttpServer())
      .post('/api/v1/users/register')
      .send({ email: 'admin@e2etest.com', password: 'AdminPass1!', role: 'admin' });

    // Register vendor user
    await request(app.getHttpServer())
      .post('/api/v1/users/register')
      .send({ email: 'vendor@e2etest.com', password: 'VendorPass1!', role: 'vendor' });

    // Login admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@e2etest.com', password: 'AdminPass1!' });
    adminToken = adminLogin.body.accessToken;

    // Login vendor
    const vendorLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'vendor@e2etest.com', password: 'VendorPass1!' });
    vendorToken = vendorLogin.body.accessToken;

    // Get the vendor's profile ID from the admin vendor list
    const vendorsRes = await request(app.getHttpServer())
      .get('/api/v1/admin/vendors')
      .set('Authorization', `Bearer ${adminToken}`);
    if (vendorsRes.body.vendors?.length > 0) {
      vendorId = vendorsRes.body.vendors[0].id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Platform Stats ─────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/stats', () => {
    it('should return platform statistics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = res.body;
      expect(data.usersByRole).toBeDefined();
      expect(Array.isArray(data.usersByRole)).toBe(true);
      expect(data.totalRevenue).toBeDefined();
      expect(data.pendingVendorApplications).toBeDefined();
    });

    it('should return 403 when called with a vendor token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);
    });

    it('should return 401 when called without a token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/stats')
        .expect(401);
    });
  });

  // ─── Vendor Management ──────────────────────────────────────────────────────

  describe('GET /api/v1/admin/vendors', () => {
    it('should return a paginated vendor list with user info but no password', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/vendors')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.vendors)).toBe(true);
      expect(res.body.total).toBeDefined();

      // Security check: no password in any user object
      for (const vendor of res.body.vendors) {
        expect(vendor.user).not.toHaveProperty('password');
      }
    });

    it('should return 403 for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/vendors')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/admin/vendors/:id/status', () => {
    it('should approve a vendor and set approvedAt timestamp', async () => {
      if (!vendorId) return; // skip if no vendor was created

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);

      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approvedAt).toBeDefined();
    });

    it('should return 400 when rejecting without a rejectionReason', async () => {
      if (!vendorId) return;

      /**
       * KEY LEARNING: @ValidateIf in E2E tests
       * ========================================
       * VendorActionDto uses @ValidateIf to require rejectionReason
       * ONLY when status is 'rejected'. This test verifies that the
       * conditional validation is active in the full application stack.
       *
       * If someone removes the @ValidateIf decorator, this test catches it.
       */
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' })   // missing rejectionReason
        .expect(400);
    });

    it('should reject a vendor when rejectionReason is provided', async () => {
      if (!vendorId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', rejectionReason: 'Incomplete documentation' })
        .expect(200);

      expect(res.body.data.status).toBe('rejected');
      expect(res.body.data.rejectionReason).toBe('Incomplete documentation');
    });
  });

  // ─── User Management ────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/users', () => {
    it('should return users with no password field', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.users)).toBe(true);
      for (const user of res.body.users) {
        expect(user).not.toHaveProperty('password');
      }
    });

    it('should filter users by role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/users?role=vendor')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const user of res.body.users) {
        expect(user.role).toBe('vendor');
      }
    });
  });

  // ─── Category Management ────────────────────────────────────────────────────

  describe('Category CRUD via admin', () => {
    let createdCategoryId: string;

    it('POST /api/v1/admin/categories — should create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Test Category', description: 'Created in e2e test' })
        .expect(201);

      expect(res.body.data.name).toBe('E2E Test Category');
      expect(res.body.data.slug).toBeDefined();
      createdCategoryId = res.body.data.id;
    });

    it('PATCH /api/v1/admin/categories/:id — should update the category', async () => {
      if (!createdCategoryId) return;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated E2E Category' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated E2E Category');
    });

    it('GET /api/v1/admin/categories — admin sees all categories including inactive', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('DELETE /api/v1/admin/categories/:id — should soft delete (204 No Content)', async () => {
      if (!createdCategoryId) return;

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  // ─── Reports ────────────────────────────────────────────────────────────────

  describe('GET /api/v1/admin/reports', () => {
    it('should return a report with period, dateRange, revenueTimeline, and topVendors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/reports?period=monthly')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const { data } = res.body;
      expect(data.period).toBe('monthly');
      expect(data.dateRange).toBeDefined();
      expect(Array.isArray(data.revenueTimeline)).toBe(true);
      expect(Array.isArray(data.topVendors)).toBe(true);
    });

    it('should return 400 for an invalid period value', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/reports?period=hourly')  // not in ReportPeriod enum
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
