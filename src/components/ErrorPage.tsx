import React from 'react';
import { AlertCircle, RefreshCw, MessageSquare, ArrowLeft } from 'lucide-react';
import type { OrderRecord } from '../types';

interface ErrorPageProps {
  order?: OrderRecord;
  errorMessage?: string;
  onRetryPayment: () => void;
  onContactSupport: () => void;
  onBackToHome: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  order,
  errorMessage,
  onRetryPayment,
  onContactSupport,
  onBackToHome,
}) => {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto flex flex-col justify-center">
      <div className="rounded-3xl bg-white border border-zinc-200 p-8 sm:p-12 shadow-xl text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-9 h-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
          We couldn't confirm your payment.
        </h1>

        <p className="mt-4 text-base text-zinc-600 leading-relaxed max-w-md mx-auto">
          Your order information has been saved temporarily.
        </p>

        {order && (
          <div className="mt-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left text-xs max-w-md mx-auto space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Order Reference:</span>
              <span className="font-mono font-bold text-zinc-900">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Business Name:</span>
              <span className="font-semibold text-zinc-900">{order.business.businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Selected Package:</span>
              <span className="font-semibold text-zinc-900">{order.packageName} (${order.total.toFixed(2)})</span>
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-zinc-600">
          Please try again or contact RevTap support.
        </p>

        {errorMessage && (
          <p className="mt-2 text-xs text-red-500 font-mono">
            Details: {errorMessage}
          </p>
        )}

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRetryPayment}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-950 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>TRY PAYMENT AGAIN</span>
          </button>
          <button
            onClick={onContactSupport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-zinc-300 text-zinc-800 font-semibold text-sm hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>CONTACT SUPPORT</span>
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={onBackToHome}
            className="text-xs text-zinc-500 hover:text-zinc-800 underline inline-flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};
