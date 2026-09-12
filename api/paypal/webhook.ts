import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePayPalWebhookRequest } from '../../server/paypalWebhook';

/**
 * Vercel Serverless Function: POST /api/paypal/webhook
 * Securely handles inbound PayPal Webhook notifications with signature verification
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handlePayPalWebhookRequest(req, res);
}
