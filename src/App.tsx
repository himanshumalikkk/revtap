/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { PackageId, OrderRecord } from './types';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { ProductBenefits } from './components/ProductBenefits';
import { PricingSection } from './components/PricingSection';
import { HowItWorks } from './components/HowItWorks';
import { ProductDemo } from './components/ProductDemo';
import { IndustriesSection } from './components/IndustriesSection';
import { TrustSection } from './components/TrustSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { OrderModal } from './components/OrderModal';
import { SuccessPage } from './components/SuccessPage';
import { ErrorPage } from './components/ErrorPage';
import { ContactModal } from './components/ContactModal';
import { LegalModal } from './components/LegalModals';
import { AdminPortalModal } from './components/AdminPortalModal';

export default function App() {
  // Modal & View States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageId>('business');

  // Post-purchase / status views
  const [activeView, setActiveView] = useState<'landing' | 'success' | 'error'>('landing');
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | undefined>(undefined);

  // Secondary modals
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);

  // Handle URL query parameters on initial page load (e.g., return from PayPal hosted checkout)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const orderIdParam = params.get('order_id');

    if (orderIdParam) {
      // Fetch order details from API
      fetch(`/api/orders/${orderIdParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.order) {
            setCurrentOrder(data.order);
            if (statusParam === 'success' || data.order.status === 'paid') {
              setActiveView('success');
            } else if (statusParam === 'cancel') {
              setActiveView('error');
              setLastErrorMessage('Payment checkout was canceled by user.');
            }
          }
        })
        .catch(() => {
          // ignore lookup errors
        });
    }
  }, []);

  // Handlers for Opening Order Flow
  const handleOpenOrder = (packageId?: PackageId) => {
    if (packageId) {
      setSelectedPackage(packageId);
    }
    setIsOrderModalOpen(true);
  };

  const handleOrderSuccess = (order: OrderRecord) => {
    setCurrentOrder(order);
    setActiveView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderFailure = (order?: OrderRecord, errorMsg?: string) => {
    if (order) setCurrentOrder(order);
    setLastErrorMessage(errorMsg || 'Unable to confirm payment transaction.');
    setActiveView('error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetryPayment = () => {
    setActiveView('landing');
    setIsOrderModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Sticky Header */}
      <Header
        onOpenOrder={() => handleOpenOrder('business')}
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
      />

      {/* Main View Switching: Landing vs Success vs Error */}
      {activeView === 'landing' && (
        <main>
          {/* Hero Section with 3D Tilt Card Mockup */}
          <Hero onOpenOrder={() => handleOpenOrder('business')} />

          {/* Problem / Value Comparison Section */}
          <ProblemSection />

          {/* Product Benefits (4 cards) */}
          <ProductBenefits />

          {/* Pricing Section (Starter $59.99, Business $99.99, Growth $199.99) */}
          <PricingSection onSelectPackage={(pkg) => handleOpenOrder(pkg)} />

          {/* How It Works (5 steps) */}
          <HowItWorks onOpenOrder={() => handleOpenOrder('business')} />

          {/* Product Demonstration (Tap. Open. Review. + QR Fallback) */}
          <ProductDemo />

          {/* Industries Section (10 cards) */}
          <IndustriesSection onOpenOrder={() => handleOpenOrder('business')} />

          {/* Trust Section (4 blocks, no fake claims) */}
          <TrustSection />

          {/* FAQ Section (5 exact questions) */}
          <FaqSection onOpenOrder={() => handleOpenOrder('business')} />
        </main>
      )}

      {activeView === 'success' && currentOrder && (
        <SuccessPage
          order={currentOrder}
          onBackToHome={() => setActiveView('landing')}
          onContactSupport={() => setIsContactModalOpen(true)}
        />
      )}

      {activeView === 'error' && (
        <ErrorPage
          order={currentOrder || undefined}
          errorMessage={lastErrorMessage}
          onRetryPayment={handleRetryPayment}
          onContactSupport={() => setIsContactModalOpen(true)}
          onBackToHome={() => setActiveView('landing')}
        />
      )}

      {/* Footer */}
      <Footer
        onOpenContact={() => setIsContactModalOpen(true)}
        onOpenPrivacy={() => setLegalModalType('privacy')}
        onOpenTerms={() => setLegalModalType('terms')}
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
      />

      {/* Order Flow Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        initialPackageId={selectedPackage}
        onOrderSuccess={handleOrderSuccess}
        onOrderFailure={handleOrderFailure}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* Privacy Policy & Terms of Service Modals */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      {/* Merchant Order Management & Sheets Sync Portal */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
      />
    </div>
  );
}

