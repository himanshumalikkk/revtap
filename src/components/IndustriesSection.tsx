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
          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Versatile Placements
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight mt-2">
            Built for Businesses That Rely on Local Reputation.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            From busy downtown coffee counters to professional healthcare practices, RevTap fits seamlessly where your customers wrap up their visits.
          </p>
        </div>

        {/* 10 Industry Cards */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
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
                  <h3 className="text-sm font-bold text-zinc-950 tracking-tight">
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-all shadow-xs cursor-pointer"
          >
            <span>SEE HOW REV TAP FITS YOUR BUSINESS →</span>
          </button>
        </div>
      </div>
    </section>
  );
};
