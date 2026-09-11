import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center">
              {type === 'privacy' ? <Shield className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <h3 className="text-xl font-bold text-zinc-950">
              {type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="py-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-600 leading-relaxed">
          {type === 'privacy' ? (
            <>
              <p>
                <strong>Last Updated: September 2026</strong>
              </p>
              <p>
                At RevTap ("we," "us," or "our"), we respect your privacy and are committed to protecting the information of the businesses and merchants who purchase our NFC and QR review signs.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">1. Information We Collect</h4>
              <p>
                When you place an order on RevTap, we collect information necessary to fulfill your hardware order: your business name, contact name, email address, phone number, U.S. shipping address, uploaded business logo, and Google Review destination link.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">2. Payment Security</h4>
              <p>
                We do not collect or store full credit card or PayPal credentials on RevTap servers. All payments are processed through PayPal's secure, PCI-compliant hosted infrastructure.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">3. How Information is Used</h4>
              <p>
                Your information is used solely to configure, print, program, and physically ship your RevTap hardware. Internal fulfillment logs are synced with our secure fulfillment tracking sheets for manufacturing dispatch. We do not sell your personal data to third-party advertisers.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">4. Contact</h4>
              <p>
                For privacy inquiries or data removal requests, contact our team through our support portal or email <span className="font-mono text-zinc-900">support@revtap.com</span>.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>Last Updated: September 2026</strong>
              </p>
              <p>
                By placing an order on RevTap, you agree to these Terms of Service. RevTap sells custom-configured physical NFC and QR signs designed to simplify in-person review collection for U.S. businesses.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">1. Hardware & Configuration</h4>
              <p>
                RevTap configures your sign with the Google Review link and logo you supply during checkout. The merchant is responsible for ensuring the submitted Google review link and branding assets belong to their licensed entity.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">2. Google LLC Trademark & Policy Compliance</h4>
              <p>
                RevTap is an independent provider of NFC and QR signs and is not affiliated with, endorsed by, or sponsored by Google LLC. Google and Google Reviews are trademarks of Google LLC. RevTap does not guarantee reviews or ratings. In accordance with Google's policies, RevTap does not support or practice review gating, filtering, or selective solicitation. Reviews reflect authentic customer experiences.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">3. Fulfillment & Returns</h4>
              <p>
                Custom signs are programmed and shipped within 3–7 business days to valid U.S. addresses. Defective hardware is eligible for free replacement within 30 days of receipt upon contacting support.
              </p>
              <h4 className="font-bold text-zinc-950 text-sm">4. Governing Law</h4>
              <p>
                These terms are governed by the laws of the United States.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
