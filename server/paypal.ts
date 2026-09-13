import type { OrderRecord, PackageId } from '../src/types';
import { updateOrder, getOrderById, getOrderByPayPalOrderId } from './db.js';
import { syncOrderToGoogleSheet } from './googleSheets.js';
import { sendCustomerOrderConfirmation, sendAdminOrderNotification } from './email.js';

/**
 * Determines the PayPal base REST API URL (Live vs Sandbox)
 * Live: https://api-m.paypal.com
 * Sandbox: https://api-m.sandbox.paypal.com
 */
export function getPayPalBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE || process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase().trim();
  if (mode === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com';
  }
  return 'https://api-m.paypal.com';
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Fetch or reuse an active OAuth2 client credentials access token from PayPal.
 * Never exposes PAYPAL_CLIENT_SECRET to the client.
 */
export async function getPayPalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required on the server to interact with the PayPal REST API.');
  }

  const baseUrl = getPayPalBaseUrl();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`PayPal OAuth token failed (HTTP ${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('PayPal did not return an access_token');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

export interface CreatePayPalOrderParams {
  order: OrderRecord;
  returnUrl: string;
  cancelUrl: string;
}

/**
 * Creates a PayPal REST API Order using POST /v2/checkout/orders
 * Requirements:
 * - intent: CAPTURE
 * - purchase_unit:
 *     reference_id = package ID (e.g. starter, business, growth)
 *     custom_id = internal RevTap order ID (e.g. RVT-20260913-0001)
 *     amount = strictly server-side package configuration (USD)
 * - Returns PayPal approval URL
 */
export async function createPayPalOrder(params: CreatePayPalOrderParams): Promise<{
  paypalOrderId: string;
  approvalUrl: string;
}> {
  const { order, returnUrl, cancelUrl } = params;

  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  // Strict server-side amount enforcement in USD (never trusted from frontend)
  const amountValue = Number(order.total).toFixed(2);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.packageId,
        custom_id: order.id,
        description: `${order.packageName} (${order.quantity} Signs) - RevTap Order ${order.id}`,
        amount: {
          currency_code: 'USD',
          value: amountValue,
        },
      },
    ],
    application_context: {
      brand_name: 'RevTap',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `revtap-${order.id}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[PayPal Orders API Error] HTTP ${res.status}:`, errText);
    throw new Error(`PayPal Order Creation failed (HTTP ${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    links?: Array<{ href: string; rel: string; method: string }>;
  };

  const approvalUrl = data.links?.find((l) => l.rel === 'approve')?.href;
  if (!approvalUrl) {
    throw new Error('PayPal did not return an approval URL in the order response.');
  }

  // Persist PayPal Order ID onto the RevTap order record
  updateOrder(order.id, {
    paypalOrderId: data.id,
  });

  console.log(`[PayPal Order Created] RevTap Order: ${order.id} -> PayPal Order: ${data.id}, Status: ${data.status}`);

  return {
    paypalOrderId: data.id,
    approvalUrl,
  };
}

/**
 * Captures a PayPal order using POST /v2/checkout/orders/{id}/capture
 * Verifies capture status and marks order as paid with idempotency.
 */
export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  success: boolean;
  captureId?: string;
  order?: OrderRecord;
  error?: string;
}> {
  if (!paypalOrderId) {
    return { success: false, error: 'Missing paypalOrderId parameter' };
  }

  const token = await getPayPalAccessToken();
  const baseUrl = getPayPalBaseUrl();

  console.log(`[PayPal Capture] Initiating capture for PayPal Order: ${paypalOrderId}`);

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  let resData: any = null;
  try {
    resData = await res.json();
  } catch {
    const text = await res.text().catch(() => '');
    resData = { message: text };
  }

  // Handle case where order is already captured
  if (!res.ok) {
    if (resData?.name === 'ORDER_ALREADY_CAPTURED' || resData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
      console.log(`[PayPal Capture] Order ${paypalOrderId} was already captured. Re-verifying details...`);
      return await handleAlreadyCapturedOrder(paypalOrderId, token, baseUrl);
    }

    console.error(`[PayPal Capture Error] HTTP ${res.status}:`, JSON.stringify(resData));
    return {
      success: false,
      error: resData?.message || resData?.details?.[0]?.description || `PayPal capture failed with HTTP ${res.status}`,
    };
  }

  if (resData.status !== 'COMPLETED') {
    console.warn(`[PayPal Capture Warning] PayPal status is "${resData.status}", not COMPLETED`);
    return {
      success: false,
      error: `Payment status is ${resData.status}. Capture not yet completed.`,
    };
  }

  // Extract capture transaction ID and RevTap order ID
  const purchaseUnit = resData.purchase_units?.[0];
  const capture = purchaseUnit?.payments?.captures?.[0];
  const captureId = capture?.id || `CAP-${Date.now()}`;
  const customId = capture?.custom_id || purchaseUnit?.custom_id;

  let order: OrderRecord | undefined;
  if (customId) {
    order = getOrderById(customId);
  }
  if (!order) {
    order = getOrderByPayPalOrderId(paypalOrderId);
  }

  if (!order) {
    console.error(`[PayPal Capture Error] Could not find internal RevTap order for PayPal order ${paypalOrderId} (custom_id: ${customId})`);
    return {
      success: false,
      error: `Internal order not found for PayPal Order ${paypalOrderId}`,
    };
  }

  if (!order.paypalOrderId) {
    updateOrder(order.id, { paypalOrderId });
  }

  // Strictly idempotent: only triggers sync and emails on first transition to paid
  const result = await processPaidOrder(order.id, captureId, 'PayPal REST Orders API');

  return {
    success: result.success,
    captureId,
    order: result.order || order,
    error: result.success ? undefined : result.message,
  };
}

/**
 * Fallback resolver if PayPal indicates order was already captured
 */
async function handleAlreadyCapturedOrder(
  paypalOrderId: string,
  token: string,
  baseUrl: string
): Promise<{ success: boolean; captureId?: string; order?: OrderRecord; error?: string }> {
  try {
    const getRes = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!getRes.ok) {
      return { success: false, error: 'Order was already captured but failed to fetch order details.' };
    }

    const orderData = await getRes.json();
    const purchaseUnit = orderData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const captureId = capture?.id;
    const customId = capture?.custom_id || purchaseUnit?.custom_id;

    let order: OrderRecord | undefined;
    if (customId) order = getOrderById(customId);
    if (!order) order = getOrderByPayPalOrderId(paypalOrderId);

    if (order) {
      if (order.status === 'paid') {
        return { success: true, captureId, order };
      }
      const result = await processPaidOrder(order.id, captureId || paypalOrderId, 'PayPal REST Orders API');
      return { success: result.success, captureId, order: result.order };
    }

    return { success: true, captureId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

  // Idempotency: If already paid, DO NOT duplicate sync to Google Sheet or dispatch emails
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
