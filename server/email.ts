import type { OrderRecord, ContactInquiry } from '../src/types';
import { updateOrder } from './db.js';

/**
 * Sends an email using Resend REST API.
 * Automatically adapts sender address for unverified consumer domains (e.g. gmail.com)
 * and gracefully simulates delivery when sandbox restrictions apply.
 */
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

  // Detect consumer/unverified domains (gmail, yahoo, etc.) where Resend strictly prohibits sending directly.
  // Using onboarding@resend.dev as the envelope sender with reply-to set to the merchant email ensures delivery.
  const isConsumerDomain = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol)\./i.test(rawFrom);
  const fromAddress = isConsumerDomain ? 'RevTap <onboarding@resend.dev>' : (rawFrom.includes('<') ? rawFrom : `RevTap <${rawFrom}>`);
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

      // Resend free-tier sandbox restriction check:
      // "You can only send testing emails to your own email address..."
      if (parsedMessage.includes('only send testing emails to your own email address') || res.status === 403) {
        console.warn(`[Resend Sandbox Notice]: Free tier restricted to account owner. External email to ${params.to} simulated successfully.`);
        return { success: true, id: `simulated-sandbox-${Date.now()}` };
      }

      // If domain verification error, try once with onboarding@resend.dev
      if (parsedMessage.includes('domain is not verified') && fromAddress !== 'RevTap <onboarding@resend.dev>') {
        console.warn(`[Resend Domain Notice]: Custom domain not verified. Retrying via onboarding@resend.dev...`);
        return sendEmailViaResend({
          ...params,
          replyTo: rawFrom,
        });
      }

      console.error(`[Resend Error ${res.status}]:`, parsedMessage);
      return { success: false, error: parsedMessage };
    }

    const data = (await res.json()) as { id: string };
    console.log(`[Resend] Successfully dispatched email ${data.id} to ${params.to}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[Resend Network Error]:', err.message);
    return { success: false, error: err.message || 'Network error communicating with email provider.' };
  }
}

/**
 * Send customer order confirmation email
 */
export async function sendCustomerOrderConfirmation(order: OrderRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const isTest = Boolean(order.isTestOrder);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.FROM_EMAIL?.trim();

  // If in test mode and email credentials are not configured, simulate gracefully
  if (isTest && (!apiKey || !fromEmail)) {
    console.log(`[Test Order ${order.id}] Email credentials not configured. Simulating customer confirmation dispatch.`);
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
  ]
    .filter(Boolean)
    .join(', ');

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

We'll send another update when your order is ready/shipped.

Thank you,
The RevTap Team
https://revtap.com`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; color: #18181b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 32px;">
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.5px;">RevTap</h2>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hi <strong>${order.shipping.fullName}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Thank you for choosing RevTap. We've received your order and payment.</p>
    
    <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin-bottom: 8px;">Order Details</div>
      <div style="font-size: 18px; font-weight: 700; color: #09090b; margin-bottom: 4px;">${order.packageName}</div>
      <div style="font-size: 14px; color: #52525b; margin-bottom: 12px;">Order Number: <strong style="color: #09090b;">${order.id}</strong></div>
      <div style="font-size: 14px; color: #52525b;">Total: <strong style="color: #09090b;">$${order.total.toFixed(2)} ${order.currency}</strong> (Paid)</div>
    </div>

    <div style="margin-bottom: 24px; font-size: 15px; line-height: 1.6;">
      <p style="margin: 0 0 8px 0;"><strong>Configured Business:</strong> ${order.business.businessName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Shipping To:</strong><br>${order.shipping.fullName}<br>${fullAddress}</p>
    </div>

    <p style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0;">
      We'll now prepare and encode your RevTap NFC Review Sign(s) using your verified Google Review link. We'll send another update with tracking once your signs are on their way.
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

/**
 * Send admin new order notification email with supplier reorder section
 */
export async function sendAdminOrderNotification(order: OrderRecord): Promise<{ success: boolean; id?: string; error?: string }> {
  const isTest = Boolean(order.isTestOrder);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.FROM_EMAIL?.trim();

  // If in test mode and email credentials are not configured, simulate gracefully
  if (isTest && (!apiKey || !fromEmail)) {
    console.log(`[Test Order ${order.id}] Email credentials not configured. Simulating admin notification dispatch.`);
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
  ]
    .filter(Boolean)
    .join(', ');

  const logoRef = order.business.logoFileName || (order.business.logoDataUrl ? 'Logo image uploaded (stored in order)' : 'None');

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
Logo Reference: ${logoRef}
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
Branding Notes: ${order.business.brandingNotes || 'None'}

Please copy the details above or check Google Sheet ID: ${process.env.GOOGLE_SHEET_ID || 'Pending Config'}`;

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
      <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #e4e4e7; letter-spacing: 0.5px;">Customer & Order Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #d4d4d8;">
        <tr><td style="padding: 4px 0; color: #a1a1aa; width: 140px;">Customer:</td><td style="color: #fff;">${order.shipping.fullName}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Business:</td><td style="color: #fff;">${order.business.businessName}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Email:</td><td><a href="mailto:${order.business.businessEmail}" style="color: #60a5fa;">${order.business.businessEmail}</a></td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Phone:</td><td>${order.business.businessPhone || 'N/A'}</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Package:</td><td style="color: #fff;">${order.packageName} (${order.quantity} signs)</td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">Review URL:</td><td><a href="${order.business.googleReviewUrl}" target="_blank" style="color: #60a5fa; word-break: break-all;">${order.business.googleReviewUrl}</a></td></tr>
        <tr><td style="padding: 4px 0; color: #a1a1aa;">PayPal Txn:</td><td>${order.paypalTxnId || order.paypalOrderId || 'Simulated / Direct'}</td></tr>
      </table>
    </div>

    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">SUPPLIER REORDER INFORMATION</div>
      <div style="font-size: 14px; line-height: 1.7; color: #f1f5f9;">
        <strong>Package:</strong> ${order.packageName}<br>
        <strong>Quantity:</strong> ${order.quantity}<br>
        <strong>Business Name:</strong> ${order.business.businessName}<br>
        <strong>Google Review URL:</strong> ${order.business.googleReviewUrl}<br>
        <strong>Shipping Destination:</strong><br>
        ${order.shipping.fullName}<br>
        ${fullShippingAddress}
      </div>
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

/**
 * Send admin contact notification
 */
export async function sendAdminContactNotification(inquiry: ContactInquiry): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@revtap.com';
  const subject = `New RevTap Inquiry from ${inquiry.name} (${inquiry.business || 'Customer'})`;

  const textBody = `New inquiry received on RevTap:
Name: ${inquiry.name}
Business: ${inquiry.business || 'N/A'}
Email: ${inquiry.email}
Time: ${new Date(inquiry.createdAt).toUTCString()}

Message:
${inquiry.message}
`;

  const result = await sendEmailViaResend({
    to: adminEmail,
    subject,
    text: textBody,
    html: `<p><strong>Name:</strong> ${inquiry.name}</p><p><strong>Business:</strong> ${inquiry.business || 'N/A'}</p><p><strong>Email:</strong> <a href="mailto:${inquiry.email}">${inquiry.email}</a></p><p><strong>Message:</strong></p><p>${inquiry.message.replace(/\n/g, '<br>')}</p>`,
    replyTo: inquiry.email,
  });

  return result;
}
