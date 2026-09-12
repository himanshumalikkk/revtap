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

// In-memory deduplication cache for contact form submissions (prevents spam/duplicates)
const recentInquiryMap = new Map<string, number>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with 25MB limit for high-resolution business logos
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Error middleware for payload / JSON parsing errors (prevents returning raw HTML to clients)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      if (err.type === 'entity.too.large') {
        return res.status(413).json({
          error: 'The uploaded logo or payload exceeds the 25MB size limit. Please upload a smaller image file.',
        });
      }
      if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Malformed JSON payload provided.' });
      }
    }
    next(err);
  });

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
      resendConfigured: Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL),
      fromEmailConfigured: Boolean(process.env.FROM_EMAIL),
      adminEmail: process.env.ADMIN_EMAIL || 'admin@revtap.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@revtap.com',
    });
  });

  // Create an Order (Sets status = payment_pending)
  app.post('/api/orders', (req, res) => {
    try {
      const { packageId, business, shipping, isTestOrder } = req.body as {
        packageId: PackageId;
        business: BusinessInfo;
        shipping: ShippingInfo;
        isTestOrder?: boolean;
      };

      // Server-side validation
      if (!packageId || !PACKAGES_CONFIG[packageId]) {
        return res.status(400).json({ error: 'Invalid package selected.' });
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
        error: 'Unable to initialize order. Please verify your details and try again.',
      });
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

  // Contact Form Submission with validation, email config check, deduplication, and notification delivery
  app.post('/api/contact', async (req, res) => {
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

      // 2. Email Service Configuration Check
      const apiKey = process.env.RESEND_API_KEY?.trim();
      const fromEmail = process.env.FROM_EMAIL?.trim();

      if (!apiKey || !fromEmail) {
        console.error('[Contact Error]: Missing email service configuration');
        return res.status(500).json({
          error: 'Email service is not configured. Please configure RESEND_API_KEY and FROM_EMAIL.',
        });
      }

      // 3. Prevent duplicate submissions (within 60 seconds from same email & message)
      const dedupeKey = `${cleanEmail}:${cleanMessage}`;
      const now = Date.now();
      const lastSent = recentInquiryMap.get(dedupeKey);
      if (lastSent && now - lastSent < 60000) {
        return res.status(429).json({
          error: 'A duplicate message was recently received. Please wait a moment before submitting again.',
        });
      }
      recentInquiryMap.set(dedupeKey, now);

      // Clean up old entries from deduplication map every 100 entries
      if (recentInquiryMap.size > 200) {
        for (const [key, timestamp] of recentInquiryMap.entries()) {
          if (now - timestamp > 120000) {
            recentInquiryMap.delete(key);
          }
        }
      }

      // 4. Persist contact inquiry safely
      const inquiry = saveContactInquiry({
        name: cleanName,
        business: cleanBusiness,
        email: cleanEmail,
        message: cleanMessage,
      });

      // 5. Send notification to ADMIN_EMAIL and wait for result
      const emailResult = await sendAdminContactNotification(inquiry);
      if (!emailResult.success) {
        console.error('[Contact Email Delivery Failed]:', emailResult.error);
        return res.status(502).json({
          error: `Email delivery failed: ${emailResult.error || 'Unable to route message to administrator.'}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Your inquiry has been received. Our team will get back to you shortly!',
        inquiryId: inquiry.id,
      });
    } catch (err: any) {
      console.error('[Contact Error]:', err);
      return res.status(500).json({
        error: 'An unexpected server error occurred while sending your message. Please try again.',
      });
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
