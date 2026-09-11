import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

interface FaqSectionProps {
  onOpenOrder: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onOpenOrder }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Do customers need to download an app?',
      a: 'No. Compatible smartphones can tap using built-in NFC or scan the QR code using their default camera app.',
    },
    {
      q: 'Does RevTap guarantee positive reviews?',
      a: 'No. RevTap is a tool designed to make leaving a review easier and faster for your customers. Google policies require honest, un-gated reviews.',
    },
    {
      q: 'Can I change my Google review link later?',
      a: 'Yes. Contact RevTap support or request an update if your business link changes.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Orders are typically configured and shipped to U.S. addresses within 3–7 business days depending on location and order volume.',
    },
    {
      q: 'What phones are compatible?',
      a: 'Most modern iPhones and Android smartphones support NFC and QR scanning. Older devices can easily use the QR code.',
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#FAFAFA] border-t border-zinc-200/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Frequently Asked Questions
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Everything You Need to Know.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Straightforward answers about our hardware, compatibility, and ordering process.
          </p>
        </div>

        {/* Accordion list */}
        <div className="mt-14 space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-zinc-200/90 shadow-2xs overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 cursor-pointer"
                >
                  <span className="font-display text-base sm:text-[17px] font-bold text-zinc-950 tracking-tight pr-4">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-700 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-zinc-900 text-white' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-[15px] text-zinc-600 leading-[1.65] border-t border-zinc-100 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom prompt */}
        <div className="mt-12 text-center">
          <p className="text-xs sm:text-[13px] text-zinc-500 font-medium">
            Ready to streamline your customer review collection?
          </p>
          <button
            onClick={onOpenOrder}
            className="mt-4 inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-zinc-950 text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            <span>GET YOUR REV TAP CARD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
