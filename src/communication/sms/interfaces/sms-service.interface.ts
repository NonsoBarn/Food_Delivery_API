/**
 * ISmsService — the contract every SMS provider must satisfy.
 *
 * KEY LEARNING: SMS vs Email interfaces are different
 * ====================================================
 * SMS is fundamentally different from email:
 * - Max 160 characters per segment (keep messages short)
 * - No HTML — plain text only
 * - Recipient is a phone number, not an email address
 * - Cost-per-message means we send fewer, higher-value SMS than emails
 *
 * That's why ISmsService is a separate interface from IEmailService,
 * with simpler, shorter method signatures.
 */

// ==================== DATA SHAPES ====================

export interface SmsOrderData {
  to: string; // Recipient phone number, e.g. "+2348012345678"
  orderNumber: string; // e.g. "ORD-20260221-A3F8K2"
  vendorName?: string;
}

export interface SmsDeliveryData {
  to: string;
  orderNumber: string;
  riderName?: string;
}

// ==================== SERVICE CONTRACT ====================

export interface ISmsService {
  /**
   * Notify customer that their order was placed successfully.
   */
  sendOrderConfirmation(data: SmsOrderData): Promise<void>;

  /**
   * Notify customer that their order was cancelled.
   */
  sendOrderCancelled(data: SmsOrderData): Promise<void>;

  /**
   * Notify customer that a rider has been assigned and is on the way.
   */
  sendDeliveryAssigned(data: SmsDeliveryData): Promise<void>;

  /**
   * Notify customer that their order has been delivered.
   */
  sendDeliveryCompletion(data: SmsDeliveryData): Promise<void>;

  /**
   * Return the provider name for logging.
   */
  getProviderName(): string;
}
