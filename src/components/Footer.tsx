import React from 'react';
import { Wifi, ShieldCheck, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  onOpenContact: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenContact,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAdmin,
}) => {
  return (
    <footer id="main-footer" className="bg-zinc-950 text-white pt-16 pb-12 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-zinc-800/80">
          {/* Brand Column */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold">
                <Wifi className="w-4 h-4 rotate-90" />
              </div>
              <span className="font-display text-xl font-extrabold tracking-tight text-white">
                Rev<span className="text-zinc-400">Tap</span>
              </span>
            </div>
            <p className="font-display text-base sm:text-lg text-zinc-200 font-semibold max-w-md tracking-tight">
              Turn Every Customer Into an Easy Review Opportunity.
            </p>
            <p className="text-xs sm:text-[13px] text-zinc-400 max-w-sm leading-relaxed">
              Custom-branded NFC and QR display hardware built to make in-person review collection frictionless for U.S. businesses.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <div className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Navigation
            </div>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#industries" className="hover:text-white transition-colors">
                  Who It's For
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenContact}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="md:col-span-3 space-y-3">
            <div className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
              Legal & Trust
            </div>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <button
                  onClick={onOpenPrivacy}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenTerms}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAdmin}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer text-left text-xs"
                >
                  Merchant Order Management
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Compliance Note & Copyright */}
        <div className="pt-8 space-y-4 text-xs text-zinc-500">
          <p className="leading-relaxed max-w-4xl">
            <strong>Compliance Notice:</strong> RevTap is an independent provider of NFC and QR review signs and is not endorsed by, sponsored by, or affiliated with Google LLC. Google, Google Reviews, and the Google logo are registered trademarks of Google LLC.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-zinc-900/90 text-zinc-400 text-[11px]">
            <div>© {new Date().getFullYear()} RevTap. All rights reserved. U.S. fulfillment.</div>
            <div className="flex items-center gap-4">
              <span>Secure PayPal Checkout</span>
              <span>•</span>
              <span>Encrypted SSL</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
