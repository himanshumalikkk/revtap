import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  Image as ImageIcon,
  HelpCircle,
  ShieldCheck,
  Lock,
  Truck,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { PackageId, BusinessInfo, ShippingInfo, OrderRecord } from '../types';
import { CardMockup3D } from './CardMockup3D';
import { GoogleReviewUrlGuideModal } from './GoogleReviewUrlGuideModal';
import { tapStandHeroImg } from '../assets/images';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPackageId?: PackageId;
  onOrderSuccess: (order: OrderRecord) => void;
  onOrderFailure: (order?: OrderRecord, error?: string) => void;
}

const PACKAGES: Record<
  PackageId,
  { name: string; signsCount: number; price: number; description: string; isPopular?: boolean }
> = {
  starter: {
    name: 'Starter Pack',
    signsCount: 1,
    price: 59.99,
    description: '1 custom NFC Review Sign for a single customer checkout point.',
  },
  business: {
    name: 'Business Pack',
    signsCount: 2,
    price: 99.99,
    description: '2 custom NFC Review Signs for high-traffic or dual counters.',
    isPopular: true,
  },
  growth: {
    name: 'Growth Pack',
    signsCount: 5,
    price: 199.99,
    description: '5 custom NFC Review Signs for multiple rooms, tables, or locations.',
  },
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  initialPackageId = 'business',
  onOrderSuccess,
  onOrderFailure,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPackage, setSelectedPackage] = useState<PackageId>(initialPackageId);

  // Business Information State
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: '',
    businessWebsite: '',
    businessEmail: '',
    businessPhone: '',
    googleReviewUrl: '',
    logoDataUrl: '',
    logoFileName: '',
    brandingNotes: '',
  });

  // Shipping Information State
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    fullName: '',
    shippingBusinessName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'CA',
    zipCode: '',
    country: 'United States',
  });

  // UI helpers
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showUrlGuide, setShowUrlGuide] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPackageId) {
      setSelectedPackage(initialPackageId);
    }
  }, [initialPackageId]);

  if (!isOpen) return null;

  const currentPkg = PACKAGES[selectedPackage];

  // Handle Logo Upload (Client base64 for real-time live preview & server order record)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: 'Logo file size must be under 8MB' }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, logo: 'Please upload a valid image file (PNG, JPG, SVG)' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setBusinessInfo((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        logoFileName: file.name,
      }));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.logo;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  // Step 2 Validation (Business Details)
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!businessInfo.businessName.trim()) {
      newErrors.businessName = 'Business name is required.';
    }
    if (!businessInfo.businessEmail.trim()) {
      newErrors.businessEmail = 'Business email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessInfo.businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email address.';
    }

    let reviewUrl = businessInfo.googleReviewUrl.trim();
    if (!reviewUrl) {
      newErrors.googleReviewUrl = 'Google Review link is required.';
    } else if (!/^https?:\/\//i.test(reviewUrl)) {
      reviewUrl = `https://${reviewUrl}`;
      setBusinessInfo((prev) => ({ ...prev, googleReviewUrl: reviewUrl }));
    }

    if (!businessInfo.logoDataUrl && !logoPreview) {
      newErrors.logo = 'Please upload your business logo for custom sign printing.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation (Shipping Info)
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!shippingInfo.fullName.trim()) {
      newErrors.fullName = 'Full shipping recipient name is required.';
    }
    if (!shippingInfo.addressLine1.trim()) {
      newErrors.addressLine1 = 'Street address is required.';
    }
    if (!shippingInfo.city.trim()) {
      newErrors.city = 'City is required.';
    }
    if (!shippingInfo.state.trim()) {
      newErrors.state = 'State is required.';
    }
    if (!shippingInfo.zipCode.trim() || !/^\d{5}(-\d{4})?$/.test(shippingInfo.zipCode.trim())) {
      newErrors.zipCode = 'Valid 5-digit U.S. ZIP code is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (validateStep2()) {
        // Pre-fill shipping business name if empty
        if (!shippingInfo.shippingBusinessName) {
          setShippingInfo((prev) => ({ ...prev, shippingBusinessName: businessInfo.businessName }));
        }
        setStep(3);
      }
    } else if (step === 3) {
      if (validateStep3()) {
        setStep(4);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  // Submit Order and redirect directly to PayPal Live REST Checkout
  const handleProceedToPayment = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setRedirectUrl(null);

    try {
      const payload = {
        packageId: selectedPackage,
        business: businessInfo,
        shipping: shippingInfo,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let resData: any = null;
      try {
        resData = await response.json();
      } catch {
        const text = await response.text().catch(() => '');
        resData = { error: text || `Server error (${response.status})` };
      }

      if (!response.ok) {
        throw new Error(resData?.error || `Order creation failed (HTTP ${response.status}). Please review your details and try again.`);
      }

      const targetUrl = resData?.approvalUrl || resData?.paymentLink;
      if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('https://')) {
        throw new Error('PayPal did not return a valid checkout approval URL. Please try again.');
      }

      setIsRedirecting(true);
      setRedirectUrl(targetUrl);

      // Immediately transfer customer to PayPal Live Checkout
      window.location.href = targetUrl;
    } catch (err: any) {
      console.error('[PayPal Checkout Error]:', err);
      setSubmitError(err.message || 'An error occurred while connecting to PayPal. Please try again.');
      setIsSubmitting(false);
      setIsRedirecting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl my-auto rounded-3xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-200/90 flex items-center justify-between bg-zinc-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-black text-zinc-950 text-lg tracking-tight">
                REV<span className="text-zinc-500">TAP</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-200/70 font-semibold text-zinc-700">
                U.S. Custom Order
              </span>
            </div>

            {/* Step Progress Indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-zinc-500">
              <span className={step >= 1 ? 'text-zinc-950 font-bold' : ''}>1. Pack</span>
              <span>→</span>
              <span className={step >= 2 ? 'text-zinc-950 font-bold' : ''}>2. Business</span>
              <span>→</span>
              <span className={step >= 3 ? 'text-zinc-950 font-bold' : ''}>3. Shipping</span>
              <span>→</span>
              <span className={step === 4 ? 'text-zinc-950 font-bold' : ''}>4. Summary</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-200/60 transition-colors"
              aria-label="Close order modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1">
            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Unable to process order</div>
                  <p className="text-xs mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* ============================================================
                STEP 1: PACKAGE SELECTION
               ============================================================ */}
            {step === 1 && (
              <div>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-extrabold text-zinc-950 tracking-tight">
                      Step 1: Choose Your RevTap Pack
                    </h3>
                    <p className="text-sm text-zinc-600 mt-1">
                      Select the quantity of custom NFC + QR signs configured for your location.
                    </p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 shrink-0">
                    <img
                      src={tapStandHeroImg}
                      alt="Sign preview"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-lg object-cover border border-zinc-200"
                    />
                    <span className="text-xs font-semibold text-zinc-700">Pre-Configured U.S. Hardware</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(PACKAGES) as PackageId[]).map((pkgId) => {
                    const p = PACKAGES[pkgId];
                    const isSelected = selectedPackage === pkgId;
                    return (
                      <div
                        key={pkgId}
                        onClick={() => setSelectedPackage(pkgId)}
                        className={`relative rounded-2xl p-5 border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-900 text-white shadow-md'
                            : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 text-zinc-900'
                        }`}
                      >
                        {p.isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-zinc-950 border border-zinc-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                            MOST POPULAR
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${
                                isSelected ? 'text-zinc-300' : 'text-zinc-500'
                              }`}
                            >
                              {p.name}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                isSelected
                                  ? 'bg-white text-zinc-950 border-white'
                                  : 'border-zinc-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>

                          <div className="text-lg font-bold mt-1">
                            {p.signsCount} NFC Sign{p.signsCount > 1 ? 's' : ''}
                          </div>

                          <div className="mt-4 text-3xl font-extrabold">
                            ${p.price}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              isSelected ? 'text-zinc-400' : 'text-zinc-500'
                            }`}
                          >
                            One-time payment • Free U.S. delivery
                          </div>

                          <p
                            className={`mt-3 text-xs leading-relaxed ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-600'
                            }`}
                          >
                            {p.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================
                STEP 2: BUSINESS INFORMATION
               ============================================================ */}
            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <h3 className="font-display text-2xl font-extrabold text-zinc-950 tracking-tight">
                      Step 2: Business Information
                    </h3>
                    <p className="text-sm text-zinc-600 mt-1">
                      We'll configure your signs with your verified Google Review destination.
                    </p>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. The Artisanal Roastery"
                      value={businessInfo.businessName}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, businessName: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.businessName ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {errors.businessName && (
                      <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>
                    )}
                  </div>

                  {/* Business Website & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Business Website
                      </label>
                      <input
                        type="url"
                        placeholder="https://mybusiness.com"
                        value={businessInfo.businessWebsite}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, businessWebsite: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                        Business Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="(555) 000-0000"
                        value={businessInfo.businessPhone}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, businessPhone: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                    </div>
                  </div>

                  {/* Business Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="owner@mybusiness.com"
                      value={businessInfo.businessEmail}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, businessEmail: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.businessEmail ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {errors.businessEmail && (
                      <p className="text-xs text-red-500 mt-1">{errors.businessEmail}</p>
                    )}
                  </div>

                  {/* Google Review URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                        Google Review URL <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUrlGuide(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Need help finding your Google review link?
                      </button>
                    </div>
                    <input
                      type="url"
                      placeholder="https://g.page/r/your-code/review"
                      value={businessInfo.googleReviewUrl}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, googleReviewUrl: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.googleReviewUrl ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Paste the link that customers should use to leave a Google review for your business.
                    </p>
                    {errors.googleReviewUrl && (
                      <p className="text-xs text-red-500 mt-1">{errors.googleReviewUrl}</p>
                    )}
                  </div>

                  {/* Upload Business Logo */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Upload Business Logo <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                        errors.logo
                          ? 'border-red-400 bg-red-50/30'
                          : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50'
                      }`}
                    >
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                      >
                        {logoPreview ? (
                          <div className="flex items-center gap-3">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-12 h-12 object-contain rounded-lg border border-zinc-200 bg-white p-1"
                              referrerPolicy="no-referrer"
                            />
                            <div className="text-left">
                              <span className="text-xs font-bold text-zinc-900 block">
                                {businessInfo.logoFileName || 'Logo selected'}
                              </span>
                              <span className="text-[11px] text-blue-600 underline">
                                Click to replace image
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-800">
                              Click to upload logo (PNG, JPG, SVG)
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              High-resolution file recommended for printing
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                    {errors.logo && <p className="text-xs text-red-500 mt-1">{errors.logo}</p>}
                  </div>

                  {/* Preferred Card Branding / Notes */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Preferred Card Branding / Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Please use our official font style or include table #1 notes..."
                      value={businessInfo.brandingNotes}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, brandingNotes: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Right: Live 3D Card Preview */}
                <div className="lg:col-span-5 bg-zinc-100/70 border border-zinc-200 rounded-2xl p-6 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-600 uppercase tracking-wider mb-4 bg-white px-3 py-1 rounded-full border border-zinc-200">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-800" /> Live Sign Preview
                  </span>
                  <CardMockup3D
                    businessName={businessInfo.businessName || 'Your Business Name'}
                    logoUrl={logoPreview}
                    compact
                  />
                  <p className="text-[11px] text-zinc-500 mt-4">
                    Updates in real time as you type your business name and upload your logo.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================
                STEP 3: SHIPPING INFORMATION
               ============================================================ */}
            {step === 3 && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-zinc-950 tracking-tight">
                    Step 3: U.S. Shipping Destination
                  </h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Where should we deliver your custom configured RevTap signs?
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      value={shippingInfo.fullName}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, fullName: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.fullName ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="The Artisanal Roastery"
                      value={shippingInfo.shippingBusinessName}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, shippingBusinessName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="123 Main Street, Suite 100"
                    value={shippingInfo.addressLine1}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, addressLine1: e.target.value })
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                      errors.addressLine1 ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                    }`}
                  />
                  {errors.addressLine1 && (
                    <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Floor 2, Counter B"
                    value={shippingInfo.addressLine2}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, addressLine2: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Austin"
                      value={shippingInfo.city}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, city: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.city ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={shippingInfo.state}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, state: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="78701"
                      value={shippingInfo.zipCode}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, zipCode: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 ${
                        errors.zipCode ? 'border-red-500 bg-red-50/30' : 'border-zinc-300 bg-white'
                      }`}
                    />
                    {errors.zipCode && <p className="text-xs text-red-500 mt-1">{errors.zipCode}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={shippingInfo.country}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-600 text-sm cursor-not-allowed font-medium"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    RevTap exclusively fulfills to destinations within the 50 United States and D.C.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================
                STEP 4: ORDER SUMMARY
               ============================================================ */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-zinc-950 tracking-tight">
                    Step 4: Order Summary
                  </h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    Please review your custom package and delivery details before continuing to secure PayPal payment.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                    <div>
                      <div className="font-extrabold text-lg text-zinc-950">
                        {currentPkg.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {currentPkg.signsCount} NFC Review Sign{currentPkg.signsCount > 1 ? 's' : ''} (NFC + QR Custom Branded)
                      </div>
                    </div>
                    <div className="text-xl font-bold text-zinc-950">
                      ${currentPkg.price.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-bold uppercase text-zinc-500 mb-1">
                        Configured Business
                      </div>
                      <div className="font-semibold text-zinc-900">{businessInfo.businessName}</div>
                      <div className="text-zinc-600">{businessInfo.businessEmail}</div>
                      <div className="text-zinc-500 truncate max-w-[240px] mt-0.5">
                        {businessInfo.googleReviewUrl}
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-zinc-500 mb-1">
                        Shipping Address
                      </div>
                      <div className="font-semibold text-zinc-900">{shippingInfo.fullName}</div>
                      <div className="text-zinc-600">
                        {shippingInfo.addressLine1}
                        {shippingInfo.addressLine2 ? `, ${shippingInfo.addressLine2}` : ''}
                      </div>
                      <div className="text-zinc-600">
                        {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}
                      </div>
                      <div className="text-zinc-500 font-medium">{shippingInfo.country}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-200 space-y-2 text-sm">
                    <div className="flex justify-between text-zinc-600 text-xs">
                      <span>Package Subtotal</span>
                      <span>${currentPkg.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 text-xs">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> U.S. Standard Delivery
                      </span>
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-zinc-950 pt-2 border-t border-zinc-200">
                      <span>Total</span>
                      <span>${currentPkg.price.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                {/* PayPal Notice */}
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
                  <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Official PayPal Checkout:</span>
                    <p className="text-blue-800/90 mt-0.5 leading-relaxed">
                      Your order is safely registered with status <code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">payment_pending</code> before transfer. RevTap never sees or stores your payment card credentials.
                    </p>
                  </div>
                </div>

                {/* PayPal Redirect Status Notification */}
                {isRedirecting && redirectUrl && (
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Redirecting you to PayPal Checkout...</span>
                    </div>
                    <p className="text-xs text-blue-700">
                      If your browser does not redirect automatically,{' '}
                      <a
                        href={redirectUrl}
                        className="font-bold underline text-blue-900 hover:text-blue-950 inline-flex items-center gap-1"
                      >
                        <span>click here to proceed to PayPal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting || isRedirecting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={isSubmitting || isRedirecting}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirecting to PayPal...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Order...</span>
                  </>
                ) : (
                  <>
                    <span>CONTINUE TO SECURE PAYMENT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Helper Modal for Google Review URL */}
      <GoogleReviewUrlGuideModal
        isOpen={showUrlGuide}
        onClose={() => setShowUrlGuide(false)}
      />
    </>
  );
};
