export enum Language {
  AR = 'ar',
  EN = 'en',
  FR = 'fr'
}

export type UserRole = 'admin' | 'seller';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  language?: Language; // إضافة اللغة المفضلة للمستخدم
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  productType: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  supplierId: string;
  image?: string;
  salesStats: {
    monthly: number;
    semiAnnual: number;
    annual: number;
  };
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  points: number;
  pointsRemainder: number;
  totalSpent: number;
  vouchersUsed: number;
  notes?: string;
  lastVisit?: number;
  createdAt: string;
  visitStats: {
    monthly: number;
    semiAnnual: number;
    annual: number;
  };
}

export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  changeDue: number;
  customerId?: string;
  customerName?: string;
  pointsInfo?: {
    previous: number;
    earned: number;
    newTotal: number;
  };
  paymentMethod: 'cash' | 'card';
  sellerId: string;
}

export type ReceiptSize = 'thermal' | 'A5' | 'A4';

export interface AppSettings {
  storeName: string;
  storeSubtitle: string;
  taxRate: number;
  currency: string;
  language: Language;
  receiptLanguage: Language;
  theme: 'light' | 'dark';
  receiptSize: ReceiptSize;
  printerConfig: {
    fontSize: number;
    density: 'light' | 'medium' | 'heavy';
    autoCut: boolean;
  };
  enableCamera: boolean;
  enableHIDScanner: boolean;
  pointsSystemEnabled: boolean;
  loyaltyRate: number;
  minPointsForVoucher: number;
  security: {
    confirmDeleteInventory: boolean;
    confirmDeleteCustomers: boolean;
    confirmDeleteSuppliers: boolean;
    confirmDeleteUsers: boolean;
    adminPasswordRequiredForReset: boolean;
    autoBackupBeforeReset: boolean;
    maxBackupFiles: number;
  };
  autoDetectLanguage: boolean;
  interfaceLanguage: Language;
}
