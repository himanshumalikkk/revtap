import fs from 'fs';
import path from 'path';
import type { OrderRecord, ContactInquiry, PackageId, OrderStatus, SheetSyncStatus } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function saveJson<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// In-memory caches synced with JSON files
let orders: OrderRecord[] = loadJson<OrderRecord[]>(ORDERS_FILE, []);
let inquiries: ContactInquiry[] = loadJson<ContactInquiry[]>(INQUIRIES_FILE, []);

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
