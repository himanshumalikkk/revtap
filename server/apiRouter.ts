import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByPayPalOrderId,
  updateOrder,
  saveContactInquiry,
  getAllInquiries,
} from './db.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  processPaidOrder,
  getPayPalBaseUrl,
} from './paypal.js';
import { syncOrderToGoogleSheet, generateOrdersCsv } from './googleSheets.js';
import { sendAdminContactNotification } from './email.js';
import { handlePayPalWebhookRequest } from './paypalWebhook.js';
import type { PackageId, BusinessInfo, ShippingInfo } from '../src/types';

export const PACKAGES_CONFIG: Record<
  PackageId,
  { name: string; price: number; signsCount: number; badge?: string; isPopular?: boolean }
> = {
  starter: {
    name: 'Starter Pack',
    price: 59.99,
    signsCount: 1,
  },
  business: {
    name: 'Business Pack',
    price: 99.99,
    signsCount: 2,
    badge: 'MOST POPULAR',
    isPopular: true,
  },
  growth: {
    name: 'Growth Pack',
    price: 199.99,
    signsCount: 5,
  },
};

export const apiRouter = Router();

// ----------------------------------------------------
// Core API Routes
// ----------------------------------------------------

// Health check
apiRouter.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public Configuration & Readiness
apiRouter.get('/api/config', (req, res) => {
  res.json({
    siteName: process.env.VITE_SITE_NAME || 'RevTap',
    packages: PACKAGES_CONFIG,
    paypalConfig: {
      hasClientId: Boolean(process.env.PAYPAL_CLIENT_ID),
      hasClientSecret: Boolean(process.env.PAYPAL_CLIENT_SECRET),
      hasWebhookId: Boolean(process.env.PAYPAL_WEBHOOK_ID),
      mode: (process.env.PAYPAL_MODE || 'live').toLowerCase().trim(),
    },
    googleSheetsConfigured: Boolean(
      process.env.GOOGLE_SHEET_ID &&
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY
    ),
    googleSheetId: process.env.GOOGLE_SHEET_ID || '',
    resendConfigured: Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL),
    fromEmailConfigured: Boolean(process.env.FROM_EMAIL),
    adminEmail: process.env.ADMIN_EMAIL || 'admin@revtap.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@revtap.com',
  });
});

// Create an Order (Sets status = payment_pending)
apiRouter.post('/api/orders', async (req, res) => {
  try {
    const body = req.body || {};
    const { packageId, business, shipping, isTestOrder } = body as {
      packageId: PackageId;
      business: BusinessInfo;
      shipping: ShippingInfo;
      isTestOrder?: boolean;
    };

    // Server-side validation
    if (!packageId || !PACKAGES_CONFIG[packageId]) {
      return res.status(400).json({ error: 'Please select a valid package (Starter, Business, or Growth).' });
    }

    if (!business || typeof business !== 'object') {
      return res.status(400).json({ error: 'Business details are required.' });
    }

    const businessName = (business.businessName || '').trim();
    if (!businessName) {
      return res.status(400).json({ error: 'Business Name is required.' });
    }

    const businessEmail = (business.businessEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!businessEmail || !emailRegex.test(businessEmail)) {
      return res.status(400).json({ error: 'A valid business email address is required.' });
    }

    let reviewUrl = (business.googleReviewUrl || '').trim();
    if (!reviewUrl) {
      return res.status(400).json({ error: 'Google Review URL or link is required.' });
    }

    // Auto-prefix https:// if customer pasted e.g. g.page/r/... or maps.app.goo.gl/...
    if (!/^https?:\/\//i.test(reviewUrl)) {
      reviewUrl = `https://${reviewUrl}`;
    }

    if (!shipping || typeof shipping !== 'object') {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const fullName = (shipping.fullName || '').trim();
    if (!fullName) {
      return res.status(400).json({ error: 'Full Shipping Name is required.' });
    }

    const addressLine1 = (shipping.addressLine1 || '').trim();
    if (!addressLine1) {
      return res.status(400).json({ error: 'Shipping Street Address is required.' });
    }

    const city = (shipping.city || '').trim();
    const state = (shipping.state || '').trim().toUpperCase();
    const zipCode = (shipping.zipCode || '').trim();
    if (!city || !state || !zipCode) {
      return res.status(400).json({ error: 'Shipping City, State, and ZIP Code are required.' });
    }

    const pkg = PACKAGES_CONFIG[packageId];
    const newOrder = createOrder({
      status: 'payment_pending',
      packageId,
      packageName: pkg.name,
      quantity: pkg.signsCount,
      price: pkg.price,
      total: pkg.price,
      currency: 'USD',
      isTestOrder: Boolean(isTestOrder),
      business: {
        businessName,
        businessWebsite: (business.businessWebsite || '').trim(),
        businessEmail,
        businessPhone: (business.businessPhone || '').trim(),
        googleReviewUrl: reviewUrl,
        logoDataUrl: business.logoDataUrl,
        logoFileName: business.logoFileName,
        brandingNotes: (business.brandingNotes || '').trim(),
      },
      shipping: {
        fullName,
        shippingBusinessName: (shipping.shippingBusinessName || businessName).trim(),
        addressLine1,
        addressLine2: (shipping.addressLine2 || '').trim(),
        city,
        state,
        zipCode,
        country: (shipping.country || 'United States').trim(),
      },
    });

    // Determine public origin for return/cancel URLs
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    
    let origin = `${protocol}://${host}`;
    if (process.env.APP_URL && /^https?:\/\//i.test(process.env.APP_URL)) {
      origin = process.env.APP_URL.replace(/\/$/, '');
    } else if (process.env.VERCEL_URL) {
      origin = `https://${process.env.VERCEL_URL}`;
    }

    const returnUrl = `${origin}/api/paypal/return?order_id=${encodeURIComponent(newOrder.id)}`;
    const cancelUrl = `${origin}/api/paypal/cancel?order_id=${encodeURIComponent(newOrder.id)}`;

    // Verify PayPal REST API credentials exist
    const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      console.error('[PayPal Config Error]: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not configured on server.');
      return res.status(500).json({
        error: 'PayPal REST API credentials (PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET) are not configured on the server. Please check your production environment variables.',
      });
    }

    // Call PayPal Live REST Orders API POST /v2/checkout/orders
    const paypalOrder = await createPayPalOrder({
      order: newOrder,
      returnUrl,
      cancelUrl,
    });

    const approvalUrl = paypalOrder.approvalUrl;
    const paypalOrderId = paypalOrder.paypalOrderId;

    console.log(`[Order Created] Order ID: ${newOrder.id} - Pending Payment - PayPal Order: ${paypalOrderId}`);

    return res.status(201).json({
      success: true,
      order: getOrderById(newOrder.id) || newOrder,
      paypalOrderId,
      approvalUrl,
      paymentLink: approvalUrl, // Provided for frontend checkout redirect
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    return res.status(500).json({
      error: err.message || 'Unable to initialize order with PayPal. Please try again.',
    });
  }
});

// PayPal Return URL Handler - Captures PayPal order and redirects user to Success view
apiRouter.get('/api/paypal/return', async (req, res) => {
  try {
    const orderId = (req.query.order_id as string) || '';
    const token = (req.query.token as string) || ''; // PayPal Order ID token

    let order = orderId ? getOrderById(orderId) : undefined;
    if (!order && token) {
      order = getOrderByPayPalOrderId(token);
    }

    if (!order) {
      return res.redirect('/?status=error&error_msg=Order+not+found');
    }

    if (order.status === 'paid') {
      return res.redirect(`/?order_id=${encodeURIComponent(order.id)}&status=success`);
    }

    const paypalOrderIdToCapture = token || order.paypalOrderId;
    if (!paypalOrderIdToCapture) {
      return res.redirect(`/?order_id=${encodeURIComponent(order.id)}&status=error&error_msg=Missing+PayPal+Order+ID`);
    }

    const captureResult = await capturePayPalOrder(paypalOrderIdToCapture);
    if (captureResult.success) {
      return res.redirect(`/?order_id=${encodeURIComponent(order.id)}&status=success`);
    } else {
      return res.redirect(`/?order_id=${encodeURIComponent(order.id)}&status=error&error_msg=${encodeURIComponent(captureResult.error || 'Payment capture failed')}`);
    }
  } catch (err: any) {
    console.error('[PayPal Return Handler Exception]:', err);
    return res.redirect(`/?status=error&error_msg=${encodeURIComponent(err.message || 'Payment verification failed')}`);
  }
});

// PayPal Cancel URL Handler - Handles customer cancellation on PayPal checkout
apiRouter.get('/api/paypal/cancel', (req, res) => {
  const orderId = (req.query.order_id as string) || '';
  if (orderId) {
    const order = getOrderById(orderId);
    if (order && order.status === 'payment_pending') {
      updateOrder(order.id, { status: 'cancelled' });
    }
    return res.redirect(`/?order_id=${encodeURIComponent(orderId)}&status=cancel`);
  }
  return res.redirect('/?status=cancel');
});

// Fetch Order By ID
apiRouter.get('/api/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  return res.json({ order });
});

// Secure Server-side Capture Endpoint for a PayPal Order
apiRouter.post('/api/orders/:id/capture', async (req, res) => {
  try {
    const { id } = req.params;
    const order = getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: `Order ${id} not found.` });
    }

    if (order.status === 'paid') {
      return res.json({
        success: true,
        order,
        message: 'Order was already processed and verified as paid.',
      });
    }

    const paypalOrderId = req.body?.paypalOrderId || order.paypalOrderId;
    if (!paypalOrderId) {
      return res.status(400).json({ error: 'No PayPal Order ID associated with this order.' });
    }

    const result = await capturePayPalOrder(paypalOrderId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Payment capture failed.' });
    }

    const updatedOrder = getOrderById(id);
    return res.json({
      success: true,
      order: updatedOrder,
      captureId: result.captureId,
      message: 'Order successfully captured and verified as paid.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Capture exception occurred.' });
  }
});

// Client Payment Confirmation endpoint - strictly requires verified payment/capture
apiRouter.post('/api/orders/:id/confirm-payment', (req, res) => {
  // Orders cannot be marked as paid directly from untrusted client requests
  return res.status(400).json({
    error: 'Orders cannot be marked as paid directly from the browser. Payments must be captured via the PayPal REST API or verified via PayPal Webhooks.',
  });
});

// Sandbox / Local Testing Simulation Endpoint: Strictly isolated from production
apiRouter.post('/api/orders/:id/simulate-payment', async (req, res) => {
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase().trim();
  if (process.env.NODE_ENV === 'production' && mode !== 'sandbox') {
    return res.status(403).json({
      error: 'Simulated payments are strictly disabled in production. Checkout must be completed through real PayPal Live approval.',
    });
  }

  const { id } = req.params;
  const simulatedTxn = `TEST-TXN-${Date.now().toString(36).toUpperCase()}`;
  const result = await processPaidOrder(id, simulatedTxn, 'PayPal Sandbox / Test Simulation');
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  return res.json({
    success: true,
    order: result.order,
    message: result.message,
    syncSummary: {
      sheetSyncStatus: result.order?.sheetSyncStatus,
      sheetSyncError: result.order?.sheetSyncError,
      customerEmailStatus: result.order?.customerEmailStatus,
      customerEmailError: result.order?.customerEmailError,
      adminEmailStatus: result.order?.adminEmailStatus,
      adminEmailError: result.order?.adminEmailError,
    },
  });
});

// PayPal Webhook Endpoint (verifies signature, processes payments, updates sheets & sends emails)
apiRouter.all('/api/paypal/webhook', async (req, res) => {
  return handlePayPalWebhookRequest(req, res);
});

// Contact Form Submission with validation, email config check, deduplication, and notification delivery
apiRouter.post('/api/contact', async (req, res) => {
  try {
    const { name, business, businessName, email, message } = req.body;

    // 1. Server-side validation
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanMessage = (message || '').trim();
    const cleanBusiness = (business || businessName || '').trim();

    if (!cleanName) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!cleanMessage || cleanMessage.length < 5) {
      return res.status(400).json({ error: 'Please provide a message of at least 5 characters.' });
    }

    // 2. Persist contact inquiry immediately so customer messages are never lost
    const inquiry = saveContactInquiry({
      name: cleanName,
      business: cleanBusiness,
      email: cleanEmail,
      message: cleanMessage,
    });

    console.log(`[Contact Inquiry Saved] ID: ${inquiry.id} from ${cleanName} (${cleanEmail})`);

    // 3. Dispatch notification email to Administrator in background / safe await
    try {
      const emailResult = await sendAdminContactNotification(inquiry);
      if (emailResult.success) {
        console.log(`[Contact Notification Dispatched] Email ID: ${emailResult.id || 'ok'}`);
      } else {
        console.warn(`[Contact Notification Warning]: ${emailResult.error || 'Failed to dispatch email'}`);
      }
    } catch (emailErr: any) {
      console.warn(`[Contact Email Dispatch Exception]: ${emailErr.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Your inquiry has been received. Our team will get back to you shortly!',
      inquiryId: inquiry.id,
    });
  } catch (err: any) {
    console.error('[Contact Error]:', err);
    return res.status(500).json({
      error: err.message || 'An unexpected server error occurred while sending your message. Please try again.',
    });
  }
});

// ----------------------------------------------------
// Admin & Operations API
// ----------------------------------------------------

// Get all orders
apiRouter.get('/api/admin/orders', (req, res) => {
  const orders = getAllOrders();
  return res.json({ orders });
});

// Get all contact inquiries
apiRouter.get('/api/admin/inquiries', (req, res) => {
  const inquiries = getAllInquiries();
  return res.json({ inquiries });
});

// Retry Google Sheet sync for an order
apiRouter.post('/api/admin/orders/:id/sync-sheet', async (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const result = await syncOrderToGoogleSheet(order);
  const updated = getOrderById(req.params.id);
  return res.json({ ...result, order: updated });
});

// Update supplier reorder fields
apiRouter.post('/api/admin/orders/:id/update-supplier', (req, res) => {
  const { supplierInfo } = req.body;
  const updated = updateOrder(req.params.id, { supplierInfo });
  if (!updated) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  return res.json({ success: true, order: updated });
});

// Export orders as supplier reorder CSV
apiRouter.get('/api/admin/export-csv', (req, res) => {
  const orders = getAllOrders();
  const csvData = generateOrdersCsv(orders);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="revtap-orders-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  return res.send(csvData);
});
