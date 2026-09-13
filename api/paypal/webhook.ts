import type { IncomingHttpHeaders } from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PackageId = 'starter' | 'business' | 'growth';
export type OrderStatus = 'payment_pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type SheetSyncStatus = 'pending' | 'synced' | 'failed';

export interface BusinessInfo {
  businessName: string;
  businessWebsite: string;
  businessEmail: string;
  businessPhone: string;
  googleReviewUrl: string;
  logoDataUrl?: string;
  logoFileName?: string;
  brandingNotes?: string;
}

export interface ShippingInfo {
  fullName: string;
  shippingBusinessName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SupplierInfo {
  supplierName: string;
  supplierStatus: 'Pending' | 'Ordered' | 'Shipped' | 'Delivered';
  supplierOrderDate?: string;
  supplierCost?: string;
  supplierTracking?: string;
  supplierOrdered: boolean;
  delivered: boolean;
  notes?: string;
}

export interface OrderRecord {
  id: string;
  packageId: PackageId;
  packageName: string;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  business: BusinessInfo;
  shipping: ShippingInfo;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  paypalOrderId?: string;
  paypalTxnId?: string;
  paymentMethod?: string;
  isTestOrder?: boolean;
  sheetSyncStatus: SheetSyncStatus;
  sheetSyncedAt?: string;
  sheetSyncError?: string;
  customerEmailStatus?: 'pending' | 'sent' | 'failed';
  customerEmailError?: string;
  adminEmailStatus?: 'pending' | 'sent' | 'failed';
  adminEmailError?: string;
  emailsSent?: {
    customerConfirmation: boolean;
    adminNotification: boolean;
    sentAt?: string;
  };
  supplierInfo?: SupplierInfo;
}

interface WebhookVerificationResult {
  isValid: boolean;
  status: string;
  error?: string;
}

// ==========================================
// 1. Data Store (Serverless /tmp + fallback)
// ==========================================
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DATA_DIR = path.join(process.cwd(), 'data');
const WRITABLE_DATA_DIR = isVercel ? path.join('/tmp', 'revtap-data') : BASE_DATA_DIR;

try {
  if (!fs.existsSync(WRITABLE_DATA_DIR)) {
    fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DB Init Warning]: Could not create writable data directory:', err);
}

const ORDERS_FILE = path.join(WRITABLE_DATA_DIR, 'orders.json');
const SEED_ORDERS_FILE = path.join(BASE_DATA_DIR, 'orders.json');

function loadJson<T>(primaryPath: string, fallbackPath: string, fallback: T): T {
  try {
    if (fs.existsSync(primaryPath)) {
      const data = fs.readFileSync(primaryPath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading primary ${primaryPath}:`, err);
  }
  try {
    if (fallbackPath && primaryPath !== fallbackPath && fs.existsSync(fallbackPath)) {
      const data = fs.readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading fallback ${fallbackPath}:`, err);
  }
  return fallback;
}

function saveJson(filePath: string, data: any): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[DB Storage Warning] Error writing ${filePath}:`, err);
  }
}

let orders: OrderRecord[] = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, []);

export function getOrderById(id: string): OrderRecord | undefined {
  orders = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, orders);
  return orders.find((o) => o.id.toLowerCase() === id.toLowerCase());
}

export function getOrderByPayPalOrderId(paypalOrderId: string): OrderRecord | undefined {
  if (!paypalOrderId) return undefined;
  orders = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, orders);
  return orders.find((o) => o.paypalOrderId && o.paypalOrderId.trim() === paypalOrderId.trim());
}

export function createOrder(orderData: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'sheetSyncStatus'>): OrderRecord {
  orders = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, orders);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `RVT-${year}${month}${day}`;
  const todaysOrders = orders.filter((o) => o.id.startsWith(datePrefix));
  const nextSeq = String(todaysOrders.length + 1).padStart(4, '0');
  const candidate = `${datePrefix}-${nextSeq}`;
  const id = orders.some((o) => o.id === candidate)
    ? `${datePrefix}-${Math.floor(1000 + Math.random() * 9000)}`
    : candidate;

  const isoNow = now.toISOString();
  const newOrder: OrderRecord = {
    ...orderData,
    id,
    createdAt: isoNow,
    updatedAt: isoNow,
    sheetSyncStatus: 'pending',
    supplierInfo: {
      supplierName: 'RevTap Direct NFC Partner',
      supplierOrdered: false,
      supplierStatus: 'Pending',
      delivered: false,
      notes: orderData.business.brandingNotes || 'Standard NFC + QR Custom Google Review Sign',
    },
  };

  orders.push(newOrder);
  saveJson(ORDERS_FILE, orders);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<OrderRecord>): OrderRecord | undefined {
  orders = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, orders);
  const index = orders.findIndex((o) => o.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return undefined;

  const current = orders[index];
  const updated: OrderRecord = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    supplierInfo: updates.supplierInfo
      ? { ...current.supplierInfo, ...updates.supplierInfo } as SupplierInfo
      : current.supplierInfo,
  };

  orders[index] = updated;
  saveJson(ORDERS_FILE, orders);
  return updated;
}

// ==========================================
// 2. Google Sheets Integration
// ==========================================
function cleanGooglePrivateKey(raw?: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  if (cleaned.endsWith(',')) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/^["']+|["']+$/g, '').trim();
  return cleaned;
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encodeBase64Url(header);
  const encodedClaimSet = encodeBase64Url(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const formattedKey = cleanGooglePrivateKey(privateKey);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer
    .sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google Auth Failed (${tokenRes.status}): ${errorText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

export async function syncOrderToGoogleSheet(order: OrderRecord): Promise<{ success: boolean; message: string }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    if (order.isTestOrder) {
      console.log(`[Test Order ${order.id}] Sheets credentials not configured. Simulating Google Sheet sync.`);
      updateOrder(order.id, {
        sheetSyncStatus: 'synced',
        sheetSyncedAt: new Date().toISOString(),
        sheetSyncError: undefined,
      });
      return { success: true, message: 'Test mode: Sheet sync simulated successfully' };
    }
    const reason = 'Google Sheets credentials not configured in environment (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY).';
    console.info(`[GoogleSheets] ${reason}`);
    updateOrder(order.id, {
      sheetSyncStatus: 'pending',
      sheetSyncError: reason,
    });
    return { success: false, message: reason };
  }

  try {
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const fullShippingAddress = [order.shipping.addressLine1, order.shipping.addressLine2].filter(Boolean).join(', ');
    const logoRef = order.business.logoFileName
      ? `Uploaded: ${order.business.logoFileName}`
      : order.business.logoDataUrl
      ? 'Embedded Base64 Image'
      : 'None';

    const rowData = [
      Boolean(order.isTestOrder) ? `[TEST] ${order.id}` : order.id,
      formattedDate,
      order.status.toUpperCase(),
      order.packageName,
      order.quantity,
      order.shipping.fullName,
      order.business.businessName,
      order.business.businessEmail,
      order.business.businessPhone || 'N/A',
      order.business.businessWebsite || 'N/A',
      order.business.googleReviewUrl,
      logoRef,
      order.shipping.shippingBusinessName || order.shipping.fullName,
      fullShippingAddress,
      order.shipping.city,
      order.shipping.state,
      order.shipping.zipCode,
      order.shipping.country,
      order.total.toFixed(2),
      order.currency,
      order.paypalTxnId || order.paypalOrderId || 'Pending/Simulated',
      order.supplierInfo?.supplierName || 'RevTap Direct NFC Partner',
      order.supplierInfo?.supplierStatus || 'Pending',
      order.supplierInfo?.supplierTracking || 'N/A',
      (Boolean(order.isTestOrder) ? '[TEST SIMULATION] ' : '') + (order.supplierInfo?.notes || ''),
      order.supplierInfo?.supplierOrdered ? 'YES' : 'NO',
      order.supplierInfo?.supplierOrderDate || '',
      order.supplierInfo?.supplierCost || '',
      order.supplierInfo?.supplierTracking || '',
      order.supplierInfo?.delivered ? 'YES' : 'NO',
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [rowData] }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Sheets API (${res.status}): ${errorBody}`);
    }

    console.log(`[GoogleSheets] Successfully synced order ${order.id} to sheet ${sheetId}`);
    updateOrder(order.id, {
      sheetSyncStatus: 'synced',
      sheetSyncedAt: new Date().toISOString(),
      sheetSyncError: undefined,
    });
    return { success: true, message: 'Synced to Google Sheet' };
  } catch (error: any) {
    console.error(`[GoogleSheets] Failed to sync order ${order.id}:`, error.message);
    updateOrder(order.id, {
      sheetSyncStatus: 'failed',
      sheetSyncError: error.message,
    });
    return { success: false, message: error.message };
  }
}

// ==========================================
// 3. Resend Email Dispatch
// ==========================================
export async function sendEmailViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const rawFrom = process.env.FROM_EMAIL?.trim() || 'onboarding@resend.dev';

  if (!apiKey) {
    const msg = 'RESEND_API_KEY is not configured. Email simulated safely.';
    console.warn(`[Email Service Warning]: ${msg}`);
    return { success: true, id: `simulated-no-key-${Date.now()}` };
  }

  const isConsumerDomain = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol)\./i.test(rawFrom);
  const fromAddress = isConsumerDomain
    ? 'RevTap <onboarding@resend.dev>'
    : rawFrom.includes('<')
    ? rawFrom
    : `RevTap <${rawFrom}>`;
  const replyTo = params.replyTo || (isConsumerDomain ? rawFrom : undefined);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: replyTo,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parsedMessage = errorText;
      try {
        const errJson = JSON.parse(errorText);
        parsedMessage = errJson.message || errorText;
      } catch {}

      if (parsedMessage.includes('only send testing emails to your own email address') || res.status === 403) {
        console.warn(`[Resend Sandbox Notice]: Free tier restricted to account owner. External email simulated.`);
        return { success: true, id: `simulated-sandbox-${Date.now()}` };
      }
      if (parsedMessage.includes('domain is not verified') && fromAddress !== 'RevTap <onboarding@resend.dev>') {
        console.warn(`[Resend Domain Notice]: Custom domain not verified. Retrying via onboarding@resend.dev...`);
        return sendEmailViaResend({ ...params, replyTo: rawFrom });
      }
      console.error(`[Resend Error ${res.status}]:`, parsedMessage);
      return { success: false, error: parsedMessage };
    }

    const data = (await res.json()) as { id?: string };
    console.log(`[Resend] Successfully dispatched email ${data.id} to ${params.to}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Network Error]:', err.message);
    return { success: false, error: err.message || 'Network error communicating with email provider.' };
  }
}

export async function sendCustomerOrderConfirmation(order: OrderRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const isTest = Boolean(order.isTestOrder);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.FROM_EMAIL?.trim();

  if (isTest && (!apiKey || !fromEmail)) {
    console.log(`[Test Order ${order.id}] Simulating customer confirmation email dispatch.`);
    updateOrder(order.id, {
      customerEmailStatus: 'sent',
      customerEmailError: undefined,
      emailsSent: {
        ...(order.emailsSent || { adminNotification: false }),
        customerConfirmation: true,
        sentAt: new Date().toISOString(),
      },
    });
    return { success: true, id: `test-cust-email-${order.id}` };
  }

  const fullAddress = [
    order.shipping.addressLine1,
    order.shipping.addressLine2,
    `${order.shipping.city}, ${order.shipping.state} ${order.shipping.zipCode}`,
    order.shipping.country,
  ].filter(Boolean).join(', ');

  const subject = `${isTest ? '[TEST ORDER] ' : ''}Thank You for Your RevTap Order — #${order.id}`;
  const textBody = `Hi ${order.shipping.fullName},

Thank you for choosing RevTap.

We've received your order for:
${order.packageName} (${order.quantity} NFC Review Sign${order.quantity > 1 ? 's' : ''})

Your order number is:
${order.id}

Business:
${order.business.businessName}

We'll now prepare your RevTap NFC Review Sign(s) using the business information you provided.

Shipping to:
${fullAddress}

Thank you,
The RevTap Team
https://revtap.com`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; color: #18181b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 32px;">
    <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #09090b;">RevTap</h2>
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${order.shipping.fullName}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Thank you for choosing RevTap. We've received your order and payment.</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #71717a; margin-bottom: 8px;">Order Details</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090b;">${order.packageName}</div>
      <div style="font-size: 14px; color: #52525b; margin-top: 4px;">Order Number: <strong style="color: #09090b;">${order.id}</strong></div>
      <div style="font-size: 14px; color: #52525b; margin-top: 4px;">Total: <strong style="color: #09090b;">$${order.total.toFixed(2)} ${order.currency}</strong> (Paid)</div>
    </div>
    <div style="margin-bottom: 24px; font-size: 15px; line-height: 1.6;">
      <p style="margin: 0 0 8px 0;"><strong>Configured Business:</strong> ${order.business.businessName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Shipping To:</strong><br>${order.shipping.fullName}<br>${fullAddress}</p>
    </div>
    <p style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
      We'll now prepare and encode your RevTap NFC Review Sign(s) using your verified Google Review link.
    </p>
    <div style="border-top: 1px solid #e4e4e7; padding-top: 20px; font-size: 14px; color: #71717a;">
      Thank you,<br>
      <strong style="color: #18181b;">The RevTap Team</strong><br>
      <a href="https://revtap.com" style="color: #2563eb; text-decoration: none;">revtap.com</a>
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmailViaResend({
    to: order.business.businessEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });

  updateOrder(order.id, {
    customerEmailStatus: result.success ? 'sent' : 'failed',
    customerEmailError: result.success ? undefined : result.error,
    emailsSent: {
      ...(order.emailsSent || { adminNotification: false }),
      customerConfirmation: result.success,
      sentAt: result.success ? new Date().toISOString() : order.emailsSent?.sentAt,
    },
  });

  return result;
}

export async function sendAdminOrderNotification(order: OrderRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const isTest = Boolean(order.isTestOrder);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.FROM_EMAIL?.trim();

  if (isTest && (!apiKey || !fromEmail)) {
    console.log(`[Test Order ${order.id}] Simulating admin notification dispatch.`);
    updateOrder(order.id, {
      adminEmailStatus: 'sent',
      adminEmailError: undefined,
      emailsSent: {
        ...(order.emailsSent || { customerConfirmation: false }),
        adminNotification: true,
        sentAt: new Date().toISOString(),
      },
    });
    return { success: true, id: `test-admin-email-${order.id}` };
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@revtap.com';
  const subject = `${isTest ? '[TEST ORDER] ' : ''}NEW REV TAP ORDER — ${order.id}`;
  const fullShippingAddress = [
    order.shipping.addressLine1,
    order.shipping.addressLine2,
    `${order.shipping.city}, ${order.shipping.state} ${order.shipping.zipCode}`,
    order.shipping.country,
  ].filter(Boolean).join(', ');

  const textBody = `NEW REV TAP ORDER — ${order.id}

Order ID: ${order.id}
Date: ${new Date(order.createdAt).toUTCString()}
Payment Status: ${order.status.toUpperCase()}
Package: ${order.packageName}
Quantity: ${order.quantity}
Total Paid: $${order.total.toFixed(2)} ${order.currency}
Customer Name: ${order.shipping.fullName}
Business Name: ${order.business.businessName}
Email: ${order.business.businessEmail}
Phone: ${order.business.businessPhone || 'N/A'}
Website: ${order.business.businessWebsite || 'N/A'}
Google Review URL: ${order.business.googleReviewUrl}
Shipping Address: ${fullShippingAddress}
PayPal Transaction ID: ${order.paypalTxnId || order.paypalOrderId || 'Pending/Simulated'}

==================================================
SUPPLIER REORDER INFORMATION
==================================================
Package: ${order.packageName}
Quantity: ${order.quantity}
Business Name: ${order.business.businessName}
Google Review URL: ${order.business.googleReviewUrl}
Shipping Address:
${order.shipping.fullName}
${order.shipping.shippingBusinessName ? order.shipping.shippingBusinessName + '\n' : ''}${fullShippingAddress}
Branding Notes: ${order.business.brandingNotes || 'None'}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; margin: 0; padding: 40px 20px; color: #f4f4f5;">
  <div style="max-width: 640px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px;">
    <div style="display: inline-block; background: #16a34a; color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">New Paid Order</div>
    <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Order ${order.id}</h2>
    <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 14px;">Total Paid: <strong style="color: #4ade80;">$${order.total.toFixed(2)} ${order.currency}</strong></p>
    <div style="background: #27272a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #e4e4e7;">Customer & Order Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #d4d4d8;">
        <tr><td style="padding: 4px 0; color: #a1a1aa; width: 140px;">Customer:</td><td style="color: #fff;">${order.shipping.fullName}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Business:</td><td style="color: #fff;">${order.business.businessName}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Email:</td><td><a href="mailto:${order.business.businessEmail}" style="color: #60a5fa;">${order.business.businessEmail}</a></td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Phone:</td><td>${order.business.businessPhone || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Package:</td><td style="color: #fff;">${order.packageName} (${order.quantity} signs)</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Review URL:</td><td><a href="${order.business.googleReviewUrl}" target="_blank" style="color: #60a5fa;">${order.business.googleReviewUrl}</a></td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">PayPal Txn:</td><td>${order.paypalTxnId || order.paypalOrderId || 'Simulated / Direct'}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmailViaResend({
    to: adminEmail,
    subject,
    text: textBody,
    html: htmlBody,
  });

  updateOrder(order.id, {
    adminEmailStatus: result.success ? 'sent' : 'failed',
    adminEmailError: result.success ? undefined : result.error,
    emailsSent: {
      ...(order.emailsSent || { customerConfirmation: false }),
      adminNotification: result.success,
      sentAt: result.success ? new Date().toISOString() : order.emailsSent?.sentAt,
    },
  });

  return result;
}

// ==========================================
// 4. Payment Processing
// ==========================================
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

  try {
    await syncOrderToGoogleSheet(updated);
  } catch (err: any) {
    console.error(`[PayPal -> GoogleSheets Error]:`, err.message);
  }

  try {
    await sendCustomerOrderConfirmation(updated);
  } catch (err: any) {
    console.error(`[PayPal -> Customer Email Error]:`, err.message);
  }

  try {
    await sendAdminOrderNotification(updated);
  } catch (err: any) {
    console.error(`[PayPal -> Admin Email Error]:`, err.message);
  }

  const finalOrder = getOrderById(orderId) || updated;
  return { success: true, order: finalOrder, message: 'Order successfully marked as paid' };
}

// ==========================================
// 5. PayPal Webhook Verification & Handling
// ==========================================
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

export function getPayPalBaseUrl(): string {
  const mode = (process.env.PAYPAL_MODE || process.env.PAYPAL_ENVIRONMENT || 'live').toLowerCase().trim();
  if (mode === 'sandbox') {
    return 'https://api-m.sandbox.paypal.com';
  }
  return 'https://api-m.paypal.com';
}

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

export async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined> | IncomingHttpHeaders,
  eventBody: any
): Promise<WebhookVerificationResult> {
  const authAlgo = getHeader(headers, 'paypal-auth-algo');
  const certUrl = getHeader(headers, 'paypal-cert-url');
  const transmissionId = getHeader(headers, 'paypal-transmission-id');
  const transmissionSig = getHeader(headers, 'paypal-transmission-sig');
  const transmissionTime = getHeader(headers, 'paypal-transmission-time');

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

  let primaryBaseUrl = getPayPalBaseUrl();
  let tokenResult = await fetchPayPalAccessToken(clientId, clientSecret, primaryBaseUrl);

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

export function extractOrderAndTxnId(event: any): {
  orderId?: string;
  paypalOrderId?: string;
  txnId?: string;
  amount?: string;
  currency?: string;
} {
  const resource = event?.resource || {};
  let orderId: string | undefined = undefined;

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

  const txnId = resource.id || resource.parent_payment || event.id || `PP-${Date.now()}`;
  const amount = resource.amount?.value || resource.total?.value || resource.amount;
  const currency = resource.amount?.currency_code || resource.total?.currency_code || 'USD';

  return { orderId, paypalOrderId, txnId, amount, currency };
}

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

export async function handlePayPalWebhookRequest(req: any, res: any): Promise<void> {
  // 1. Strict guard: ONLY allow HTTP POST
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
      return res.status(500).json({
        error: 'PayPal webhook verification credentials are not configured on server.',
        status: verification.status,
      });
    }

    console.warn(`[PayPal Webhook Signature Verification Failed]: ${verification.error}`);
    return res.status(400).json({
      error: 'Invalid PayPal webhook signature.',
      status: verification.status,
      message: verification.error,
    });
  }

  console.log(`[PayPal Webhook Verified] Event ${eventId} (${eventType}) passed signature validation.`);

  // 4. Process Payment Success Events (PAYMENT.CAPTURE.COMPLETED is primary)
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

    // Strict Idempotency Check
    if (order.status === 'paid') {
      console.log(`[PayPal Webhook]: Order ${order.id} is already marked as PAID. Skipping duplicate processing.`);
      return res.status(200).json({
        success: true,
        orderId: order.id,
        message: 'Order was already processed and marked as paid.',
        alreadyPaid: true,
      });
    }

    const result = await processPaidOrder(order.id, txnId, 'PayPal Webhook');

    return res.status(200).json({
      success: result.success,
      orderId: order.id,
      txnId,
      message: result.message,
      event: eventType,
    });
  }

  // Handle Refund / Dispute / Cancellation / Denial events
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

// ==========================================
// 6. Default Serverless Handler (Vercel)
// ==========================================
export default async function handler(req: any, res: any): Promise<void> {
  // Immediately return HTTP 405 Method Not Allowed for GET (or anything non-POST)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Method Not Allowed. PayPal webhooks require HTTP POST.',
    });
  }

  return handlePayPalWebhookRequest(req, res);
}
