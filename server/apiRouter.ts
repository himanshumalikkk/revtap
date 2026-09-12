import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  saveContactInquiry,
  getAllInquiries,
} from './db';
import { getPayPalPaymentLinkForPackage, processPaidOrder } from './paypal';
import { syncOrderToGoogleSheet, generateOrdersCsv } from './googleSheets';
import { sendAdminContactNotification } from './email';
import { handlePayPalWebhookRequest } from './paypalWebhook';
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
      hasStarterLink: Boolean(process.env.PAYPAL_STARTER_PAYMENT_LINK),
      hasBusinessLink: Boolean(process.env.PAYPAL_BUSINESS_PAYMENT_LINK),
      hasGrowthLink: Boolean(process.env.PAYPAL_GROWTH_PAYMENT_LINK),
      hasClientId: Boolean(process.env.PAYPAL_CLIENT_ID),
      hasWebhookId: Boolean(process.env.PAYPAL_WEBHOOK_ID),
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
apiRouter.post('/api/orders', (req, res) => {
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

    // Retrieve official PayPal payment link or hosted checkout URL
    const paymentLink = getPayPalPaymentLinkForPackage(packageId, newOrder.id);

    console.log(`[Order Created] Order ID: ${newOrder.id} - Pending Payment - Target: ${paymentLink}`);

    return res.status(201).json({
      success: true,
      order: newOrder,
      paymentLink,
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    return res.status(500).json({
      error: err.message || 'Unable to initialize order. Please verify your details and try again.',
    });
  }
});

// Fetch Order By ID
apiRouter.get('/api/orders/:id', (req, res) => {
  const order = getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  return res.json({ order });
});

// Client Payment Confirmation endpoint - strictly requires webhook verification
apiRouter.post('/api/orders/:id/confirm-payment', (req, res) => {
  // Orders are only marked as paid via verified PayPal webhooks
  return res.status(400).json({
    error: 'Orders cannot be marked as paid directly from the browser. Payments must be verified via the PayPal Webhook.',
  });
});

// Preview / Simulation Endpoint: lets store owners and testers test the full paid order flow
apiRouter.post('/api/orders/:id/simulate-payment', async (req, res) => {
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
