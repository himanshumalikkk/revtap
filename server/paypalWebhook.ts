import type { IncomingHttpHeaders } from 'http';
import type { OrderRecord, PackageId } from '../src/types';
import { getOrderById, getOrderByPayPalOrderId, updateOrder, createOrder } from './db.js';
import { processPaidOrder, capturePayPalOrder } from './paypal.js';

interface WebhookVerificationResult {
  isValid: boolean;
  status: string;
  error?: string;
}

/**
 * Case-insensitive header reader
 */
export function getHeader(
  headers: Record<string, string | string[] | undefined> | IncomingHttpHeaders,
  name: string
): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return Array.isArray(val) ? val[0] : val;
    }
  }
  return undefined;
}

/**
 * Determines the PayPal base REST API URL (Live vs Sandbox)
 */
export function getPayPalBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE || process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase().trim();
  if (mode === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com';
  }
  return 'https://api-m.paypal.com';
}

/**
 * Fetch OAuth2 access token from PayPal using Client ID and Secret
 */
async function fetchPayPalAccessToken(
  clientId: string,
  clientSecret: string,
  baseUrl: string
): Promise<{ token?: string; error?: string }> {
  try {
    const authHeader = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        error: `PayPal Token HTTP ${response.status}: ${errText.slice(0, 300)}`,
      };
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      return { error: 'PayPal did not return an access_token' };
    }

    return { token: data.access_token };
  } catch (err: any) {
    return { error: err.message || 'Network error connecting to PayPal token endpoint' };
  }
}

/**
 * Verifies PayPal webhook signature via PayPal's official REST verification API
 */
export async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined> | IncomingHttpHeaders,
  eventBody: any
): Promise<WebhookVerificationResult> {
  const authAlgo = getHeader(headers, 'paypal-auth-algo');
  const certUrl = getHeader(headers, 'paypal-cert-url');
  const transmissionId = getHeader(headers, 'paypal-transmission-id');
  const transmissionSig = getHeader(headers, 'paypal-transmission-sig');
  const transmissionTime = getHeader(headers, 'paypal-transmission-time');

  // 1. Check for required headers
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    const missing: string[] = [];
    if (!authAlgo) missing.push('paypal-auth-algo');
    if (!certUrl) missing.push('paypal-cert-url');
    if (!transmissionId) missing.push('paypal-transmission-id');
    if (!transmissionSig) missing.push('paypal-transmission-sig');
    if (!transmissionTime) missing.push('paypal-transmission-time');

    console.warn(`[PayPal Webhook Rejected]: Missing required signature headers: ${missing.join(', ')}`);
    return {
      isValid: false,
      status: 'MISSING_HEADERS',
      error: `Missing required PayPal signature headers: ${missing.join(', ')}`,
    };
  }

  // 2. Check for configured credentials
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!clientId || !clientSecret || !webhookId) {
    console.error('[PayPal Webhook Config Error]: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, or PAYPAL_WEBHOOK_ID is not configured in environment.');
    return {
      isValid: false,
      status: 'UNCONFIGURED',
      error: 'PayPal webhook verification credentials are not configured on this server.',
    };
  }

  // 3. Attempt verification against primary PayPal base URL (Live by default, or Sandbox if configured)
  let primaryBaseUrl = getPayPalBaseUrl();
  let tokenResult = await fetchPayPalAccessToken(clientId, clientSecret, primaryBaseUrl);

  // If live returned authentication error and mode wasn't explicitly live, check if sandbox credentials were used
  if (tokenResult.error && primaryBaseUrl === 'https://api-m.paypal.com' && !process.env.PAYPAL_MODE) {
    const sandboxTokenResult = await fetchPayPalAccessToken(clientId, clientSecret, 'https://api-m.sandbox.paypal.com');
    if (sandboxTokenResult.token) {
      console.log('[PayPal Webhook Notice]: Authenticated using PayPal Sandbox endpoint.');
      primaryBaseUrl = 'https://api-m.sandbox.paypal.com';
      tokenResult = sandboxTokenResult;
    }
  }

  if (!tokenResult.token) {
    console.error('[PayPal Webhook Error]: Failed to authenticate with PayPal API:', tokenResult.error);
    return {
      isValid: false,
      status: 'AUTH_FAILED',
      error: `Failed to authenticate with PayPal API: ${tokenResult.error}`,
    };
  }

  // 4. Call PayPal verify-webhook-signature API
  try {
    const verificationPayload = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: eventBody,
    };

    const verifyResponse = await fetch(`${primaryBaseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenResult.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationPayload),
    });

    if (!verifyResponse.ok) {
      const errBody = await verifyResponse.text().catch(() => '');
      console.error(`[PayPal Webhook Error]: Verification API returned HTTP ${verifyResponse.status}: ${errBody}`);
      return {
        isValid: false,
        status: `HTTP_${verifyResponse.status}`,
        error: `PayPal verification service rejected verification request (HTTP ${verifyResponse.status}).`,
      };
    }

    const result = (await verifyResponse.json()) as { verification_status?: string };
    const status = result.verification_status || 'UNKNOWN';

    if (status === 'SUCCESS') {
      return { isValid: true, status: 'SUCCESS' };
    }

    console.warn(`[PayPal Webhook Rejected]: Signature verification returned status "${status}"`);
    return {
      isValid: false,
      status,
      error: `PayPal verification status: ${status}`,
    };
  } catch (err: any) {
    console.error('[PayPal Webhook Exception during signature verification]:', err.message);
    return {
      isValid: false,
      status: 'VERIFICATION_EXCEPTION',
      error: err.message || 'Exception communicating with PayPal verification service.',
    };
  }
}

/**
 * Extracts RevTap Order ID and PayPal Transaction ID from PayPal webhook resource
 */
export function extractOrderAndTxnId(event: any): {
  orderId?: string;
  paypalOrderId?: string;
  txnId?: string;
  amount?: string;
  currency?: string;
} {
  const resource = event?.resource || {};
  let orderId: string | undefined = undefined;

  // 1. Direct custom_id or invoice_id
  if (typeof resource.custom_id === 'string' && resource.custom_id.trim()) {
    orderId = resource.custom_id.trim();
  } else if (typeof resource.custom === 'string' && resource.custom.trim()) {
    orderId = resource.custom.trim();
  } else if (typeof resource.invoice_id === 'string' && resource.invoice_id.trim()) {
    orderId = resource.invoice_id.trim();
  } else if (resource.purchase_units?.[0]?.custom_id) {
    orderId = String(resource.purchase_units[0].custom_id).trim();
  } else if (resource.purchase_units?.[0]?.invoice_id) {
    orderId = String(resource.purchase_units[0].invoice_id).trim();
  } else if (typeof resource.purchase_units?.[0]?.reference_id === 'string' && resource.purchase_units[0].reference_id.startsWith('RVT-')) {
    orderId = resource.purchase_units[0].reference_id.trim();
  }

  // 2. Search regex pattern `RVT-YYYYMMDD-XXXX` in stringified resource if not in standard fields
  if (!orderId) {
    try {
      const serialized = JSON.stringify(resource);
      const match = serialized.match(/RVT-\d{8}-[A-Za-z0-9]+/i);
      if (match) {
        orderId = match[0].toUpperCase();
      }
    } catch {}
  }

  const paypalOrderId =
    resource.supplementary_data?.related_ids?.order_id ||
    (typeof event?.event_type === 'string' && event.event_type.startsWith('CHECKOUT.ORDER') ? resource.id : undefined);

  const txnId = resource.id || resource.parent_payment || event?.id || `PP-${Date.now()}`;
  const amount = resource.amount?.value || resource.total?.value || resource.amount;
  const currency = resource.amount?.currency_code || resource.total?.currency_code || 'USD';

  return { orderId, paypalOrderId, txnId, amount, currency };
}

/**
 * Recovers or reconstructs an order in serverless storage if created on another container
 */
function recoverOrderFromPayPalPayload(orderId: string, event: any): OrderRecord {
  const resource = event.resource || {};
  const payer = resource.payer || {};
  const shipping = resource.purchase_units?.[0]?.shipping || resource.shipping || {};
  const amountVal = parseFloat(resource.amount?.value || '99.99') || 99.99;

  let pkgId: PackageId = 'business';
  let pkgName = 'Business Pack (2 Signs)';
  let quantity = 2;

  if (amountVal < 70) {
    pkgId = 'starter';
    pkgName = 'Starter Pack (1 Sign)';
    quantity = 1;
  } else if (amountVal > 140) {
    pkgId = 'growth';
    pkgName = 'Growth Pack (4 Signs)';
    quantity = 4;
  }

  const fullName = shipping.name?.full_name || `${payer.name?.given_name || ''} ${payer.name?.surname || ''}`.trim() || 'Valued Customer';
  const email = payer.email_address || 'customer@example.com';
  const shippingAddress = shipping.address || {};

  return createOrder({
    packageId: pkgId,
    packageName: pkgName,
    quantity,
    price: amountVal,
    total: amountVal,
    currency: resource.amount?.currency_code || 'USD',
    isTestOrder: false,
    status: 'payment_pending',
    business: {
      businessName: fullName + ' Business',
      businessWebsite: '',
      businessEmail: email,
      businessPhone: payer.phone?.phone_number?.national_number || '',
      googleReviewUrl: 'Pending Customer Submission',
      brandingNotes: `PayPal Webhook Auto-Captured (${event.event_type})`,
    },
    shipping: {
      fullName,
      shippingBusinessName: fullName,
      addressLine1: shippingAddress.address_line_1 || shippingAddress.street_number || 'Standard Shipping Address',
      addressLine2: shippingAddress.address_line_2 || '',
      city: shippingAddress.admin_area_2 || 'N/A',
      state: shippingAddress.admin_area_1 || 'N/A',
      zipCode: shippingAddress.postal_code || 'N/A',
      country: shippingAddress.country_code || 'US',
    },
  });
}

/**
 * Universal PayPal Webhook Request Handler
 * Can be called from Express route or Vercel Serverless Function
 */
export async function handlePayPalWebhookRequest(req: any, res: any): Promise<void> {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Method Not Allowed. PayPal webhooks require HTTP POST.',
    });
  }

  // 2. Parse payload safely
  let eventBody = req.body;
  if (typeof eventBody === 'string') {
    try {
      eventBody = JSON.parse(eventBody);
    } catch {
      console.warn('[PayPal Webhook]: Received malformed string body that could not be parsed as JSON.');
      return res.status(400).json({ error: 'Malformed JSON payload.' });
    }
  } else if (Buffer.isBuffer(eventBody)) {
    try {
      eventBody = JSON.parse(eventBody.toString('utf-8'));
    } catch {
      console.warn('[PayPal Webhook]: Received unparseable Buffer payload.');
      return res.status(400).json({ error: 'Malformed Buffer JSON payload.' });
    }
  }

  if (!eventBody || typeof eventBody !== 'object') {
    return res.status(400).json({ error: 'Missing or empty webhook payload body.' });
  }

  const eventType = eventBody.event_type || 'UNKNOWN';
  const eventId = eventBody.id || 'NO_EVENT_ID';
  console.log(`[PayPal Webhook Inbound] Event ID: ${eventId}, Type: ${eventType}`);

  // 3. Cryptographic Signature Verification using PayPal REST API
  const verification = await verifyPayPalWebhookSignature(req.headers, eventBody);

  if (!verification.isValid) {
    if (verification.status === 'UNCONFIGURED') {
      // Configuration error on server (PAYPAL_CLIENT_ID / SECRET / WEBHOOK_ID missing)
      return res.status(500).json({
        error: 'PayPal webhook verification credentials are not configured on server.',
        status: verification.status,
      });
    }

    // Invalid signature / missing headers
    console.warn(`[PayPal Webhook Signature Verification Failed]: ${verification.error}`);
    return res.status(400).json({
      error: 'Invalid PayPal webhook signature.',
      status: verification.status,
      message: verification.error,
    });
  }

  console.log(`[PayPal Webhook Verified] Event ${eventId} (${eventType}) passed signature validation.`);

  // 4. Handle CHECKOUT.ORDER.APPROVED: trigger backend capture if not captured yet
  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    const paypalOrderId = eventBody.resource?.id;
    if (paypalOrderId) {
      console.log(`[PayPal Webhook] Received CHECKOUT.ORDER.APPROVED for ${paypalOrderId}. Triggering backend capture...`);
      const captureResult = await capturePayPalOrder(paypalOrderId);
      return res.status(200).json({
        received: true,
        captured: captureResult.success,
        orderId: captureResult.order?.id,
        message: captureResult.success ? 'Order captured successfully via webhook' : captureResult.error,
        eventId,
      });
    }
  }

  // 5. Process Payment Success Events (PAYMENT.CAPTURE.COMPLETED is the primary fulfillment event)
  const paymentSuccessEvents = [
    'PAYMENT.CAPTURE.COMPLETED',
    'CHECKOUT.ORDER.COMPLETED',
    'PAYMENT.SALE.COMPLETED',
  ];

  if (paymentSuccessEvents.includes(eventType)) {
    const { orderId: rawOrderId, paypalOrderId, txnId, amount, currency } = extractOrderAndTxnId(eventBody);
    let orderId = rawOrderId;

    let order: OrderRecord | undefined = undefined;
    if (orderId) {
      order = getOrderById(orderId);
    }
    if (!order && paypalOrderId) {
      order = getOrderByPayPalOrderId(paypalOrderId);
      if (order) orderId = order.id;
    }

    if (!orderId && !order) {
      console.warn(`[PayPal Webhook Note]: Webhook ${eventId} verified, but no RevTap order ID found in payload (Resource ID: ${eventBody.resource?.id || 'N/A'}). Acknowledging receipt.`);
      return res.status(200).json({
        received: true,
        message: 'Webhook verified, but no RevTap order ID detected in resource payload.',
        eventId,
      });
    }

    console.log(`[PayPal Webhook Order Matched]: Order ID ${orderId}, Txn ID: ${txnId}, Amount: ${amount || 'N/A'} ${currency || 'USD'}`);

    if (!order && orderId) {
      console.log(`[PayPal Webhook]: Order ${orderId} not found in local memory cache. Reconstructing from verified PayPal payload...`);
      order = recoverOrderFromPayPalPayload(orderId, eventBody);
    }

    if (!order) {
      return res.status(200).json({
        received: true,
        message: `Order could not be resolved for orderId: ${orderId}`,
        eventId,
      });
    }

    // Prevent duplicate processing if already marked as paid (Strict Idempotency)
    if (order.status === 'paid') {
      console.log(`[PayPal Webhook]: Order ${order.id} is already marked as PAID. Skipping duplicate processing.`);
      return res.status(200).json({
        success: true,
        orderId: order.id,
        message: 'Order was already processed and marked as paid.',
        alreadyPaid: true,
      });
    }

    // Process order: updates status to paid, prevents duplicates, syncs to Google Sheets, sends customer and admin emails
    const result = await processPaidOrder(order.id, txnId, 'PayPal Webhook');

    return res.status(200).json({
      success: result.success,
      orderId: order.id,
      txnId,
      message: result.message,
      event: eventType,
    });
  }

  // Handle Refund / Dispute / Cancellation events
  if (['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(eventType)) {
    const { orderId, paypalOrderId } = extractOrderAndTxnId(eventBody);
    const targetOrder = (orderId && getOrderById(orderId)) || (paypalOrderId && getOrderByPayPalOrderId(paypalOrderId));
    if (targetOrder) {
      console.log(`[PayPal Webhook Refund/Reversal]: Updating order ${targetOrder.id} status to refunded.`);
      updateOrder(targetOrder.id, {
        status: 'refunded',
        updatedAt: new Date().toISOString(),
      });
    }
    return res.status(200).json({
      received: true,
      message: `Order reversal acknowledged for ${targetOrder?.id || orderId || 'unknown order'}`,
      eventId,
    });
  }

  if (['PAYMENT.CAPTURE.DENIED', 'CHECKOUT.ORDER.CANCELLED'].includes(eventType)) {
    const { orderId, paypalOrderId } = extractOrderAndTxnId(eventBody);
    const targetOrder = (orderId && getOrderById(orderId)) || (paypalOrderId && getOrderByPayPalOrderId(paypalOrderId));
    if (targetOrder && targetOrder.status === 'payment_pending') {
      console.log(`[PayPal Webhook Denied/Cancelled]: Updating order ${targetOrder.id} status to cancelled.`);
      updateOrder(targetOrder.id, {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
    }
    return res.status(200).json({
      received: true,
      message: `Order cancellation/denial acknowledged for ${targetOrder?.id || orderId || 'unknown order'}`,
      eventId,
    });
  }

  if (eventType === 'PAYMENT.CAPTURE.PENDING') {
    const { orderId, paypalOrderId } = extractOrderAndTxnId(eventBody);
    console.log(`[PayPal Webhook Pending]: Payment capture pending for ${orderId || paypalOrderId || 'order'}.`);
    return res.status(200).json({
      received: true,
      message: 'Payment capture pending acknowledgement.',
      eventId,
    });
  }

  // Acknowledge all other verified events with HTTP 200
  console.log(`[PayPal Webhook Acknowledged]: Event type ${eventType} handled with 200 OK.`);
  return res.status(200).json({
    received: true,
    eventType,
    eventId,
  });
}
