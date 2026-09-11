import React, { useState } from 'react';
import { Search, MapPin, Eye, MousePointerClick, XCircle, CheckCircle, Wifi, ArrowDown, ChevronRight, AlertCircle } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'both' | 'without' | 'with'>('both');

  const withoutSteps = [
    { title: 'Customer wants to review', desc: 'Inspired by great service at checkout' },
    { title: 'Searches your business', desc: 'Opens phone browser or Google app' },
    { title: 'Finds Google profile', desc: 'Sifts through similarly named businesses' },
    { title: 'Finds reviews', desc: 'Scrolls past photos, overview, and directions' },
    { title: 'Finds review button', desc: 'Locates the small star rating button' },
    { title: 'Maybe leaves', desc: 'High drop-off rate after 6 cumbersome steps', isDropoff: true },
  ];

  const withSteps = [
    { title: 'Customer taps', desc: 'Holds phone near the RevTap counter sign', isFast: true },
    { title: 'Google review page opens', desc: 'Direct 1-tap deep link to your actual review box', isFast: true },
    { title: 'Customer leaves an honest review', desc: 'Smooth, 5-second experience before they walk away', isComplete: true },
  ];

  return (
    <section id="problem-section" className="py-20 md:py-28 bg-white border-y border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
            Friction vs. Flow
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Your Customers Shouldn't Have to Search for You.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Even your most satisfied customers often don't leave a review because the traditional search-and-browse flow takes too many steps.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
          {/* Column 1: WITHOUT REV TAP */}
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    The Old Way
                  </span>
                  <h3 className="font-display text-xl font-bold tracking-tight text-zinc-900 mt-0.5">
                    Without RevTap
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-100/70 text-red-700 text-xs font-semibold">
                  6 Steps • High Friction
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {withoutSteps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3.5">
                    {/* Step number / indicator */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          step.isDropoff
                            ? 'bg-red-100 text-red-600 border border-red-200'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {step.isDropoff ? <XCircle className="w-4 h-4" /> : idx + 1}
                      </div>
                      {idx < withoutSteps.length - 1 && (
                        <div className="w-0.5 h-6 bg-zinc-200 my-1" />
                      )}
                    </div>

                    <div className="pt-0.5">
                      <div
                        className={`text-sm font-semibold ${
                          step.isDropoff ? 'text-red-600 font-bold' : 'text-zinc-800'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-200/80 bg-red-50/50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 text-center">
              <span className="text-xs font-semibold text-red-700">
                Result: Most customers abandon before submitting
              </span>
            </div>
          </div>

          {/* Column 2: WITH REV TAP */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 flex flex-col justify-between text-white relative shadow-xl overflow-hidden">
            {/* Subtle glow highlight */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sky-400">
                    The Modern Flow
                  </span>
                  <h3 className="font-display text-xl font-bold tracking-tight text-white mt-0.5">
                    With RevTap
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 3 Steps • Instant
                </span>
              </div>

              <div className="mt-8 space-y-6">
                {withSteps.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          step.isComplete
                            ? 'bg-emerald-500 text-white'
                            : 'bg-zinc-800 text-sky-300 border border-zinc-700'
                        }`}
                      >
                        {step.isComplete ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      {idx < withSteps.length - 1 && (
                        <div className="w-0.5 h-10 bg-zinc-800 my-1" />
                      )}
                    </div>

                    <div className="pt-1">
                      <div className="text-base font-bold text-white flex items-center gap-2">
                        {step.title}
                        {idx === 0 && <Wifi className="w-4 h-4 text-sky-400 rotate-90" />}
                      </div>
                      <div className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 pt-4 border-t border-zinc-800 bg-zinc-950/60 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-4 text-center">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Result: Zero friction, honest feedback at the moment of delight
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
