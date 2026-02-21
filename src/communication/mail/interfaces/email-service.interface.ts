/**
 * IEmailService — the contract every email provider must satisfy.
 *
 * KEY LEARNING: Interface as a contract (Dependency Inversion Principle)
 * =======================================================================
 * The rest of the app (processor, factory, listener) NEVER imports
 * SendGridEmailService or NodemailerEmailService directly.
 * They only depend on this interface.
 *
 * This means:
 * - You can swap SendGrid for Mailgun by writing one new class + one config change.
 * - The processor, factory, and listener stay UNTOUCHED.
 * - Tests can inject a mock that implements IEmailService — no real emails sent.
 *
 * The interface defines WHAT the service does, not HOW.
 * Each provider class defines the HOW.
 */

// ==================== DATA SHAPES ====================

/**
 * Data needed to render an order confirmation email.
 * These fields come from the OrderCreatedEvent + a DB lookup for the user's email.
 */
export interface OrderEmailData {
  to: string; // Customer email address
  orderNumber: string; // e.g. "ORD-20260221-A3F8K2"
  total: number; // Order total in the app's currency
  itemCount: number; // Number of items ordered
  vendorName: string; // Which restaurant/vendor
  deliveryAddress: string; // Where the order is going
}

/**
 * Data for order status update emails (confirmed, cancelled, etc.)
 */
export interface StatusEmailData {
  to: string;
  orderNumber: string;
  newStatus: string; // e.g. "CONFIRMED", "CANCELLED"
  reason?: string; // Populated for cancellations
  estimatedPrepTimeMinutes?: number; // Populated when vendor confirms
}

/**
 * Data for the delivery completion email (receipt).
 */
export interface DeliveryEmailData {
  to: string;
  orderNumber: string;
  deliveredAt: Date;
}

// ==================== SERVICE CONTRACT ====================

export interface IEmailService {
  /**
   * Send a welcome email after a new user registers.
   * @param to   - Recipient email address
   * @param role - User role (CUSTOMER, VENDOR, RIDER) — changes email copy
   */
  sendWelcome(to: string, role: string): Promise<void>;

  /**
   * Send order confirmation to the customer right after order is placed.
   */
  sendOrderConfirmation(data: OrderEmailData): Promise<void>;

  /**
   * Notify the customer when the order status changes.
   * Used for CONFIRMED and CANCELLED transitions.
   */
  sendOrderStatusUpdate(data: StatusEmailData): Promise<void>;

  /**
   * Send a delivery receipt when the order is delivered.
   */
  sendDeliveryCompletion(data: DeliveryEmailData): Promise<void>;

  /**
   * Return the provider name for logging.
   * e.g. 'sendgrid', 'nodemailer'
   */
  getProviderName(): string;
}
