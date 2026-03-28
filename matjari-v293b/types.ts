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
  language?: Language;
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
  paymentMethod: 'cash' | 'card' | 'debt';
  sellerId: string;
  sellerName?: string;
  status?: 'completed' | 'returned' | 'partial_return';
  returnInfo?: {
    returnedAt: number;
    returnedBy: string;
    returnedItems: CartItem[];
    reason: string;
    refundAmount?: number;
  };
  notes?: string;
}

export interface Debt {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  saleId?: string;
  createdAt: number;
  dueDate?: number;
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  payments: DebtPayment[];
  createdBy: string;
}

export interface DebtPayment {
  id: string;
  amount: number;
  paidAt: number;
  receivedBy: string;
  notes?: string;
}

export interface EmployeeSession {
  id: string;
  userId: string;
  username: string;
  userName: string;
  loginAt: number;
  logoutAt?: number;
  salesCount: number;
  totalRevenue: number;
}

export type ZakatMadhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali';

export interface ZakatRecord {
  id: string;
  calculatedAt: number;
  madhab: ZakatMadhab;
  nisabGold: number;
  nisabSilver: number;
  cashAmount: number;
  inventoryValue: number;
  receivables: number;
  debtsOwed: number;
  zakatAmount: number;
  hawlDate?: number;
  notes?: string;
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
    thermalWidth: number;
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
  zakatReminderEnabled: boolean;
  zakatHawlDate?: number;
  zakatMadhab: ZakatMadhab;
}
