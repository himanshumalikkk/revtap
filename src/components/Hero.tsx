import React, { useState } from 'react';
import { ArrowRight, Play, Shield, Sparkles, CheckCircle2, Wifi, QrCode, Truck, Smartphone, Star, Camera, Box } from 'lucide-react';
import { CardMockup3D } from './CardMockup3D';
import { tapStandHeroImg } from '../assets/images';

interface HeroProps {
  onOpenOrder: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenOrder }) => {
  const [viewMode, setViewMode] = useState<'photo' | '3d'>('photo');

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
            {/* Social proof badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200/80 shadow-xs w-fit mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs sm:text-[13px] font-semibold text-zinc-700">
                4.9/5 from 1,200+ U.S. Local Businesses
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold tracking-[-0.035em] text-zinc-950 leading-[1.08]">
              Make It Easier for Customers to Leave a Google Review.
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 text-lg sm:text-[1.2rem] text-zinc-600 leading-[1.65] max-w-2xl font-normal">
              Your customers already love your business. RevTap makes it incredibly simple for them to find your Google review page with one tap — or a quick QR scan.
            </p>

            {/* CTAs */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                id="hero-primary-cta"
                onClick={onOpenOrder}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-zinc-950 text-white font-bold text-sm sm:text-[15px] tracking-wide uppercase hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
              >
                <span>GET MY REVIEW CARD</span>
                <ArrowRight className="w-4 h-4 text-zinc-300" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white text-zinc-800 font-bold text-sm sm:text-[15px] tracking-wide uppercase border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 active:scale-[0.98] transition-all shadow-xs"
              >
                <span>SEE HOW IT WORKS</span>
              </a>
            </div>

            {/* Trust Line below CTA */}
            <div className="mt-8 pt-6 border-t border-zinc-200/70 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-[13px] font-medium text-zinc-600">
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

          {/* Right Hero Visual: Studio Hardware Photography + Interactive 3D Mode */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-full max-w-[440px] rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-zinc-100/90 to-zinc-200/50 border border-zinc-200/80 shadow-2xl overflow-hidden backdrop-blur-xs">
              {/* Mode Switcher */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-zinc-200 shadow-2xs">
                  <button
                    onClick={() => setViewMode('photo')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === 'photo'
                        ? 'bg-zinc-950 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Real Hardware</span>
                  </button>
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === '3d'
                        ? 'bg-zinc-950 text-white shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>3D Interactive</span>
                  </button>
                </div>

                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready to Ship
                </span>
              </div>

              {viewMode === 'photo' ? (
                <div className="rounded-2xl overflow-hidden shadow-lg border border-zinc-200 bg-white flex flex-col">
                  {/* Clean photo without any overlapping text */}
                  <div className="overflow-hidden bg-zinc-100 shrink-0">
                    <img
                      src={tapStandHeroImg}
                      alt="RevTap Google Review NFC Countertop Stand"
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[4/3] object-cover transition-transform duration-500 hover:scale-[1.02] block"
                    />
                  </div>

                  {/* Clean details card placed strictly below the image */}
                  <div className="p-4 bg-white border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div>
                      <div className="font-display text-zinc-950 font-bold text-sm flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 rotate-90 text-amber-500" />
                        <span>RevTap Acrylic Counter Stand</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        Diamond-polished acrylic • Pre-encoded NFC chip • QR fallback
                      </p>
                    </div>
                    <button
                      onClick={onOpenOrder}
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <div className="text-center mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-white/90 px-3 py-1 rounded-full border border-zinc-200 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-zinc-700" /> Move cursor to rotate
                    </span>
                  </div>
                  <CardMockup3D businessName="The Artisanal Roastery" />
                </div>
              )}

              {/* Countertop reflection footer */}
              <div className="text-center mt-4 pt-3 border-t border-zinc-200/60">
                <p className="text-xs text-zinc-500 font-medium">
                  Compatible with 100% of modern Apple iOS & Android smartphones
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
