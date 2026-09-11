import React from 'react';
import { CheckCircle2, ArrowLeft, MessageSquare, ShieldCheck, Mail, FileSpreadsheet, Truck } from 'lucide-react';
import type { OrderRecord } from '../types';

interface SuccessPageProps {
  order: OrderRecord;
  onBackToHome: () => void;
  onContactSupport: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
  order,
  onBackToHome,
  onContactSupport,
}) => {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col justify-center">
      <div className="rounded-3xl bg-white border border-zinc-200/90 p-8 sm:p-12 shadow-xl text-center relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xs animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>

        {/* Main Headings */}
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Payment Confirmed
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mt-3">
          ORDER CONFIRMED
        </h1>
        <p className="mt-2 text-lg text-zinc-600 font-medium">
          Thank you for your RevTap order.
        </p>

        {/* Order Identifier Box */}
        <div className="mt-6 inline-block bg-zinc-50 border border-zinc-200/80 rounded-2xl px-6 py-4">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Order Number
          </div>
          <div className="text-2xl font-mono font-extrabold text-zinc-950 mt-0.5 tracking-tight">
            {order.id}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Package: <strong className="text-zinc-800">{order.packageName}</strong> (${order.total.toFixed(2)} {order.currency})
          </div>
        </div>

        <p className="mt-6 text-sm text-zinc-600 max-w-md mx-auto">
          We've received your information and payment.
        </p>

        {/* What's Next Steps (Exact compliance with spec) */}
        <div className="mt-10 max-w-lg mx-auto text-left rounded-2xl bg-zinc-50/70 border border-zinc-200 p-6">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 mb-4">
            What's next?
          </h3>
          <ol className="space-y-4 text-sm text-zinc-700">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <span className="font-bold text-zinc-950">We verify your order details.</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Our team confirms your Google Review URL ({order.business.businessName}) loads cleanly.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <span className="font-bold text-zinc-950">Your RevTap sign(s) are configured.</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  The NFC chip is programmed and your custom QR code is applied to your hardware.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <span className="font-bold text-zinc-950">Your order is fulfilled and shipped.</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Sent directly to {order.shipping.city}, {order.shipping.state} with tracking.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Customer notification confirmation notice */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-zinc-400" />
            Confirmation email sent to <strong>{order.business.businessEmail}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
            Recorded in fulfillment database
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onBackToHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO REV TAP</span>
          </button>
          <button
            onClick={onContactSupport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-800 font-semibold text-sm hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>CONTACT SUPPORT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
