import React from 'react';
import { ArrowRight, Play, Shield, Sparkles, CheckCircle2, Wifi, QrCode, Truck, Smartphone } from 'lucide-react';
import { CardMockup3D } from './CardMockup3D';

interface HeroProps {
  onOpenOrder: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenOrder }) => {
  return (
    <section id="hero-section" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Subtle architectural background gradients - modern SaaS style (Linear/Stripe inspired) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-zinc-200/40 via-zinc-100/30 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-sky-100/30 rounded-full blur-2xl" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(#000000 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Content */}
          <div className="lg:col-span-7 flex flex-col text-left">
            {/* Subtle product tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200/80 shadow-xs w-fit mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                U.S. Local Business Hardware
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 leading-[1.08]">
              Make It Easier for Customers to Leave a Google Review.
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 leading-relaxed max-w-2xl font-normal">
              Your customers already love your business. RevTap makes it incredibly simple for them to find your Google review page with one tap — or a quick QR scan.
            </p>

            {/* CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                id="hero-primary-cta"
                onClick={onOpenOrder}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-zinc-950 text-white font-semibold text-base hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
              >
                <span>GET MY REVIEW CARD</span>
                <ArrowRight className="w-5 h-5 text-zinc-300" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-zinc-800 font-semibold text-base border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all shadow-xs"
              >
                <span>SEE HOW IT WORKS</span>
              </a>
            </div>

            {/* Small Trust Line below CTA */}
            <div className="mt-8 pt-6 border-t border-zinc-200/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm font-medium text-zinc-600">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-zinc-900 rotate-90" />
                <span>NFC + QR</span>
              </div>
              <span className="text-zinc-300">•</span>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-zinc-900" />
                <span>No App Required</span>
              </div>
              <span className="text-zinc-300">•</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-zinc-900" />
                <span>Custom Branded</span>
              </div>
              <span className="text-zinc-300">•</span>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-zinc-900" />
                <span>U.S. Delivery</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual: 3D Mockup on Realistic Business Counter */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-full max-w-[420px] rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-zinc-100/80 to-zinc-200/40 border border-zinc-200/60 shadow-xl overflow-hidden backdrop-blur-xs">
              {/* Countertop wood texture simulation & subtle lighting */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-zinc-300/40 via-zinc-200/20 to-transparent -z-10 rounded-b-3xl" />

              {/* Interactive prompt tag */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-white/90 px-3 py-1 rounded-full border border-zinc-200 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-zinc-700" /> Hover to tilt in 3D
                </span>
              </div>

              {/* 3D Interactive Card Component */}
              <CardMockup3D businessName="The Artisanal Roastery" />

              {/* Countertop reflection footer */}
              <div className="text-center mt-6 pt-3 border-t border-zinc-200/60">
                <p className="text-xs text-zinc-500 font-medium">
                  Matte black acrylic sign • Encoded NFC chip • Crisp QR fallback
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
