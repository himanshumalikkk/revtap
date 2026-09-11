import React, { useState } from 'react';
import { Wifi, QrCode, ShieldCheck, Sparkles, Check, ArrowRight, Layers, Smartphone } from 'lucide-react';
import type { PackageId } from '../types';
import { hardwareLineupImg } from '../assets/images';

interface HardwareShowcaseProps {
  onOpenOrder: (pkg?: PackageId) => void;
}

export const HardwareShowcase: React.FC<HardwareShowcaseProps> = ({ onOpenOrder }) => {
  const [activeTab, setActiveTab] = useState<'stand' | 'cards' | 'stickers'>('stand');

  const products = [
    {
      id: 'stand' as const,
      title: 'Countertop Acrylic Stand',
      tag: 'Best Seller for Retail & Dining',
      desc: 'Crafted from crystal-clear, shatter-resistant 3mm cast acrylic with diamond-polished edges. Designed to stand firmly at checkout counters, host stations, salon desks, and waiting rooms.',
      specs: [
        'Premium 3mm shatter-resistant cast acrylic',
        'Custom high-definition business branding & Google colors',
        'Pre-programmed NTAG215 NFC chip & scannable QR backup',
        'Weighted anti-slip rubberized footing',
      ],
      idealFor: 'Front desks, checkout counters, café pickup zones, restaurant tables',
    },
    {
      id: 'cards' as const,
      title: 'Pocket NFC Review Cards',
      tag: 'Ideal for Mobile & On-the-Go Teams',
      desc: 'Standard credit-card dimensions (85.6mm × 54mm) with embedded micro-antenna and scratch-resistant matte finish. Easily fits into staff wallets, aprons, or badge holders.',
      specs: [
        'Durable matte PVC waterproof construction',
        'Instant tap on modern iOS & Android devices',
        'High-contrast QR backup on card reverse',
        'Zero apps, zero battery, zero charging required',
      ],
      idealFor: 'HVAC technicians, mobile plumbers, restaurant servers, delivery teams, realtors',
    },
    {
      id: 'stickers' as const,
      title: 'Weatherproof Smart Tap Pucks',
      tag: 'Versatile Surface Mounts',
      desc: 'Compact, round contactless pucks with heavy-duty 3M adhesive backing and UV-resistant resin encapsulation. Mount directly on entrance glass doors, POS terminal sides, or mirror stations.',
      specs: [
        'UV & weather-resistant epoxy resin coating',
        'Industrial-strength 3M non-marking adhesive',
        'Embedded high-speed NFC micro-tag',
        'Designed for high-traffic public touchpoints',
      ],
      idealFor: 'Storefront glass doors, drive-thru windows, barber mirror stations, POS terminals',
    },
  ];

  const currentProduct = products.find((p) => p.id === activeTab) || products[0];

  return (
    <section id="hardware-showcase" className="py-20 md:py-28 bg-white border-t border-zinc-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Commercial-Grade Hardware
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-zinc-950 tracking-[-0.03em] leading-[1.15] mt-2">
            Engineered for Every Customer Touchpoint.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-[1.6]">
            Compare our contactless Google Review hardware suite. Every piece is precision-configured before shipping for plug-and-play simplicity.
          </p>
        </div>

        {/* Big Studio Hardware Lineup Photo */}
        <div className="mt-12 rounded-3xl border border-zinc-200/80 bg-zinc-950 p-5 sm:p-8 shadow-2xl overflow-hidden">
          {/* Clean header above image - completely separated, zero text overlap */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 text-zinc-200 text-xs font-semibold border border-zinc-800 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Complete Contactless Suite
              </span>
              <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                Smart NFC Display Stands, Cards & Tap Pucks
              </h3>
              <p className="text-xs sm:text-[14px] text-zinc-400 mt-2 leading-relaxed">
                Pre-linked to your Google Business Profile. Just unpack, place on your counter, and watch authentic customer reviews roll in.
              </p>
            </div>

            <button
              onClick={() => onOpenOrder('business')}
              className="px-6 py-3.5 rounded-xl bg-white text-zinc-950 text-xs sm:text-[13px] font-bold tracking-wider uppercase hover:bg-zinc-100 active:scale-[0.98] transition-all shrink-0 shadow-lg cursor-pointer"
            >
              Order Business Pack →
            </button>
          </div>

          {/* Unobstructed, pristine photo of hardware suite */}
          <div className="mt-6 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-inner">
            <img
              src={hardwareLineupImg}
              alt="RevTap Smart Google Review Hardware Lineup - Stand, Cards, and Badges"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[480px] object-cover object-center"
            />
          </div>

          {/* Interactive Hardware Selector Tabs */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {products.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => setActiveTab(prod.id)}
                  className={`text-left p-4 rounded-xl transition-all cursor-pointer border ${
                    activeTab === prod.id
                      ? 'bg-zinc-900 border-zinc-700 text-white shadow-md'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70'
                  }`}
                >
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    {prod.tag}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {prod.title}
                  </div>
                </button>
              ))}
            </div>

            {/* Active Hardware Spec Details */}
            <div className="mt-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 text-white grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 rotate-90 text-amber-400" />
                  <span>{currentProduct.title}</span>
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {currentProduct.desc}
                </p>
                <div className="pt-2 text-xs text-zinc-400">
                  <strong className="text-zinc-200">Recommended Placement:</strong> {currentProduct.idealFor}
                </div>
              </div>

              <div className="lg:col-span-5 bg-zinc-950/80 rounded-xl p-4 border border-zinc-800 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Technical Specifications
                </span>
                <ul className="space-y-2">
                  {currentProduct.specs.map((spec, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-zinc-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Metrics / Guarantees below hardware */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Read Distance</div>
            <div className="text-xl font-extrabold text-zinc-950 mt-1">2 – 4 cm</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">Instant Proximity Tap</div>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Chip Lifespan</div>
            <div className="text-xl font-extrabold text-zinc-950 mt-1">100,000+</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">Contactless Reads</div>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Power Source</div>
            <div className="text-xl font-extrabold text-zinc-950 mt-1">Zero Battery</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">Powered by Smartphone RF</div>
          </div>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Compatibility</div>
            <div className="text-xl font-extrabold text-zinc-950 mt-1">100% iOS & Android</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">NFC + Universal QR Scan</div>
          </div>
        </div>
      </div>
    </section>
  );
};
