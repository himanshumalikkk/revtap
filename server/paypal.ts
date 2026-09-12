import type { OrderRecord, PackageId } from '../src/types';
import { updateOrder, getOrderById } from './db';
import { syncOrderToGoogleSheet } from './googleSheets';
import { sendCustomerOrderConfirmation, sendAdminOrderNotification } from './email';

export function getPayPalPaymentLinkForPackage(packageId: PackageId, orderId: string): string {
  let baseLink = '';

  if (packageId === 'starter') {
    baseLink = process.env.PAYPAL_STARTER_PAYMENT_LINK?.trim() || '';
  } else if (packageId === 'business') {
    baseLink = process.env.PAYPAL_BUSINESS_PAYMENT_LINK?.trim() || '';
  } else if (packageId === 'growth') {
    baseLink = process.env.PAYPAL_GROWTH_PAYMENT_LINK?.trim() || '';
  }

  if (baseLink) {
    // Append tracking if supported by payment link (custom or invoice id)
    const separator = baseLink.includes('?') ? '&' : '?';
    return `${baseLink}${separator}custom=${encodeURIComponent(orderId)}`;
  }

  // Fallback to hosted checkout flow on our domain if links aren't set yet
  return `/checkout/paypal-gateway?order_id=${encodeURIComponent(orderId)}`;
}

/**
 * Handle successful payment event (from PayPal Webhook, Return, or Hosted capture)
 * Implements strict idempotency to prevent duplicate writes to Google Sheet and duplicate emails.
 */
export async function processPaidOrder(
  orderId: string,
  paypalTxnId?: string,
  paymentMethod: string = 'PayPal'
): Promise<{ success: boolean; order?: OrderRecord; message: string }> {
  const existing = getOrderById(orderId);
  if (!existing) {
    return { success: false, message: `Order ${orderId} not found` };
  }

  if (existing.status === 'paid') {
    console.log(`[PayPal] Order ${orderId} is already marked as PAID. Skipping duplicate processing.`);
    return { success: true, order: existing, message: 'Order was already processed' };
  }

  // Update order to paid
  const now = new Date().toISOString();
  const updated = updateOrder(orderId, {
    status: 'paid',
    paypalTxnId: paypalTxnId || `PAYPAL-${Date.now().toString(36).toUpperCase()}`,
    paymentMethod,
    paidAt: now,
  });

  if (!updated) {
    return { success: false, message: 'Failed to update order status' };
  }

  console.log(`[PayPal] Order ${orderId} marked as PAID. Triggering Google Sheets sync and notification emails.`);

  // 1. Sync to Google Sheets
  try {
    await syncOrderToGoogleSheet(updated);
  } catch (err: any) {
    console.error(`[PayPal -> GoogleSheets Error]:`, err.message);
  }

  // 2. Dispatch Customer Thank-You Email
  try {
    await sendCustomerOrderConfirmation(updated);
  } catch (err: any) {
    console.error(`[PayPal -> Customer Email Error]:`, err.message);
  }

  // 3. Dispatch Admin Order Notification
  try {
    await sendAdminOrderNotification(updated);
  } catch (err: any) {
    console.error(`[PayPal -> Admin Email Error]:`, err.message);
  }

  const finalOrder = getOrderById(orderId) || updated;
  return { success: true, order: finalOrder, message: 'Order successfully marked as paid' };
}
