import React from 'react';
import { Wifi, QrCode, Sparkles, CheckCircle2, Info } from 'lucide-react';

export const ProductBenefits: React.FC = () => {
  const benefits = [
    {
      title: 'ONE-TAP ACCESS',
      description:
        'Customers with compatible NFC phones can tap the sign and open your configured review link.',
      icon: Wifi,
      iconClass: 'rotate-90',
      badge: 'Fastest Route',
    },
    {
      title: 'QR BACKUP',
      description:
        'Every RevTap sign also includes a QR code so customers can scan when they prefer.',
      icon: QrCode,
      badge: 'Universal Support',
    },
    {
      title: 'CUSTOM BRANDED',
      description: 'Use your business name, branding and logo.',
      icon: Sparkles,
      badge: 'Your Identity',
    },
    {
      title: 'READY TO USE',
      description:
        'RevTap configures the sign before fulfillment so the business receives a ready-to-use product.',
      icon: CheckCircle2,
      badge: 'Zero Setup',
    },
  ];

  return (
    <section id="benefits" className="py-20 md:py-28 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Designed for Local Counters
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            One Small Sign. A Simpler Review Experience.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Engineered specifically to eliminate checkout friction and respect your customers' time.
          </p>
        </div>

        {/* 4 Benefit Cards Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl bg-white border border-zinc-200/90 p-7 shadow-xs hover:shadow-md hover:border-zinc-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${b.iconClass || ''}`} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-md">
                      {b.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-[17px] font-bold text-zinc-950 tracking-tight">
                    {b.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] text-zinc-600 leading-[1.6]">
                    {b.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                  <span>Standard on all orders</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Small Notice & Compliance Note */}
        <div className="mt-12 max-w-2xl mx-auto rounded-xl bg-zinc-100/80 border border-zinc-200/80 p-4 flex items-start gap-3 text-xs text-zinc-600">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-zinc-800">
              No app required for the customer.
            </p>
            <p className="text-zinc-500 leading-relaxed">
              NFC response depends on the customer's phone model and hardware settings. RevTap makes reaching your public Google review page easier, but does not manipulate or guarantee customer reviews or ratings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
