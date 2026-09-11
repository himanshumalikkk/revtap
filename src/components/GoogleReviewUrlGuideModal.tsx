import React from 'react';
import { X, ExternalLink, Copy, Check, Info } from 'lucide-react';

interface GoogleReviewUrlGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleReviewUrlGuideModal: React.FC<GoogleReviewUrlGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedExample, setCopiedExample] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-zinc-200 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            G
          </div>
          <h3 className="text-xl font-bold text-zinc-950">
            How to Find Your Google Review Link
          </h3>
        </div>

        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
          Google provides a direct short link that opens the review box directly on your customers' smartphones. Here is how to locate it in under 60 seconds:
        </p>

        {/* 3 Step Instructions */}
        <div className="space-y-4 text-sm text-zinc-700">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div>
              <div className="font-semibold text-zinc-950">Search for your business on Google</div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Make sure you are signed into the Google account that manages your Google Business Profile.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div>
              <div className="font-semibold text-zinc-950">Click "Ask for reviews"</div>
              <p className="text-xs text-zinc-500 mt-0.5">
                In your business profile dashboard, look for the button labeled <strong>"Ask for reviews"</strong> or <strong>"Get more reviews"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
            <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div>
              <div className="font-semibold text-zinc-950">Copy your Review Link</div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Google will display your direct link, usually formatted like:
              </p>
              <div className="mt-2 p-2 rounded-md bg-white border border-zinc-300 font-mono text-xs text-zinc-800 break-all select-all flex items-center justify-between">
                <span>https://g.page/r/your-business/review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="mt-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Don't worry if you are unsure — our fulfillment team double-checks every review link prior to physical NFC encoding to make sure it loads smoothly on mobile devices.
          </span>
        </div>

        {/* Dismiss Button */}
        <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors"
          >
            Got It, Thanks
          </button>
        </div>
      </div>
    </div>
  );
};
