import fs from 'fs';
import path from 'path';
import type { OrderRecord, ContactInquiry, PackageId, OrderStatus, SheetSyncStatus } from '../src/types';

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DATA_DIR = path.join(process.cwd(), 'data');
const WRITABLE_DATA_DIR = isVercel ? path.join('/tmp', 'revtap-data') : BASE_DATA_DIR;

try {
  if (!fs.existsSync(WRITABLE_DATA_DIR)) {
    fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[DB Init Warning]: Could not create writable data directory:', err);
}

const ORDERS_FILE = path.join(WRITABLE_DATA_DIR, 'orders.json');
const INQUIRIES_FILE = path.join(WRITABLE_DATA_DIR, 'inquiries.json');
const SEED_ORDERS_FILE = path.join(BASE_DATA_DIR, 'orders.json');
const SEED_INQUIRIES_FILE = path.join(BASE_DATA_DIR, 'inquiries.json');

function loadJson<T>(primaryPath: string, fallbackPath: string, fallback: T): T {
  try {
    if (fs.existsSync(primaryPath)) {
      const data = fs.readFileSync(primaryPath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading primary ${primaryPath}:`, err);
  }

  try {
    if (fallbackPath && primaryPath !== fallbackPath && fs.existsSync(fallbackPath)) {
      const data = fs.readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Error reading fallback ${fallbackPath}:`, err);
  }

  return fallback;
}

function saveJson<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[DB Storage Warning] Error writing ${filePath}:`, err);
  }
}

// In-memory caches synced with JSON files
let orders: OrderRecord[] = loadJson<OrderRecord[]>(ORDERS_FILE, SEED_ORDERS_FILE, []);
let inquiries: ContactInquiry[] = loadJson<ContactInquiry[]>(INQUIRIES_FILE, SEED_INQUIRIES_FILE, []);

/**
 * Generate unique Order ID in the exact format: RVT-YYYYMMDD-XXXX
 * Example: RVT-20260911-0042
 */
export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `RVT-${year}${month}${day}`;

  // Count existing orders from today to sequence nicely
  const todaysOrders = orders.filter((o) => o.id.startsWith(datePrefix));
  const nextSeq = String(todaysOrders.length + 1).padStart(4, '0');
  const candidate = `${datePrefix}-${nextSeq}`;

  // Ensure uniqueness
  if (!orders.some((o) => o.id === candidate)) {
    return candidate;
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${datePrefix}-${randomSuffix}`;
}

export function getAllOrders(): OrderRecord[] {
  return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): OrderRecord | undefined {
  return orders.find((o) => o.id.toLowerCase() === id.toLowerCase());
}

export function createOrder(orderData: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'sheetSyncStatus' | 'supplierInfo'>): OrderRecord {
  const id = generateOrderId();
  const now = new Date().toISOString();

  const newOrder: OrderRecord = {
    ...orderData,
    id,
    createdAt: now,
    updatedAt: now,
    sheetSyncStatus: 'pending',
    supplierInfo: {
      supplierName: 'RevTap Direct NFC Partner',
      supplierOrdered: false,
      supplierStatus: 'Pending',
      delivered: false,
      notes: orderData.business.brandingNotes || 'Standard NFC + QR Custom Google Review Sign',
    },
  };

  orders.push(newOrder);
  saveJson(ORDERS_FILE, orders);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<OrderRecord>): OrderRecord | undefined {
  const index = orders.findIndex((o) => o.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return undefined;

  const current = orders[index];
  const updated: OrderRecord = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    // Deep merge supplierInfo if present
    supplierInfo: updates.supplierInfo
      ? { ...current.supplierInfo, ...updates.supplierInfo }
      : current.supplierInfo,
  };

  orders[index] = updated;
  saveJson(ORDERS_FILE, orders);
  return updated;
}

export function saveContactInquiry(inquiry: Omit<ContactInquiry, 'id' | 'createdAt' | 'status'>): ContactInquiry {
  const newInquiry: ContactInquiry = {
    ...inquiry,
    id: 'INQ-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: 'new',
  };
  inquiries.push(newInquiry);
  saveJson(INQUIRIES_FILE, inquiries);
  return newInquiry;
}

export function getAllInquiries(): ContactInquiry[] {
  return [...inquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
