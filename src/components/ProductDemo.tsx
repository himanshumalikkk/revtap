import React, { useState } from 'react';
import { Wifi, QrCode, Star, ArrowRight, Smartphone, Check, Sparkles, AlertCircle } from 'lucide-react';
import { phoneTapActionImg } from '../assets/images';

export const ProductDemo: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'nfc' | 'qr'>('nfc');
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <section id="demo-section" className="py-20 md:py-28 bg-white border-t border-zinc-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            In-Store Experience
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Tap. Open. Review.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Witness how effortless customer reviews become right at your checkout desk or tabletop.
          </p>

          {/* Mode Switcher (NFC vs QR) */}
          <div className="mt-8 inline-flex p-1 rounded-xl bg-zinc-100 border border-zinc-200/80">
            <button
              onClick={() => setActiveMode('nfc')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'nfc'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 rotate-90" />
              <span>NFC Tap Experience</span>
            </button>
            <button
              onClick={() => setActiveMode('qr')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'qr'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Scan Backup</span>
            </button>
          </div>
        </div>

        {/* Visual Sequence Card */}
        <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-zinc-950 text-white border border-zinc-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle ambient lighting */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Interactive Step Navigator */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10 pb-6 border-b border-zinc-800">
            {[
              { num: 1, title: activeMode === 'nfc' ? '1. TAP' : '1. SCAN', subtitle: activeMode === 'nfc' ? 'Hold phone to sign' : 'Point camera at QR' },
              { num: 2, title: '2. REVIEW PAGE OPENS', subtitle: 'Direct link launches' },
              { num: 3, title: '3. LEAVE AN HONEST REVIEW', subtitle: 'Customer rates & writes' },
            ].map((step) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                className={`text-left p-3 sm:p-4 rounded-xl transition-all cursor-pointer ${
                  activeStep === step.num
                    ? 'bg-zinc-800/90 border border-zinc-700 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                  {step.title}
                </div>
                <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5 hidden sm:block">
                  {step.subtitle}
                </div>
              </button>
            ))}
          </div>

          {/* Showcase Display Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Realistic Visual or Phone Mockup */}
            <div className="lg:col-span-7 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
              {activeStep === 1 && (
                <div className="w-full flex flex-col gap-3.5">
                  {/* Clean image of customer tapping sign - zero text overlap */}
                  <div className="w-full aspect-[16/10] sm:aspect-[16/9] max-h-[320px] rounded-xl overflow-hidden border border-zinc-700/80 bg-black shadow-inner shrink-0">
                    <img
                      src={phoneTapActionImg}
                      alt="Customer tapping smartphone on RevTap sign"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center rounded-xl"
                    />
                  </div>

                  {/* Clean status indicator strictly below the image */}
                  <div className="w-full rounded-xl bg-zinc-800/90 border border-zinc-700/80 p-3.5 flex items-center gap-3 shadow-xs">
                    <div className="w-9 h-9 rounded-lg bg-zinc-700 text-amber-400 flex items-center justify-center shrink-0 border border-zinc-600/60">
                      {activeMode === 'nfc' ? (
                        <Wifi className="w-5 h-5 rotate-90" />
                      ) : (
                        <QrCode className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white tracking-tight">
                        {activeMode === 'nfc'
                          ? 'Instant Contactless NFC Detection'
                          : 'Camera Scanned Universal QR Code'}
                      </div>
                      <div className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                        Takes less than 1 second • Direct official deep-link
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="w-full max-w-[280px] bg-white text-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-300 text-left animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-200">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      G
                    </div>
                    <span className="text-xs font-semibold text-zinc-700">Google Reviews</span>
                  </div>
                  <div className="text-sm font-bold text-zinc-950">The Artisanal Roastery</div>
                  <div className="text-[11px] text-zinc-500">Google Business Profile</div>
                  <div className="mt-4 p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
                    <div className="text-xs font-medium text-zinc-600 mb-1.5">Rate this business</div>
                    <div className="flex justify-center gap-1.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-5 h-5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-zinc-400 text-center">
                    Direct modal overlay loaded via standard deep-link
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="w-full max-w-[300px] bg-white text-zinc-900 rounded-2xl p-5 shadow-xl border border-zinc-300 text-left animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Verified Review
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 italic bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    "Exceptional single-origin pour-over and the friendliest staff in town. Loved tapping the sign to leave this!"
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-medium">David K.</span>
                    <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      Posted to Google <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Explanatory Context & Navigation */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Step {activeStep} of 3
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {activeStep === 1 && (activeMode === 'nfc' ? 'Contactless NFC Tap' : 'QR Code Scan')}
                  {activeStep === 2 && 'Immediate Direct Landing'}
                  {activeStep === 3 && 'Genuine Customer Review'}
                </h3>
                <p className="text-sm text-zinc-400 mt-3 leading-relaxed">
                  {activeStep === 1 &&
                    'The customer simply brings their smartphone within an inch of the sign. Compatible iOS and Android devices instantly trigger the native browser notification.'}
                  {activeStep === 2 &&
                    'No confusing search queries or navigating through Google Maps. The device goes directly to your verified review prompt.'}
                  {activeStep === 3 &&
                    'Customers provide their honest rating and commentary in seconds before leaving your counter.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveStep((prev) => (prev % 3) + 1)}
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-100 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Important Compliance Callout */}
        <div className="mt-8 max-w-3xl mx-auto text-center">
          <p className="text-xs sm:text-sm text-zinc-500 italic">
            "RevTap makes it easier for customers to access your review page. Reviews should reflect the customer's genuine experience."
          </p>
        </div>
      </div>
    </section>
  );
};
