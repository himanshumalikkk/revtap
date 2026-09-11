import React from 'react';
import { Settings, Layers, Smartphone, Truck } from 'lucide-react';

export const TrustSection: React.FC = () => {
  const blocks = [
    {
      title: 'CUSTOM CONFIGURATION',
      desc: 'Your business information and review destination are configured for your order.',
      icon: Settings,
    },
    {
      title: 'NFC + QR',
      desc: 'Two easy ways for customers to reach your review page.',
      icon: Layers,
    },
    {
      title: 'NO APP REQUIRED',
      desc: 'Customers do not need to install a RevTap app.',
      icon: Smartphone,
    },
    {
      title: 'U.S. FULFILLMENT',
      desc: 'Orders are fulfilled and shipped to U.S. businesses.',
      icon: Truck,
    },
  ];

  return (
    <section id="trust-section" className="py-20 md:py-28 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Pure Product Reliability
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mt-2">
            Simple for You. Simple for Your Customers.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            Straightforward physical hardware configured before delivery, backed by reliable customer care.
          </p>
        </div>

        {/* 4 Trust Blocks */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {blocks.map((block, idx) => {
            const Icon = block.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-zinc-50 border border-zinc-200/80 p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center mb-5 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-extrabold tracking-wider text-zinc-900 uppercase">
                    {block.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    {block.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-200/60 text-[11px] font-semibold text-zinc-500">
                  Direct Guarantee
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
