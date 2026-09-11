export type PackageId = 'starter' | 'business' | 'growth';

export interface PackageOption {
  id: PackageId;
  name: string;
  badge?: string;
  tagline: string;
  signsCount: number;
  price: number;
  currency: string;
  isPopular?: boolean;
  features: string[];
}

export interface BusinessInfo {
  businessName: string;
  businessWebsite: string;
  businessEmail: string;
  businessPhone: string;
  googleReviewUrl: string;
  logoDataUrl?: string;
  logoFileName?: string;
  brandingNotes?: string;
}

export interface ShippingInfo {
  fullName: string;
  shippingBusinessName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type OrderStatus = 'payment_pending' | 'paid' | 'cancelled' | 'refunded';
export type SheetSyncStatus = 'pending' | 'synced' | 'failed';
export type SupplierStatus = 'Pending' | 'Ordered' | 'Shipped' | 'Delivered';

export interface OrderRecord {
  id: string; // RVT-YYYYMMDD-XXXX
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  packageId: PackageId;
  packageName: string;
  quantity: number;
  price: number;
  total: number;
  currency: string;
  business: BusinessInfo;
  shipping: ShippingInfo;
  paypalTxnId?: string;
  paypalOrderId?: string;
  paymentMethod?: string;
  paidAt?: string;
  sheetSyncStatus: SheetSyncStatus;
  sheetSyncedAt?: string;
  sheetSyncError?: string;
  emailsSent?: {
    customerConfirmation: boolean;
    adminNotification: boolean;
    sentAt?: string;
  };
  supplierInfo?: {
    supplierName: string;
    supplierOrdered: boolean;
    supplierOrderDate?: string;
    supplierCost?: string;
    supplierTracking?: string;
    supplierStatus: SupplierStatus;
    delivered: boolean;
    notes?: string;
  };
}

export interface ContactInquiry {
  id: string;
  name: string;
  business: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'new' | 'responded' | 'archived';
}

export interface AppConfig {
  siteName: string;
  packages: Record<PackageId, PackageOption>;
  paypalConfig: {
    hasStarterLink: boolean;
    hasBusinessLink: boolean;
    hasGrowthLink: boolean;
    hasClientId: boolean;
  };
  googleSheetsConfigured: boolean;
  resendConfigured: boolean;
  adminEmail: string;
  supportEmail: string;
}
