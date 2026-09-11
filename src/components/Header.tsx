import React, { useState, useEffect } from 'react';
import { Wifi, Menu, X, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onOpenOrder: () => void;
  onOpenContact: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOrder,
  onOpenContact,
  onOpenAdmin,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Hardware', href: '#hardware-showcase' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: "Who It's For", href: '#industries' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-zinc-200/80 shadow-xs py-3.5'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Wordmark */}
        <a
          href="#"
          className="flex items-center gap-2.5 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
            <Wifi className="w-4 h-4 rotate-90 text-zinc-100" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-[-0.03em] text-zinc-950">
              Rev<span className="text-zinc-500 font-semibold">Tap</span>
            </span>
          </div>
        </a>

        {/* Center/Right Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-[14px] font-medium tracking-normal text-zinc-600 hover:text-zinc-950 transition-colors"
            >
              {link.name}
            </a>
          ))}
          <button
            onClick={onOpenContact}
            className="text-[14px] font-medium tracking-normal text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Contact
          </button>
        </nav>

        {/* Right CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenOrder}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 text-white text-[13px] font-bold tracking-wider uppercase hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-zinc-950 cursor-pointer"
          >
            <span>GET YOUR CARD</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-zinc-200 px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-base font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                {link.name}
              </a>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenContact();
              }}
              className="text-left px-3 py-2 rounded-lg text-base font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
            >
              Contact
            </button>
          </div>
          <div className="pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenOrder();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors"
            >
              <span>GET YOUR CARD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
