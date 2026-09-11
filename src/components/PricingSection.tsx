import React from 'react';
import { Check, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import type { PackageId } from '../types';
import { tapStandHeroImg, hardwareLineupImg } from '../assets/images';

interface PricingSectionProps {
  onSelectPackage: (packageId: PackageId) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPackage }) => {
  const plans = [
    {
      id: 'starter' as PackageId,
      name: 'STARTER PACK',
      signText: '1 NFC Review Sign',
      price: '$59.99',
      paymentNote: 'One-time payment',
      isPopular: false,
      ctaText: 'GET STARTER PACK →',
      includes: [
        '1 custom NFC Review Sign',
        'QR code backup',
        'Google review link setup',
        'Custom business branding',
        'Configured before fulfillment',
        'U.S. delivery',
      ],
    },
    {
      id: 'business' as PackageId,
      name: 'BUSINESS PACK',
      badge: 'MOST POPULAR',
      signText: '2 NFC Review Signs',
      price: '$99.99',
      paymentNote: 'One-time payment',
      isPopular: true,
      ctaText: 'GET BUSINESS PACK →',
      includes: [
        '2 custom NFC Review Signs',
        'QR code backup',
        'Google review link setup',
        'Custom business branding',
        'Configured before fulfillment',
        'U.S. delivery',
      ],
    },
    {
      id: 'growth' as PackageId,
      name: 'GROWTH PACK',
      signText: '5 NFC Review Signs',
      price: '$199.99',
      paymentNote: 'One-time payment',
      isPopular: false,
      ctaText: 'GET GROWTH PACK →',
      includes: [
        '5 custom NFC Review Signs',
        'QR code backup',
        'Google review link setup',
        'Custom business branding',
        'Configured before fulfillment',
        'U.S. delivery',
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Simple, Transparent Pricing
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Choose the Pack That Fits Your Business.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Start with one location or equip your entire customer-facing team. No recurring monthly fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                plan.isPopular
                  ? 'bg-zinc-900 text-white border-2 border-zinc-950 shadow-xl md:-translate-y-2 p-8'
                  : 'bg-zinc-50/70 text-zinc-900 border border-zinc-200/90 shadow-xs hover:border-zinc-300 p-7'
              }`}
            >
              {/* Badge for Business Pack */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white text-zinc-950 border border-zinc-300 text-[11px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  {plan.badge}
                </div>
              )}

              <div>
                {/* Plan Title & Hardware spec */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3
                      className={`font-display text-xs sm:text-sm font-extrabold tracking-[0.12em] uppercase truncate ${
                        plan.isPopular ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="mt-1 text-base font-bold tracking-tight">
                      {plan.signText}
                    </div>
                  </div>

                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-200/40 shrink-0 shadow-xs">
                    <img
                      src={plan.id === 'starter' ? tapStandHeroImg : hardwareLineupImg}
                      alt={plan.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Price Display */}
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-black tracking-[-0.035em]">
                    {plan.price}
                  </span>
                </div>
                <div
                  className={`text-xs font-medium mt-1 ${
                    plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {plan.paymentNote}
                </div>

                {/* Divider */}
                <div
                  className={`my-6 border-t ${
                    plan.isPopular ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                />

                {/* Feature List */}
                <div className="space-y-3">
                  <div
                    className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
                      plan.isPopular ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    Includes:
                  </div>
                  {plan.includes.map((inc, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.isPopular
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={
                          plan.isPopular ? 'text-zinc-200 font-medium' : 'text-zinc-700 font-medium'
                        }
                      >
                        {inc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                <button
                  id={`select-plan-${plan.id}`}
                  onClick={() => onSelectPackage(plan.id)}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-[13px] tracking-wider uppercase transition-all shadow-xs cursor-pointer ${
                    plan.isPopular
                      ? 'bg-white text-zinc-950 hover:bg-zinc-100 active:scale-[0.98]'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98]'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footnote on fulfillment */}
        <div className="mt-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-zinc-400" /> Free Standard U.S. Shipping
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-zinc-400" /> Secure Checkout via PayPal
          </span>
        </div>
      </div>
    </section>
  );
};
