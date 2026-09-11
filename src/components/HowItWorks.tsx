import React from 'react';
import { Package, FileText, Cpu, Truck, Smartphone, ArrowRight } from 'lucide-react';

interface HowItWorksProps {
  onOpenOrder: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenOrder }) => {
  const steps = [
    {
      num: '01',
      title: 'CHOOSE YOUR PACK',
      description: 'Select the number of RevTap signs you need.',
      icon: Package,
    },
    {
      num: '02',
      title: 'SUBMIT YOUR BUSINESS DETAILS',
      description: 'Enter your business name, logo, Google Review URL and shipping information.',
      icon: FileText,
    },
    {
      num: '03',
      title: 'WE CONFIGURE YOUR SIGN',
      description: 'Your NFC and QR experience is configured for your business.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'WE SHIP IT',
      description: 'Your RevTap signs are sent to your U.S. shipping address.',
      icon: Truck,
    },
    {
      num: '05',
      title: 'CUSTOMERS TAP OR SCAN',
      description: 'Customers can tap the sign or scan the QR code and reach your review page.',
      icon: Smartphone,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#FAFAFA] border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Frictionless Onboarding
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mt-2">
            From Order to Review in 5 Simple Steps.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            No technical knowledge or mobile app installations required. We handle the setup.
          </p>
        </div>

        {/* 5 Steps Grid / Flow */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative rounded-2xl bg-white border border-zinc-200/90 p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-zinc-300 transition-all duration-200"
              >
                <div>
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black tracking-tight text-zinc-300 group-hover:text-zinc-950 transition-colors font-mono">
                      {step.num}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-xs font-bold tracking-wider text-zinc-950 uppercase">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-medium text-zinc-400">
                  <span>Step {idx + 1} of 5</span>
                  {idx < 4 ? <span className="hidden md:inline">→</span> : <span>Done</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <button
            onClick={onOpenOrder}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
          >
            <span>GET STARTED TODAY</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
