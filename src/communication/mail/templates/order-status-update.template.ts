import type { StatusEmailData } from '../interfaces/email-service.interface';

/**
 * Order Status Update Email Template
 *
 * Sent when the order transitions to CONFIRMED or CANCELLED.
 * A single template handles both — the content changes based on newStatus.
 */

const statusMessages: Record<string, { headline: string; body: string }> = {
  CONFIRMED: {
    headline: 'Your order has been confirmed!',
    body: 'The restaurant has accepted your order and is getting it ready.',
  },
  CANCELLED: {
    headline: 'Your order has been cancelled.',
    body: 'Unfortunately your order was cancelled.',
  },
};

export function orderStatusUpdateHtml(data: StatusEmailData): string {
  const content = statusMessages[data.newStatus] ?? {
    headline: `Order status: ${data.newStatus}`,
    body: 'Your order status has been updated.',
  };

  const extraInfo = [
    data.estimatedPrepTimeMinutes
      ? `<p><strong>Estimated preparation time:</strong> ${data.estimatedPrepTimeMinutes} minutes</p>`
      : '',
    data.reason
      ? `<p><strong>Reason:</strong> ${data.reason}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
        .header { background: ${data.newStatus === 'CANCELLED' ? '#e74c3c' : '#27ae60'}; padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .body { padding: 32px; }
        .body p { color: #555; line-height: 1.6; }
        .order-ref { font-size: 13px; color: #aaa; margin-bottom: 16px; }
        .footer { padding: 16px 32px; background: #f4f4f4; text-align: center; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${content.headline}</h1>
        </div>
        <div class="body">
          <p class="order-ref">Order: <strong>${data.orderNumber}</strong></p>
          <p>${content.body}</p>
          ${extraInfo}
        </div>
        <div class="footer">
          <p>Food Delivery App</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function orderStatusUpdateSubject(
  orderNumber: string,
  status: string,
): string {
  const subjects: Record<string, string> = {
    CONFIRMED: `Order ${orderNumber} confirmed — kitchen is on it!`,
    CANCELLED: `Order ${orderNumber} has been cancelled`,
  };
  return subjects[status] ?? `Order ${orderNumber} status update: ${status}`;
}
