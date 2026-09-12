import React, { useState, useRef } from 'react';
import { Wifi, QrCode, Star, ShieldCheck } from 'lucide-react';

interface CardMockup3DProps {
  businessName?: string;
  logoUrl?: string;
  className?: string;
  compact?: boolean;
}

export const CardMockup3D: React.FC<CardMockup3DProps> = ({
  businessName = 'The Artisanal Roastery',
  logoUrl,
  className = '',
  compact = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subtle natural tilt angles (max +/- 14 degrees)
    const newRotateY = ((x - centerX) / centerX) * 14;
    const newRotateX = -((y - centerY) / centerY) * 14;

    setRotateX(newRotateX);
    setRotateY(newRotateY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <div
      className={`relative select-none perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D Container with gentle transition */}
      <div
        ref={cardRef}
        className="relative mx-auto transition-transform duration-200 ease-out preserve-3d"
        style={{
          transform: isHovered
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`
            : 'rotateX(8deg) rotateY(-10deg) translateY(0px)',
          width: compact ? '270px' : '320px',
          maxWidth: '100%',
        }}
      >
        {/* Realistic Card Surface */}
        <div
          className={`relative rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-white shadow-2xl border border-zinc-700/60 overflow-hidden flex flex-col justify-between ${
            compact ? 'p-4 min-h-[420px]' : 'p-6 min-h-[470px]'
          }`}
          style={{
            boxShadow: isHovered
              ? '0 30px 60px -12px rgba(0,0,0,0.45), 0 18px 36px -18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
              : '0 20px 40px -10px rgba(0,0,0,0.35), 0 12px 24px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          {/* Subtle reflection overlay moving with tilt */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
            style={{
              background: `linear-gradient(${120 + rotateY * 2}deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 40%, transparent 80%)`,
            }}
          />

          {/* Top Brand & NFC Indicator */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">
                REV<span className="text-zinc-400">TAP</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                NFC + QR
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="text-[10px] tracking-wide font-medium">TAP HERE</span>
              <div className="w-6 h-6 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-300">
                <Wifi className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>

          {/* Center Business Identity & Tap Callout */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto py-2">
            {/* Custom Logo or Default Icon */}
            <div className={`rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center p-1.5 mb-2 shadow-inner overflow-hidden shrink-0 ${
              compact ? 'w-11 h-11' : 'w-14 h-14'
            }`}>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-zinc-700/70 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                  {businessName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <h4 className="font-bold text-sm sm:text-base text-white tracking-tight truncate max-w-[230px] px-1">
              {businessName}
            </h4>

            {/* Google Rating indication (compliant neutral presentation) */}
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-zinc-800/70 border border-zinc-700/50 text-[11px] text-zinc-300 shrink-0">
              <span className="font-medium text-white text-[10px] sm:text-[11px]">Review us on</span>
              <span className="font-semibold text-[#4285F4]">G</span>
              <span className="font-semibold text-[#EA4335]">o</span>
              <span className="font-semibold text-[#FBBC05]">o</span>
              <span className="font-semibold text-[#4285F4]">g</span>
              <span className="font-semibold text-[#34A853]">l</span>
              <span className="font-semibold text-[#EA4335]">e</span>
            </div>

            {/* NFC Tap Target Graphic */}
            <div className="flex flex-col items-center mt-3 shrink-0">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-14 h-14 rounded-full border border-zinc-700/40 animate-ping opacity-25" />
                <div className={`rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-zinc-600/70 flex flex-col items-center justify-center shadow-lg ${
                  compact ? 'w-12 h-12' : 'w-14 h-14'
                }`}>
                  <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200 rotate-90" />
                </div>
              </div>
              <span className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-200">
                Tap to Review
              </span>
            </div>
          </div>

          {/* Bottom QR Fallback section */}
          <div className="relative z-10 mt-auto pt-2.5 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
            <div className="text-left pr-2">
              <div className="text-[10px] text-zinc-400 font-medium leading-tight">
                No NFC on phone?
              </div>
              <div className="text-xs font-semibold text-zinc-200">
                Scan QR Code
              </div>
            </div>

            {/* QR Mockup */}
            <div className="w-9 h-9 bg-white p-1 rounded-md flex items-center justify-center shadow-sm shrink-0">
              <QrCode className="w-full h-full text-black" />
            </div>
          </div>
        </div>

        {/* Realistic Acrylic Stand Base */}
        <div
          className="mx-auto mt-[-8px] rounded-b-xl bg-gradient-to-b from-zinc-800/90 to-zinc-900/95 border-t border-zinc-600/40 border-b border-zinc-950 p-2 shadow-xl"
          style={{
            width: compact ? '210px' : '250px',
            boxShadow: '0 25px 35px -5px rgba(0,0,0,0.5)',
          }}
        >
          <div className="h-2 w-full bg-zinc-950/60 rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
};
