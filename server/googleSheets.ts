import crypto from 'crypto';
import type { OrderRecord } from '../src/types';
import { updateOrder } from './db';

// Expected sheet columns
export const GOOGLE_SHEET_COLUMNS = [
  'Order ID',
  'Order Date',
  'Payment Status',
  'Package',
  'Quantity',
  'Customer Name',
  'Business Name',
  'Business Email',
  'Business Phone',
  'Website',
  'Google Review URL',
  'Logo URL / File Reference',
  'Shipping Name',
  'Shipping Address',
  'City',
  'State',
  'ZIP',
  'Country',
  'Order Total',
  'Currency',
  'PayPal Transaction ID',
  'Supplier',
  'Supplier Order Status',
  'Tracking Number',
  'Notes',
  'Supplier Ordered',
  'Supplier Order Date',
  'Supplier Cost',
  'Supplier Tracking',
  'Delivered',
];

/**
 * Transforms an OrderRecord into a row array matching GOOGLE_SHEET_COLUMNS
 */
export function orderToRow(order: OrderRecord): (string | number)[] {
  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fullShippingAddress = [order.shipping.addressLine1, order.shipping.addressLine2]
    .filter(Boolean)
    .join(', ');

  const logoRef = order.business.logoFileName
    ? `Uploaded: ${order.business.logoFileName}`
    : order.business.logoDataUrl
    ? 'Embedded Base64 Image'
    : 'None';

  return [
    order.id,
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
    order.supplierInfo?.notes || '',
    order.supplierInfo?.supplierOrdered ? 'YES' : 'NO',
    order.supplierInfo?.supplierOrderDate || '',
    order.supplierInfo?.supplierCost || '',
    order.supplierInfo?.supplierTracking || '',
    order.supplierInfo?.delivered ? 'YES' : 'NO',
  ];
}

/**
 * Creates a signed JWT access token for Google Service Account using Node.js crypto
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = encodeBase64Url(header);
  const encodedClaimSet = encodeBase64Url(claimSet);
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  // Clean private key formatting (handles escaped newlines in env vars)
  const formattedKey = privateKey.replace(/\\n/g, '\n');

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

/**
 * Appends an order to the connected Google Sheet
 */
export async function syncOrderToGoogleSheet(order: OrderRecord): Promise<{ success: boolean; message: string }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    const reason = 'Google Sheets credentials not fully configured in environment (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY). Order stored locally for manual reorder.';
    console.info(`[GoogleSheets] ${reason}`);
    updateOrder(order.id, {
      sheetSyncStatus: 'pending',
      sheetSyncError: reason,
    });
    return { success: false, message: reason };
  }

  try {
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
    const rowData = orderToRow(order);

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Sheets API responded with ${res.status}: ${errorBody}`);
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

/**
 * Generates CSV string for orders to allow direct supplier reordering
 */
export function generateOrdersCsv(ordersList: OrderRecord[]): string {
  const escapeCsv = (val: any) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = GOOGLE_SHEET_COLUMNS.map(escapeCsv).join(',');
  const rowLines = ordersList.map((order) => {
    const row = orderToRow(order);
    return row.map(escapeCsv).join(',');
  });

  return [headerLine, ...rowLines].join('\n');
}
