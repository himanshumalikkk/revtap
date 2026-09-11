import React from 'react';
import {
  Utensils,
  Coffee,
  Scissors,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Wrench,
  Dumbbell,
  Hotel,
  Home,
  ArrowRight,
} from 'lucide-react';

interface IndustriesSectionProps {
  onOpenOrder: () => void;
}

export const IndustriesSection: React.FC<IndustriesSectionProps> = ({ onOpenOrder }) => {
  const industries = [
    {
      name: 'Restaurants',
      icon: Utensils,
      placement: 'Host stand, payment caddy, or dining tables',
    },
    {
      name: 'Cafés & Coffee Shops',
      icon: Coffee,
      placement: 'Beside the espresso register and pickup station',
    },
    {
      name: 'Barbershops',
      icon: Scissors,
      placement: 'Reception counter or individual barber mirror stations',
    },
    {
      name: 'Salons',
      icon: Sparkles,
      placement: 'Front desk checkout or styling stations',
    },
    {
      name: 'Dentists',
      icon: Stethoscope,
      placement: 'Patient check-out desk and waiting room',
    },
    {
      name: 'Med Spas',
      icon: HeartPulse,
      placement: 'Reception lobby and post-treatment desk',
    },
    {
      name: 'Auto Shops',
      icon: Wrench,
      placement: 'Service advisor counter and invoice clipboard',
    },
    {
      name: 'Gyms & Fitness',
      icon: Dumbbell,
      placement: 'Front check-in turnstile and pro-shop counter',
    },
    {
      name: 'Hotels',
      icon: Hotel,
      placement: 'Concierge, lobby front desk, and key drop box',
    },
    {
      name: 'Home Services',
      icon: Home,
      placement: 'Service vehicle or technician handheld clipboard',
    },
  ];

  return (
    <section id="industries" className="py-20 md:py-28 bg-[#FAFAFA] border-t border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Versatile Placements
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Built for Businesses That Rely on Local Reputation.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            From busy downtown coffee counters to professional healthcare practices, RevTap fits seamlessly where your customers wrap up their visits.
          </p>
        </div>

        {/* Real-world in-situ counter placement card */}
        <div className="mt-12 rounded-3xl bg-white border border-zinc-200/90 p-5 sm:p-8 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 flex flex-col gap-2.5">
            <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-100">
              <img
                src="/src/assets/images/counter_placement_1789160754197.jpg"
                alt="RevTap Google Review NFC Sign on Salon Counter"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/3] object-cover transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 px-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>In-Store Countertop Placement — Situated directly beside checkout POS terminal</span>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em] bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
              The Golden Checkout Moment
            </span>
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
              Right Where Customer Delight Peaks.
            </h3>
            <p className="text-sm sm:text-[15px] text-zinc-600 leading-[1.65]">
              When a customer is completing their transaction, their impression of your business is highest. Placing a RevTap sign right next to your payment terminal removes 100% of the friction between saying "thank you" and posting an honest 5-star Google review.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="text-xs font-bold text-zinc-900">Zero App Friction</div>
                <div className="text-xs text-zinc-500 mt-0.5">Works out-of-the-box with default camera & NFC</div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="text-xs font-bold text-zinc-900">Compact Footprint</div>
                <div className="text-xs text-zinc-500 mt-0.5">Fits beside any Square, Clover, or POS terminal</div>
              </div>
            </div>
          </div>
        </div>

        {/* 10 Industry Cards */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {industries.map((ind, idx) => {
            const Icon = ind.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl bg-white border border-zinc-200/90 p-5 shadow-xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-[15px] font-bold text-zinc-950 tracking-tight">
                    {ind.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                    {ind.placement}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] font-semibold text-zinc-700 flex items-center gap-1 group-hover:text-zinc-950">
                  <span>Custom Branded</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA below */}
        <div className="mt-14 text-center">
          <button
            onClick={onOpenOrder}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-zinc-950 text-white font-bold text-xs sm:text-[13px] tracking-wider uppercase hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
          >
            <span>SEE HOW REV TAP FITS YOUR BUSINESS →</span>
          </button>
        </div>
      </div>
    </section>
  );
};
