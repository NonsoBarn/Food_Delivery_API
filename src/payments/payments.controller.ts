/**
 * Payments Controller
 *
 * Handles all HTTP requests for payment management.
 * Routes: /api/v1/payments
 *
 * Endpoint Summary:
 * ┌────────┬──────────────────────────────────────┬──────────┬──────────────────────────────────┐
 * │ Method │ Route                                │ Roles    │ Description                      │
 * ├────────┼──────────────────────────────────────┼──────────┼──────────────────────────────────┤
 * │ GET    │ /providers                           │ Any      │ Enabled providers (checkout UI)   │
 * │ POST   │ /initialize                          │ Customer │ Start a payment                  │
 * │ POST   │ /verify                              │ Customer │ Verify payment status             │
 * │ POST   │ /refund                              │ Admin    │ Refund a payment                 │
 * │ GET    │ /order-group/:orderGroupId           │ Customer │ Payments for an order group       │
 * │ GET    │ /:id                                 │ Any auth │ Payment details                  │
 * │ GET    │ /providers/config                    │ Admin    │ All provider configs              │
 * │ PATCH  │ /providers/:provider/config          │ Admin    │ Update provider config            │
 * └────────┴──────────────────────────────────────┴──────────┴──────────────────────────────────┘
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';
import { PaymentProvider } from './enums/payment-provider.enum';

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== CUSTOMER-FACING ====================

  /**
   * Get enabled payment providers
   *
   * GET /api/v1/payments/providers
   *
   * Returns providers the admin has enabled. The frontend uses this
   * to render payment options at checkout.
   */
  @Get('providers')
  async getEnabledProviders() {
    return this.paymentsService.getEnabledProviders();
  }

  /**
   * Initialize a payment
   *
   * POST /api/v1/payments/initialize
   *
   * After checkout creates orders, the customer calls this to start payment.
   * Returns either a checkoutUrl (Paystack/Flutterwave) or clientSecret (Stripe)
   * depending on the selected provider.
   */
  @Post('initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async initializePayment(
    @Body() dto: InitializePaymentDto,
    @CurrentUser() user: User,
  ) {
    if (!user.customerProfile?.id) {
      throw new BadRequestException(
        'Customer profile is required to make a payment',
      );
    }

    return this.paymentsService.initializePayment(
      dto.orderGroupId,
      user.customerProfile.id,
      user.email,
      dto.provider,
      dto.callbackUrl,
    );
  }

  /**
   * Verify a payment
   *
   * POST /api/v1/payments/verify
   *
   * Called after the customer returns from hosted checkout (Paystack/Flutterwave)
   * or after Stripe confirms on the client side. Checks with the provider
   * and updates order payment statuses.
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto.reference);
  }

  /**
   * Get payments for an order group
   *
   * GET /api/v1/payments/order-group/:orderGroupId
   */
  @Get('order-group/:orderGroupId')
  @UseGuards(JwtAuthGuard)
  async getPaymentsByOrderGroup(@Param('orderGroupId') orderGroupId: string) {
    return this.paymentsService.findByOrderGroup(orderGroupId);
  }

  /**
   * Get payment details
   *
   * GET /api/v1/payments/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  // ==================== ADMIN ====================

  /**
   * Refund a payment
   *
   * POST /api/v1/payments/refund
   *
   * Admin-only. Triggers a refund with the payment provider
   * and updates order payment statuses to REFUNDED.
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async refundPayment(@Body() dto: RefundPaymentDto) {
    return this.paymentsService.refundPayment(
      dto.paymentId,
      dto.amount,
      dto.reason,
    );
  }

  /**
   * Get all provider configs (admin dashboard)
   *
   * GET /api/v1/payments/providers/config
   */
  @Get('providers/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getProviderConfigs() {
    return this.paymentsService.getAllProviderConfigs();
  }

  /**
   * Update provider config
   *
   * PATCH /api/v1/payments/providers/:provider/config
   *
   * Admin enables/disables providers, sets display names, fees, currencies.
   */
  @Patch('providers/:provider/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateProviderConfig(
    @Param('provider') provider: PaymentProvider,
    @Body() dto: UpdateProviderConfigDto,
  ) {
    return this.paymentsService.updateProviderConfig(provider, dto);
  }
}
