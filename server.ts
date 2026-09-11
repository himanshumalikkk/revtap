import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  saveContactInquiry,
  getAllInquiries,
} from './server/db';
import { getPayPalPaymentLinkForPackage, processPaidOrder } from './server/paypal';
import { syncOrderToGoogleSheet, generateOrdersCsv } from './server/googleSheets';
import { sendAdminContactNotification } from './server/email';
import type { PackageId, BusinessInfo, ShippingInfo } from './src/types';

dotenv.config();

const PACKAGES_CONFIG: Record<
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

// Rate limiter helper in memory
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count++;
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 10MB limit for business logos
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware: Security headers & rate limiting
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 120, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  });

  // ----------------------------------------------------
  // API Routes
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public Configuration & Readiness
  app.get('/api/config', (req, res) => {
    res.json({
      siteName: process.env.VITE_SITE_NAME || 'RevTap',
      packages: PACKAGES_CONFIG,
      paypalConfig: {
        hasStarterLink: Boolean(process.env.PAYPAL_STARTER_PAYMENT_LINK),
        hasBusinessLink: Boolean(process.env.PAYPAL_BUSINESS_PAYMENT_LINK),
        hasGrowthLink: Boolean(process.env.PAYPAL_GROWTH_PAYMENT_LINK),
        hasClientId: Boolean(process.env.PAYPAL_CLIENT_ID),
      },
      googleSheetsConfigured: Boolean(
        process.env.GOOGLE_SHEET_ID &&
          process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
          process.env.GOOGLE_PRIVATE_KEY
      ),
      googleSheetId: process.env.GOOGLE_SHEET_ID || '',
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      adminEmail: process.env.ADMIN_EMAIL || 'admin@revtap.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@revtap.com',
    });
  });

  // Create an Order (Sets status = payment_pending)
  app.post('/api/orders', (req, res) => {
    try {
      const { packageId, business, shipping } = req.body as {
        packageId: PackageId;
        business: BusinessInfo;
        shipping: ShippingInfo;
      };

      // Server-side validation
      if (!packageId || !PACKAGES_CONFIG[packageId]) {
        return res.status(400).json({ error: 'Invalid package selected.' });
      }

      if (!business || !business.businessName?.trim()) {
        return res.status(400).json({ error: 'Business Name is required.' });
      }

      if (!business.businessEmail || !business.businessEmail.includes('@')) {
        return res.status(400).json({ error: 'A valid business email address is required.' });
      }

      if (!business.googleReviewUrl?.trim()) {
        return res.status(400).json({ error: 'Google Review URL is required.' });
      }

      // Basic URL format validation
      if (!business.googleReviewUrl.startsWith('http://') && !business.googleReviewUrl.startsWith('https://')) {
        return res.status(400).json({ error: 'Google Review URL must start with https:// or http://' });
      }

      if (!shipping || !shipping.fullName?.trim()) {
        return res.status(400).json({ error: 'Full Shipping Name is required.' });
      }

      if (!shipping.addressLine1?.trim()) {
        return res.status(400).json({ error: 'Shipping Street Address is required.' });
      }

      if (!shipping.city?.trim() || !shipping.state?.trim() || !shipping.zipCode?.trim()) {
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
        business: {
          businessName: business.businessName.trim(),
          businessWebsite: (business.businessWebsite || '').trim(),
          businessEmail: business.businessEmail.trim().toLowerCase(),
          businessPhone: (business.businessPhone || '').trim(),
          googleReviewUrl: business.googleReviewUrl.trim(),
          logoDataUrl: business.logoDataUrl,
          logoFileName: business.logoFileName,
          brandingNotes: (business.brandingNotes || '').trim(),
        },
        shipping: {
          fullName: shipping.fullName.trim(),
          shippingBusinessName: (shipping.shippingBusinessName || business.businessName).trim(),
          addressLine1: shipping.addressLine1.trim(),
          addressLine2: (shipping.addressLine2 || '').trim(),
          city: shipping.city.trim(),
          state: shipping.state.trim().toUpperCase(),
          zipCode: shipping.zipCode.trim(),
          country: shipping.country?.trim() || 'United States',
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
      return res.status(500).json({ error: 'Internal server error while creating order.' });
    }
  });

  // Fetch Order By ID
  app.get('/api/orders/:id', (req, res) => {
    const order = getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order });
  });

  // Client Payment Confirmation (e.g. returning from PayPal or custom checkout)
  app.post('/api/orders/:id/confirm-payment', async (req, res) => {
    const { id } = req.params;
    const { paypalTxnId, paymentMethod } = req.body;

    const result = await processPaidOrder(id, paypalTxnId, paymentMethod || 'PayPal Hosted');
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, order: result.order });
  });

  // Preview / Simulation Endpoint: lets store owners and testers test the full paid order flow
  app.post('/api/orders/:id/simulate-payment', async (req, res) => {
    const { id } = req.params;
    const simulatedTxn = `TEST-TXN-${Date.now().toString(36).toUpperCase()}`;
    const result = await processPaidOrder(id, simulatedTxn, 'PayPal Sandbox / Test Simulation');
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    return res.json({ success: true, order: result.order });
  });

  // PayPal Webhook Endpoint
  app.post('/api/paypal/webhook', async (req, res) => {
    try {
      const event = req.body;
      console.log(`[PayPal Webhook Received] Event Type: ${event.event_type}`);

      // Inspect event types: PAYMENT.CAPTURE.COMPLETED, CHECKOUT.ORDER.APPROVED
      if (
        event.event_type === 'PAYMENT.CAPTURE.COMPLETED' ||
        event.event_type === 'CHECKOUT.ORDER.APPROVED'
      ) {
        const resource = event.resource || {};
        // Look for custom_id or invoice_id containing orderId
        const orderId =
          resource.custom_id ||
          resource.invoice_id ||
          resource.custom ||
          (resource.purchase_units && resource.purchase_units[0]?.custom_id);

        const txnId = resource.id || `PP-${Date.now()}`;

        if (orderId) {
          await processPaidOrder(orderId, txnId, 'PayPal Webhook');
        } else {
          console.warn('[PayPal Webhook] No order ID detected in webhook payload resource:', resource);
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('[PayPal Webhook Error]:', err);
      return res.status(500).json({ error: 'Webhook processing error' });
    }
  });

  // Contact Form Submission
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, business, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
      }

      const inquiry = saveContactInquiry({
        name: name.trim(),
        business: (business || '').trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
      });

      // Dispatch notification
      sendAdminContactNotification(inquiry).catch((err) =>
        console.error('[Contact Notification Error]:', err)
      );

      return res.json({ success: true, inquiry });
    } catch (err: any) {
      console.error('[Contact Error]:', err);
      return res.status(500).json({ error: 'Failed to submit contact message.' });
    }
  });

  // ----------------------------------------------------
  // Admin & Operations API
  // ----------------------------------------------------

  // Get all orders
  app.get('/api/admin/orders', (req, res) => {
    const orders = getAllOrders();
    return res.json({ orders });
  });

  // Get all contact inquiries
  app.get('/api/admin/inquiries', (req, res) => {
    const inquiries = getAllInquiries();
    return res.json({ inquiries });
  });

  // Retry Google Sheet sync for an order
  app.post('/api/admin/orders/:id/sync-sheet', async (req, res) => {
    const order = getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const result = await syncOrderToGoogleSheet(order);
    const updated = getOrderById(req.params.id);
    return res.json({ ...result, order: updated });
  });

  // Update supplier reorder fields
  app.post('/api/admin/orders/:id/update-supplier', (req, res) => {
    const { supplierInfo } = req.body;
    const updated = updateOrder(req.params.id, { supplierInfo });
    if (!updated) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ success: true, order: updated });
  });

  // Export orders as supplier reorder CSV
  app.get('/api/admin/export-csv', (req, res) => {
    const orders = getAllOrders();
    const csvData = generateOrdersCsv(orders);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="revtap-orders-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csvData);
  });

  // ----------------------------------------------------
  // Vite Middleware (Dev) / Static Serve (Prod)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RevTap Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
