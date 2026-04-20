import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Package, X, Printer, Download,
  RefreshCcw, Star, Search, Trash2, Camera, AlertCircle, Calculator, Info, Edit2, Unlock, Lock
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { printOrShare, saveImage } from '../src/capacitor-bridge';
import html2canvas from 'html2canvas';
import { Product, CartItem, Sale, AppSettings, Customer, User as AuthUser, SaleTypeKey, User } from '../types';
import { Logo } from './Logo';
import { BarcodeScanner } from './BarcodeScanner';
import { Calculator as CalculatorWidget } from './Calculator';


declare global {
  interface Window {
    electronAPI?: {
      printInvoice: (html: string) => Promise<{ success: boolean; error?: string }>;
      getPlatform?: () => string;
    };
    electron?: { platform: string };
    __matjariAddCustomer?: (c: any) => void;
  }
}

interface POSProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCompleteSale: (sale: Sale) => Promise<boolean>;
  settings: AppSettings;
  customers: Customer[];
  currentUser: AuthUser;
  onNavigateToSale: (id: string) => void;
  isSaving: boolean;
  saleComplete: boolean;
  onStartNewSale: () => void;
  saveError: string;
  t?: any;
  sales?: Sale[];
  setSales?: React.Dispatch<React.SetStateAction<Sale[]>>;
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
  setSettings?: React.Dispatch<React.SetStateAction<AppSettings>>;
  users?: User[];
}


// ─── ProductCard ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  cartQty: number;
  onAdd: (p: Product) => void;
  onRemoveOne: (productId: string) => void;
  cur: string;
  truncate: (s: string, n?: number) => string;
}> = ({ product: p, cartQty, onAdd, onRemoveOne, cur, truncate }) => (
  <div className={
    `bg-white dark:bg-[#1a2233] p-2 sm:p-3 rounded-2xl shadow-sm flex flex-col items-center relative transition-all ` +
    (p.stock <= 0 ? 'opacity-50 ' : '') +
    (cartQty > 0 ? 'border-2 border-primary' : 'border-2 border-transparent')
  }>
    {/* صورة المنتج — النقر يضيف للسلة */}
    <button
      onClick={() => p.stock > 0 && onAdd(p)}
      disabled={p.stock <= 0}
      className="w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl mb-1.5 overflow-hidden relative active:scale-95 transition-all"
    >
      {p.image
        ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
        : <Package size={24} className="text-gray-300 mt-4 mx-auto" />}
      {p.stock <= 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl text-white text-xs font-black">نفد</span>
      )}
      {/* شارة الكمية */}
      {cartQty > 0 && (
        <span className="absolute top-1 start-1 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">{cartQty}</span>
      )}
      {p.stock > 0 && p.stock <= 3 && (
        <span className="absolute top-1 end-1 bg-orange-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{p.stock}</span>
      )}
    </button>
    <h3 className="font-bold text-[11px] text-center line-clamp-2 dark:text-white leading-tight mb-0.5 w-full">{truncate(p.name, 20)}</h3>
    <p className="text-primary font-black text-base">{p.price} {cur}</p>
    {/* زر نقص الكمية — يظهر فقط عند وجود المنتج في السلة */}
    {cartQty > 0 && (
      <button
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onRemoveOne(p.id); }}
        className="absolute bottom-10 end-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-black shadow-md active:scale-90 transition-all"
        title="نقص كمية"
      >−</button>
    )}
  </div>
);

export const POS: React.FC<POSProps> = ({
  products, cart, setCart, onCompleteSale, settings, customers,
  currentUser, onNavigateToSale, isSaving, saleComplete, onStartNewSale,
  saveError, t = {}, sales = [], setSales, setProducts, setSettings, users = []
}) => {
  // ── State ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]             = useState('');
  const [customerSearch, setCustomerSearch]       = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen]       = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [amountPaid, setAmountPaid]               = useState('');
  const [paymentMethod, setPaymentMethod]         = useState<'cash'|'card'|'debt'>('cash');
  const [pendingSale, setPendingSale]             = useState<Sale | null>(null);
  const [isScannerOpen, setIsScannerOpen]         = useState(false);
  const [isProcessing, setIsProcessing]           = useState(false);
  const [localError, setLocalError]               = useState('');
  const [showCalculator, setShowCalculator]       = useState(false);
  const [mobileTab, setMobileTab]                 = useState<'products'|'cart'>('products');
  const [saleType, setSaleType]                   = useState<SaleTypeKey>('retail');
  const [tooltipVisible, setTooltipVisible]       = useState<string | null>(null);
  const [checkoutError, setCheckoutError]         = useState('');
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickName, setQuickName]                 = useState('');
  const [quickPhone, setQuickPhone]               = useState('');
  const [discount, setDiscount]                   = useState('');
  const [editingCartKey, setEditingCartKey]       = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [priceGrantModal, setPriceGrantModal]     = useState(false);
  const [priceGrantPass, setPriceGrantPass]       = useState('');
  const [cardNumber, setCardNumber]               = useState('');
  const [cardType, setCardType]                   = useState('');
  const [cardExpiry, setCardExpiry]               = useState('');

  const receiptRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  const hidePhone = (p?: string) => {
    if (!p || p.length < 6) return p || '';
    return p.slice(0, 3) + '*'.repeat(p.length - 6) + p.slice(-3);
  };
  const truncate = (s: string, n = 22) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  // Detect card type from number prefix
  const detectCardType = (num: string): string => {
    const n = num.replace(/\s/g, '');
    if (/^4/.test(n)) return 'Visa';
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
    if (/^3[47]/.test(n)) return 'Amex';
    if (/^6/.test(n)) return 'CIH / Interbank';
    return '';
  };

  // Reset on sale complete
  useEffect(() => {
    if (saleComplete) {
      setSelectedCustomerId(''); setCustomerSearch('');
      setAmountPaid(''); setDiscount('');
    }
  }, [saleComplete]);

  useEffect(() => {
    if (saleComplete && showReceiptPreview) {
      setTimeout(() => { setShowReceiptPreview(false); setPendingSale(null); setIsProcessing(false); }, 600);
    }
  }, [saleComplete, showReceiptPreview]);

  // HID barcode scanner — keyboard wedge / USB / Bluetooth external scanner support
  // Uses refs to avoid closure stale-value issues (no addToCart dependency → no TDZ)
  const hidProductsRef = useRef(products);
  const hidSaleTypeRef = useRef(saleType);
  const hidSetCartRef  = useRef(setCart);
  useEffect(() => { hidProductsRef.current = products; }, [products]);
  useEffect(() => { hidSaleTypeRef.current = saleType; }, [saleType]);

  useEffect(() => {
    let buf = '';
    let lastKey = 0;
    let scanTimer: ReturnType<typeof setTimeout> | null = null;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const now = Date.now();
      // Most HID scanners send chars at < 50ms intervals — reset buffer after 200ms gap
      if (now - lastKey > 200) buf = '';
      lastKey = now;
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (buf.length >= 3) {
          if (scanTimer) { clearTimeout(scanTimer); scanTimer = null; }
          const prods = hidProductsRef.current;
          const st    = hidSaleTypeRef.current;
          const code  = buf.trim();
          buf = '';
          const p = prods.find((pr: any) => pr.barcode === code || pr.localBarcode === code);
          if (p && p.stock > 0) {
            if ((st === 'wholesale' && !(p as any).priceWholesale) ||
                (st === 'halfWholesale' && !(p as any).priceHalfWholesale) ||
                (st === 'installment' && !(p as any).priceInstallment)) {
              const stLabel = st === 'wholesale' ? 'جملة' : st === 'halfWholesale' ? 'نصف جملة' : 'تقسيط';
              setLocalError(`⚠️ "${p.name}" — لا سعر ${stLabel} في المخزون`);
              setTimeout(() => setLocalError(''), 3500);
              return;
            }
            const ep: number =
              st === 'wholesale'     && (p as any).priceWholesale     ? (p as any).priceWholesale     :
              st === 'halfWholesale' && (p as any).priceHalfWholesale ? (p as any).priceHalfWholesale :
              st === 'installment'   && (p as any).priceInstallment   ? (p as any).priceInstallment   :
              p.price;
            const cartKey = `${p.id}_${st}`;
            hidSetCartRef.current(prev => {
              const ex = prev.find((i: any) => i.cartKey === cartKey);
              return ex
                ? prev.map((i: any) => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
                : [...prev, { ...p, price: ep, quantity: 1, saleType: st, cartKey }];
            });
            try { navigator.vibrate?.(40); } catch {}
            return;
          }
          setSearchQuery(code);
        }
      } else if (e.key.length === 1) {
        buf += e.key;
        // Auto-process after 100ms silence (for scanners that don't send Enter)
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = setTimeout(() => {
          if (buf.length >= 8) {
            const prods = hidProductsRef.current;
            const st    = hidSaleTypeRef.current;
            const code  = buf.trim();
            buf = '';
            const p = prods.find((pr: any) => pr.barcode === code || pr.localBarcode === code);
            if (p && p.stock > 0) {
              if ((st === 'wholesale' && !(p as any).priceWholesale) ||
                  (st === 'halfWholesale' && !(p as any).priceHalfWholesale) ||
                  (st === 'installment' && !(p as any).priceInstallment)) {
                const stLabel = st === 'wholesale' ? 'جملة' : st === 'halfWholesale' ? 'نصف جملة' : 'تقسيط';
                setLocalError(`⚠️ "${p.name}" — لا سعر ${stLabel} في المخزون`);
                setTimeout(() => setLocalError(''), 3500);
                return;
              }
              const ep: number =
                st === 'wholesale'     && (p as any).priceWholesale     ? (p as any).priceWholesale     :
                st === 'halfWholesale' && (p as any).priceHalfWholesale ? (p as any).priceHalfWholesale :
                st === 'installment'   && (p as any).priceInstallment   ? (p as any).priceInstallment   :
                p.price;
              const cartKey = `${p.id}_${st}`;
              hidSetCartRef.current(prev => {
                const ex = prev.find((i: any) => i.cartKey === cartKey);
                return ex
                  ? prev.map((i: any) => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
                  : [...prev, { ...p, price: ep, quantity: 1, saleType: st, cartKey }];
              });
            }
          }
        }, 100);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (scanTimer) clearTimeout(scanTimer); };
  }, []); // empty deps — uses refs for fresh values

  // إغلاق tooltip نوع البيع عند النقر خارجه
  useEffect(() => {
    if (!tooltipVisible) return;
    const close = () => setTooltipVisible(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tooltipVisible]);

  // ── Computed values ────────────────────────────────────────────────
  const { subtotal, discountAmount, total } = useMemo(() => {
    const sub = cart.reduce((a, i) => a + i.price * i.quantity, 0);
    const dv  = parseFloat(discount || '0');
    const da  = dv > 0 ? (dv <= 100 ? sub * (dv / 100) : dv) : 0;
    return { subtotal: sub, discountAmount: da, total: Math.max(0, (sub - da) * (1 + (settings.taxRate || 0))) };
  }, [cart, settings.taxRate, discount]);

  const changeDue        = useMemo(() => Math.max(0, Number(amountPaid) - total), [amountPaid, total]);
  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
  const earnedPoints     = useMemo(() => {
    if (!selectedCustomerId || total <= 0) return 0;
    return parseFloat(((total / 100) * (settings.loyaltyRate || 1)).toFixed(3));
  }, [total, selectedCustomerId, settings.loyaltyRate]);
  const filteredCustomers = useMemo(() =>
    customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)),
    [customers, customerSearch]
  );

  const cur    = settings.currency || 'MAD';
  const isRTL  = settings.interfaceLanguage === 'ar';

  // أنواع البيع المتاحة حسب الإعدادات (مع fallback كامل إن لم تُضبط)
  const enabledTypes = settings.enabledSaleTypes ?? { retail: true, wholesale: true, halfWholesale: true, installment: true };
  const allSaleTypes: { key: SaleTypeKey; label: string; icon: string; desc: string }[] = [
    { key: 'retail',       label: t.sale_type_retail       || 'تجزئة',    icon: '🛍', desc: t.sale_type_retail_desc       || 'سعر التجزئة العادي للعملاء الأفراد' },
    { key: 'wholesale',    label: t.sale_type_wholesale    || 'جملة',     icon: '🏭', desc: t.sale_type_wholesale_desc    || 'سعر الجملة للكميات الكبيرة والتجار' },
    { key: 'halfWholesale',label: t.sale_type_halfWholesale|| 'نصف جملة', icon: '📦', desc: t.sale_type_halfWholesale_desc|| 'سعر وسط بين التجزئة والجملة' },
    { key: 'installment',  label: t.sale_type_installment  || 'تقسيط',    icon: '📅', desc: t.sale_type_installment_desc  || 'سعر التقسيط للدفع المجزأ' },
  ];
  const activeSaleTypes = allSaleTypes.filter(st => enabledTypes[st.key]);

  // إذا كان النوع الحالي غير متاح، انتقل لأول متاح
  useEffect(() => {
    if (!enabledTypes[saleType]) {
      const first = activeSaleTypes[0];
      if (first) setSaleType(first.key);
    }
  }, [settings.enabledSaleTypes]);

  // ── Cart helpers ───────────────────────────────────────────────────
  // مفتاح السلة: id_saleType — يسمح بنفس المنتج بأسعار مختلفة في السلة
  const makeCartKey = (productId: string, st: SaleTypeKey) => `${productId}_${st}`;

  const addToCart = (product: Product, forceSaleType?: SaleTypeKey) => {
    if (product.stock <= 0) return;
    const st = forceSaleType || saleType;
    // التحقق من وجود سعر لنوع البيع المحدد
    if (st === 'wholesale' && !(product as any).priceWholesale) {
      setLocalError(`⚠️ "${product.name}" — لم يُحدَّد له سعر جملة في المخزون`);
      setTimeout(() => setLocalError(''), 3500);
      return;
    }
    if (st === 'halfWholesale' && !(product as any).priceHalfWholesale) {
      setLocalError(`⚠️ "${product.name}" — لم يُحدَّد له سعر نصف جملة في المخزون`);
      setTimeout(() => setLocalError(''), 3500);
      return;
    }
    if (st === 'installment' && !(product as any).priceInstallment) {
      setLocalError(`⚠️ "${product.name}" — لم يُحدَّد له سعر تقسيط في المخزون`);
      setTimeout(() => setLocalError(''), 3500);
      return;
    }
    const ep: number =
      st === 'wholesale'     && (product as any).priceWholesale     ? (product as any).priceWholesale     :
      st === 'halfWholesale' && (product as any).priceHalfWholesale ? (product as any).priceHalfWholesale :
      st === 'installment'   && (product as any).priceInstallment   ? (product as any).priceInstallment   :
      product.price;
    const cartKey = makeCartKey(product.id, st);
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === cartKey);
      return ex
        ? prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, price: ep, quantity: 1, saleType: st, cartKey }];
    });
  };
  const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));
  const removeOneFromCart = (cartKey: string) => setCart(prev =>
    prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
  );

  const handleBarcodeScanned = (code: string) => {
    const p = products.find(pr => pr.barcode === code || pr.localBarcode === code);
    if (p && p.stock > 0) addToCart(p);
    else if (p && p.stock <= 0) { setLocalError(`نفد المخزون: ${p.name}`); setTimeout(() => setLocalError(''), 3000); }
    else { setSearchQuery(code); setLocalError(`لم يُعثر على منتج: ${code}`); setTimeout(() => setLocalError(''), 3000); }
    setIsScannerOpen(false);
  };

  // ── Checkout ───────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutError('');
    if (paymentMethod === 'debt' && !selectedCustomerId) {
      setCheckoutError(t.debt_requires_customer || '⚠️ يجب تحديد زبون لإتمام عملية الدين. أضف زبوناً أو اختر زبوناً موجوداً.');
      return;
    }
    // Payment logic:
    // cash/card: empty = paid full amount (no change)
    // debt: empty = paid nothing (0), partial = partial payment
    const paidAmount = paymentMethod === 'debt'
      ? (amountPaid !== '' ? Math.min(Number(amountPaid), total) : 0)
      : (amountPaid !== '' ? Number(amountPaid) : total);
    const actualChangeDue = paymentMethod === 'cash' && amountPaid !== ''
      ? Math.max(0, paidAmount - total)
      : 0;

    // تحديد نوع البيع الرئيسي للفاتورة
    const uniqueTypes = [...new Set(cart.map(i => i.saleType || 'retail'))];
    const mainSaleType = uniqueTypes.length === 1 ? uniqueTypes[0] as SaleTypeKey : 'retail';

    const sale: Sale = {
      id: `MTJR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: Date.now(),
      items: [...cart],
      subtotal,
      tax: (subtotal - discountAmount) * (settings.taxRate || 0),
      discount: discountAmount,
      total,
      amountPaid: paidAmount,
      changeDue: actualChangeDue,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer?.name,
      paymentMethod,
      saleType: mainSaleType,
      sellerId: currentUser.id,
      sellerName: currentUser.name || currentUser.username,
      status: 'completed',
      pointsInfo: (selectedCustomer && settings.pointsSystemEnabled) ? {
        previous: selectedCustomer.points,
        earned: earnedPoints,
        newTotal: parseFloat((selectedCustomer.points + earnedPoints).toFixed(3))
      } : undefined
    };
    setPendingSale(sale);
    setIsCheckoutOpen(false);
    setShowReceiptPreview(true);
  };

  // ── Receipt ────────────────────────────────────────────────────────
  // شعار المتجر: صورة مرفوعة أو أيقونة افتراضية
  const logoHTML = (settings as any).storeLogo
    ? `<img src="${String((settings as any).storeLogo || '')}" style="width:60px;height:60px;object-fit:contain;margin-bottom:4px" />`
    : `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

  const generateQRData = () => {
    if (!pendingSale) return '';
    // رقم الفاتورة التسلسلي فقط — لا JSON
    return pendingSale.id;
  };

  const generateReceiptHTML = (qrDataUrl?: string): string => {
    if (!pendingSale) return '';
    const size = settings.receiptSize || 'thermal';
    const isThermal = size === 'thermal' || size === 'thermal58';
    const is58 = size === 'thermal58';
    const pageW = is58 ? '58mm' : size === 'thermal' ? '80mm' : size === 'A5' ? '148mm' : '210mm';
    const contentW = is58 ? '54mm' : size === 'thermal' ? '76mm' : size === 'A5' ? '138mm' : '196mm';
    const baseFs = is58 ? '9px' : isThermal ? '11px' : size === 'A5' ? '12px' : '13px';
    const pad = isThermal ? '3mm' : '10mm';
    const qrSz = is58 ? 64 : isThermal ? 80 : 100;
    const storeLogo = (settings as any).storeLogo;
    const logoHTMLLocal = storeLogo
      ? `<img src="${storeLogo}" style="width:${isThermal?'40px':'70px'};height:${isThermal?'40px':'70px'};object-fit:contain;margin-bottom:4px"/>`
      : `<svg width="${isThermal?'36':'56'}" height="${isThermal?'36':'56'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    const stLabels: Record<string,string> = { retail:'تجزئة', wholesale:'جملة', halfWholesale:'نصف جملة', installment:'تقسيط' };
    const payLabel = pendingSale.paymentMethod==='cash'?'نقدي':pendingSale.paymentMethod==='card'?'بطاقة بنكية':'دين';
    const dateStr = new Date(pendingSale.timestamp).toLocaleString('ar-MA');

    // جدول المنتجات — حراري: 3 أعمدة، A4/A5: 5 أعمدة مع نوع البيع والسعر
    const itemsRows = pendingSale.items.map(item => {
      const st = stLabels[item.saleType || 'retail'] || 'تجزئة';
      const tot = (item.price * item.quantity).toFixed(2);
      return isThermal
        ? `<tr><td>${truncate(item.name, is58?12:18)}<br><span style="color:#64748b;font-size:${is58?'7px':'8px'}">${st}</span></td><td style="text-align:center">${item.quantity}</td><td style="text-align:left">${tot}</td></tr>`
        : `<tr><td style="font-weight:700">${item.name}</td><td style="text-align:center"><span style="background:#eff6ff;color:#1d4ed8;border-radius:4px;padding:1px 6px;font-size:10px">${st}</span></td><td style="text-align:center">${item.quantity}</td><td style="text-align:center">${item.price.toFixed(2)}</td><td style="text-align:left;font-weight:700">${tot} ${cur}</td></tr>`;
    }).join('');

    const tableHTML = isThermal
      ? `<table><thead><tr><th>الصنف</th><th style="text-align:center">ك</th><th style="text-align:left">المجموع</th></tr></thead><tbody>${itemsRows}</tbody></table>`
      : `<table><thead><tr><th>الصنف</th><th style="text-align:center">نوع البيع</th><th style="text-align:center">الكمية</th><th style="text-align:center">سعر الوحدة</th><th style="text-align:left">الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table>`;

    const qrBlock = qrDataUrl
      ? `<img src="${qrDataUrl}" width="${qrSz}" height="${qrSz}" style="display:block;margin:0 auto"/>`
      : `<div style="width:${qrSz}px;height:${qrSz}px;background:#f5f5f5;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:8px;color:#aaa;margin:0 auto">${pendingSale.id}</div>`;

    const taxLine = settings.taxRate ? `<div class="row"><span>الضريبة (${settings.taxRate}%):</span><span>${(pendingSale.tax||0).toFixed(2)} ${cur}</span></div>` : '';
    const discountLine = pendingSale.discount > 0 ? `<div class="row"><span>الخصم:</span><span style="color:#dc2626">-${pendingSale.discount.toFixed(2)} ${cur}</span></div>` : '';
    const changeLine = pendingSale.changeDue > 0 ? `<div class="row"><span class="bold">الباقي للزبون:</span><span style="color:#059669;font-weight:900">${pendingSale.changeDue.toFixed(2)} ${cur}</span></div>` : '';
    const debtBlock = pendingSale.paymentMethod==='debt' ? `<div class="debt-badge">⚠️ هذه الفاتورة دين — المتبقي: ${(pendingSale.total-pendingSale.amountPaid).toFixed(2)} ${cur}</div>` : '';
    const pointsBlock = pendingSale.pointsInfo ? `<div style="background:#fef3c7;border:1px dashed #d97706;border-radius:5px;padding:5px;text-align:center;font-size:${isThermal?'8px':'11px'};margin:6px 0">⭐ نقاط الولاء: ${pendingSale.pointsInfo.newTotal.toFixed(3)} (+${pendingSale.pointsInfo.earned.toFixed(3)} جديدة)</div>` : '';

    const thermalBody = `
  <div style="text-align:center;margin-bottom:6px">
    ${logoHTMLLocal}
    <div style="font-size:${is58?'12px':'14px'};font-weight:900;color:#1e3a8a;margin-top:3px">${settings.storeName}</div>
    ${settings.storeSubtitle?`<div style="font-size:8px;color:#666">${settings.storeSubtitle}</div>`:''}
  </div>
  <div style="border-top:2px solid #3b82f6;margin:5px 0"></div>
  <div class="row"><span class="bold">رقم الفاتورة:</span><span style="font-weight:900">#${pendingSale.id}</span></div>
  <div class="row"><span class="bold">التاريخ:</span><span>${dateStr}</span></div>
  <div class="row"><span class="bold">الزبون:</span><span style="font-weight:700">${pendingSale.customerName||'زبون عابر'}</span></div>
  <div class="row"><span class="bold">البائع:</span><span>${currentUser.name||currentUser.username}</span></div>
  <div class="divider"></div>
  ${tableHTML}
  <div class="divider"></div>
  ${discountLine}${taxLine}
  <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:6px;padding:6px;text-align:center;margin:6px 0">
    <div style="font-size:9px;color:#555">الإجمالي النهائي</div>
    <div style="font-size:${is58?'16px':'20px'};font-weight:900;color:#1e40af">${pendingSale.total.toFixed(2)} ${cur}</div>
  </div>
  <div class="row"><span class="bold">المدفوع:</span><span>${pendingSale.amountPaid.toFixed(2)} ${cur}</span></div>
  ${changeLine}
  <div class="row"><span class="bold">طريقة الدفع:</span><span>${payLabel}</span></div>
  ${debtBlock}${pointsBlock}
  <div style="text-align:center;margin:8px 0">
    ${qrBlock}
    <div style="font-size:8px;color:#555;font-family:monospace;margin-top:3px">${pendingSale.id}</div>
  </div>
  <div style="border-top:1px dashed #bbb;margin:4px 0"></div>
  <div style="text-align:center;font-size:8px;color:#666">شكراً لزيارتكم ونتمنى لكم يوماً سعيداً<br>© ${new Date().getFullYear()} ${settings.storeName}</div>`;

    const a4a5Body = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #3b82f6;padding-bottom:14px;margin-bottom:14px">
    <div>
      ${logoHTMLLocal}
      <div style="font-size:22px;font-weight:900;color:#1e3a8a;margin-top:6px">${settings.storeName}</div>
      ${settings.storeSubtitle?`<div style="font-size:11px;color:#666">${settings.storeSubtitle}</div>`:''}
    </div>
    <div style="text-align:left">
      <div style="font-size:${size==='A4'?'30px':'22px'};font-weight:900;color:#3b82f6">فاتورة بيع</div>
      <div style="font-size:${size==='A4'?'16px':'13px'};font-weight:700;color:#333;margin-top:4px">#${pendingSale.id}</div>
      <div style="font-size:11px;color:#666;margin-top:2px">${dateStr}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <div style="color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.5px">الزبون</div>
      <div style="font-weight:900;font-size:13px;margin-top:3px">${pendingSale.customerName||'زبون عابر'}</div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <div style="color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.5px">البائع</div>
      <div style="font-weight:900;font-size:13px;margin-top:3px">${currentUser.name||currentUser.username}</div>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px">
      <div style="color:#64748b;font-size:9px;text-transform:uppercase;letter-spacing:.5px">طريقة الدفع</div>
      <div style="font-weight:900;font-size:13px;margin-top:3px">${payLabel}</div>
    </div>
  </div>
  ${tableHTML}
  <div style="display:flex;justify-content:flex-end;margin-top:16px">
    <div style="width:${size==='A4'?'280px':'220px'}">
      ${pendingSale.discount>0?`<div class="row"><span>المجموع الفرعي:</span><span>${pendingSale.subtotal.toFixed(2)} ${cur}</span></div>`:''}
      ${discountLine}${taxLine}
      <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:8px;padding:10px;text-align:center;margin:8px 0">
        <div style="font-size:10px;color:#555">الإجمالي النهائي</div>
        <div style="font-size:${size==='A4'?'28px':'22px'};font-weight:900;color:#1e40af">${pendingSale.total.toFixed(2)} ${cur}</div>
      </div>
      <div class="row"><span class="bold">المدفوع:</span><span style="font-weight:700">${pendingSale.amountPaid.toFixed(2)} ${cur}</span></div>
      ${changeLine}
    </div>
  </div>
  ${debtBlock}${pointsBlock}
  <div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:12px;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:10px;color:#666">شكراً لزيارتكم ونتمنى لكم يوماً سعيداً<br>© ${new Date().getFullYear()} ${settings.storeName} — MATJARI POS</div>
    <div style="text-align:center">
      ${qrBlock}
      <div style="font-size:8px;color:#555;font-family:monospace;margin-top:3px">${pendingSale.id}</div>
    </div>
  </div>`;

    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<style>
@font-face{font-family:'UbuntuAr';src:url('./fonts/Ubuntu Arabic Regular.otf') format('opentype')}
*{margin:0;padding:0;box-sizing:border-box;font-family:'UbuntuAr','Cairo','Segoe UI',sans-serif}
body{background:#fff;color:#111;font-size:${baseFs};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.c{width:${contentW};padding:${pad};margin:0 auto}
.bold{font-weight:700}
.divider{border-top:1px dashed #bbb;margin:4px 0}
.row{display:flex;justify-content:space-between;margin:${isThermal?'2px':'5px'} 0;font-size:${isThermal?'10px':baseFs}}
.debt-badge{background:#fef2f2;border:1px solid #dc2626;border-radius:6px;padding:${isThermal?'4px':'8px'};text-align:center;color:#dc2626;font-weight:700;font-size:${isThermal?'10px':'12px'};margin:${isThermal?'5px':'10px'} 0}
table{width:100%;border-collapse:collapse;font-size:${isThermal?(is58?'8px':'9px'):'11px'};margin-top:4px}
th{background:#eff6ff;border-bottom:2px solid #3b82f6;padding:${isThermal?'3px':'7px 8px'};text-align:right;font-weight:700;color:#1e40af}
td{padding:${isThermal?'3px':'6px 8px'};border-bottom:1px dashed #e5e7eb;vertical-align:middle}
@media print{@page{size:${pageW} ${isThermal?'auto':'297mm'};margin:${isThermal?'1mm':'8mm'}}body{width:${pageW}}.no-print{display:none}}
</style></head><body>
<div class="c">
${isThermal ? thermalBody : a4a5Body}
</div>
<script>setTimeout(()=>{window.print();setTimeout(()=>window.close(),500)},400);</script>
</body></html>`;
  };

  // Capture QR code SVG as data URL for embedding in print HTML
  const captureQRDataUrl = (): string => {
    try {
      const svgEl = (document.getElementById('receipt-qr-svg') || receiptRef.current?.querySelector('svg[xmlns]')) as SVGElement | null;
      if (!svgEl) return '';
      const serialized = new XMLSerializer().serializeToString(svgEl);
      const b64 = btoa(unescape(encodeURIComponent(serialized)));
      return `data:image/svg+xml;base64,${b64}`;
    } catch { return ''; }
  };

  const printReceipt = async (): Promise<boolean> => {
    if (!pendingSale) return false;
    const qrUrl = captureQRDataUrl();
    const html = generateReceiptHTML(qrUrl);
    const result = await printOrShare(html, pendingSale.id, receiptRef.current || undefined);
    if (!result.success) {
      setLocalError(result.error || 'خطأ في الطباعة');
      return false;
    }
    return true;
  };

  const saveReceiptImage = async (): Promise<boolean> => {
    if (!pendingSale || !receiptRef.current) return false;
    const canvas = await html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const filename = `فاتورة_${pendingSale.id}.png`;
    await saveImage(dataUrl, filename);
    return true;
  };

  const finalizeSale = async (action: 'print' | 'save' | 'both') => {
    if (!pendingSale || isProcessing) return;
    setIsProcessing(true); setLocalError('');
    try {
      if (action === 'print' || action === 'both') await printReceipt();
      if (action === 'save'  || action === 'both') { await new Promise(r => setTimeout(r, 300)); await saveReceiptImage(); }
      const ok = await onCompleteSale(pendingSale);
      if (!ok) throw new Error('فشل حفظ البيانات');
    } catch (e: any) {
      setLocalError(e.message || 'خطأ في إتمام البيع');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSaving || saleComplete || saveError) return null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="font-cairo select-none" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══════════════ MOBILE TAB SWITCHER ═══════════════ */}
      <div className="lg:hidden mb-3 flex gap-0 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
        <button onClick={() => setMobileTab('products')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${mobileTab==='products'?'bg-white dark:bg-[#1a2233] text-primary shadow':'text-gray-500 dark:text-gray-400'}`}>
          <Package size={16}/> {t.products||'المنتجات'}
        </button>
        <button onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 relative ${mobileTab==='cart'?'bg-white dark:bg-[#1a2233] text-primary shadow':'text-gray-500 dark:text-gray-400'}`}>
          <ShoppingCart size={16}/> {t.cart||'السلة'}
          {cart.length>0 && <span className="absolute top-1 end-2 bg-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>}
        </button>
      </div>

      {/* ═══════════════ DESKTOP LAYOUT (side by side) ═══════════════ */}
      <div className="hidden lg:flex lg:flex-row gap-3" style={{height:'calc(100vh - 8rem)'}}>

      {/* ═══════════════ CART PANEL (desktop) ═══════════════ */}
      <div className="w-80 xl:w-96 bg-white dark:bg-[#1a2233] rounded-3xl shadow-sm flex flex-col overflow-hidden border border-gray-100 dark:border-white/5 flex-shrink-0">

        {/* Cart header */}
        <div className="p-4 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShoppingCart size={22} />
            <h2 className="text-base font-black">{t.cart || 'سلة المبيعات'}</h2>
            {cart.length > 0 && <span className="bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">{cart.length}</span>}
          </div>
          <div className="flex gap-2">
            {(settings as any).allowCartPriceEdit && (
              <button
                onClick={() => { setPriceGrantPass(''); setPriceGrantModal(true); }}
                className={`p-2 rounded-xl transition-colors ${(settings as any).allowEmployeeCartPriceEdit ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' : 'bg-white/20 hover:bg-white/40'}`}
                title={(settings as any).allowEmployeeCartPriceEdit ? 'إلغاء صلاحية تعديل السعر للموظف' : 'منح الموظف صلاحية تعديل السعر'}>
                {(settings as any).allowEmployeeCartPriceEdit ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
            )}
            <button onClick={() => setShowCalculator(v => !v)} className="bg-white/20 p-2 rounded-xl hover:bg-white/40" title={t.calculator || 'آلة حاسبة'}>
              <Calculator size={16} />
            </button>
            <button onClick={() => { setCart([]); setSelectedCustomerId(''); setCustomerSearch(''); setDiscount(''); }} className="bg-white/20 p-2 rounded-xl hover:bg-white/40">
              <RefreshCcw size={16} />
            </button>
          </div>
        </div>

        {/* Calculator */}
        {showCalculator && (
          <div className="p-3 border-b border-gray-100 dark:border-white/5 flex justify-center">
            <CalculatorWidget compact theme={settings.theme}
              onInsertAmount={v => { setAmountPaid(v.toFixed(2)); setShowCalculator(false); }}
              t={t} />
          </div>
        )}

        {/* Customer selector */}
        <div className="p-3 border-b border-gray-100 dark:border-white/5 space-y-2">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search size={13} className="absolute top-2.5 start-3 text-gray-400" />
              <input type="text" placeholder={t.customer_search || 'بحث عن زبون...'}
                value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 ps-9 pe-3 py-2 rounded-xl text-xs outline-none border border-gray-100 dark:border-transparent focus:border-primary dark:text-white" />
            </div>
            <button onClick={() => setShowQuickAddCustomer(true)}
              className="bg-primary/10 text-primary p-2 rounded-xl hover:bg-primary hover:text-white transition-all flex-shrink-0"
              title={t.add_customer || 'إضافة زبون'}>
              <Plus size={14} />
            </button>
          </div>
          <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl text-xs font-bold dark:text-white appearance-none border border-gray-100 dark:border-transparent">
            <option value="">{t.customer_anonymous || 'زبون عابر'}</option>
            {filteredCustomers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </select>
        </div>

        {/* Loyalty points */}
        {selectedCustomer && settings.pointsSystemEnabled && (
          <div className="mx-3 mt-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-dashed border-emerald-300 rounded-2xl text-xs">
            <div className="flex justify-between">
              <span className="font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Star size={12} /> {t.loyalty_points || 'نقاط الولاء'}</span>
              <span className="font-black text-emerald-800 dark:text-emerald-300">{selectedCustomer.points.toFixed(3)}</span>
            </div>
            <div className="flex justify-between mt-1 text-gray-500">
              <span>{t.points_earned || 'ستكسب'}:</span>
              <span className="font-black text-emerald-600">+{earnedPoints.toFixed(3)}</span>
            </div>
          </div>
        )}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-gray-300 dark:text-gray-600 font-black mt-16 text-sm">{t.empty_cart || 'السلة فارغة'}</p>
          ) : cart.map(item => {
            const ck = item.cartKey || `${item.id}_${item.saleType||'retail'}`;
            const stInfo = allSaleTypes.find(s => s.key === item.saleType);
            return (
            <div key={ck} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl flex items-center justify-between gap-2 group">
              <button onClick={() => removeFromCart(ck)} className="p-1.5 text-red-500 bg-white dark:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Trash2 size={12} />
              </button>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-xs dark:text-white leading-tight truncate">{item.name}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  {editingCartKey === ck ? (
                    <input
                      type="number" value={editingPriceValue} min="0" step="0.01"
                      onChange={e => {
                        setEditingPriceValue(e.target.value);
                        const np = parseFloat(e.target.value);
                        if (!isNaN(np) && np >= 0) setCart(prev => prev.map(i => i.cartKey === ck ? { ...i, price: np } : i));
                      }}
                      onBlur={() => setEditingCartKey(null)}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setCart(prev => prev.map(i => i.cartKey === ck ? { ...i, price: item.price } : i)); setEditingCartKey(null); } }}
                      className="w-16 text-[10px] px-1 py-0.5 border border-primary rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                      autoFocus />
                  ) : (
                    <p className="text-[10px] text-primary font-black">{item.price} {cur}</p>
                  )}
                  {stInfo && <span className="text-[8px] bg-primary/10 text-primary px-1 rounded-full font-bold">{stInfo.icon}{stInfo.label}</span>}
                  {(currentUser.role === 'admin' || (settings as any).allowEmployeeCartPriceEdit) && (settings as any).allowCartPriceEdit && editingCartKey !== ck && (
                    <button onClick={() => { setEditingCartKey(ck); setEditingPriceValue(item.price.toString()); }}
                      className="text-gray-300 hover:text-primary transition-colors" title="تعديل السعر">
                      <Edit2 size={9} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-white/5 flex-shrink-0">
                <button onClick={() => addToCart(item, item.saleType)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={12} /></button>
                <span className="font-black text-sm dark:text-white w-5 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.cartKey === ck ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={12} /></button>
              </div>
            </div>
            );
          })}
        </div>

        {/* Discount + Total + Checkout */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-3">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-500 font-bold flex-shrink-0">{t.discount || 'خصم'}:</span>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0 أو %"
              className="flex-1 py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs outline-none border border-gray-100 dark:border-transparent dark:text-white" min="0" />
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>بعد الخصم:</span>
              <span className="text-red-500 font-bold">-{discountAmount.toFixed(2)} {cur}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-black text-xs">{t.total || 'الإجمالي'}:</span>
            <span className="text-primary font-black text-2xl tracking-tighter">{total.toFixed(2)} {cur}</span>
          </div>
          {/* ── أزرار نوع البيع (ديسكتوب) ── */}
          <div className="mb-2">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
              {activeSaleTypes.map((st, idx) => {
                const isLastBtn = idx === activeSaleTypes.length - 1;
                return (
                <div key={st.key} className="flex-1 relative">
                  <button
                    onPointerDown={e => { e.preventDefault(); setSaleType(st.key); }}
                    className={`w-full py-1.5 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-0.5 ${saleType===st.key?'bg-primary text-white shadow':'text-gray-500 dark:text-gray-400'}`}>
                    {st.icon} {st.label}
                  </button>
                  <button
                    onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setTooltipVisible(tooltipVisible===st.key?null:st.key); }}
                    className="absolute -top-1 -end-1 z-10 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                    <Info size={9} />
                  </button>
                  {tooltipVisible===st.key && (
                    <div className={`absolute bottom-full mb-2 z-50 w-44 bg-gray-800 text-white text-[10px] rounded-xl p-2 shadow-2xl leading-relaxed pointer-events-none ${isLastBtn ? 'end-0' : 'start-0'}`}>
                      <p className="font-black text-primary mb-0.5">{st.label}</p>
                      {st.desc}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-400 text-center mt-1">{t.sale_type_label||'نوع البيع'} — {t.mixed_sale||'يمكن خلط أنواع في سلة واحدة'}</p>
          </div>
              <button onClick={() => setIsCheckoutOpen(true)} disabled={cart.length === 0}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-all text-base">
            {t.checkout || 'متابعة الدفع'}
          </button>
        </div>
      </div>

      {/* ═══════════════ PRODUCTS PANEL ═══════════════ */}
      <div className="flex-1 flex flex-col gap-3 order-1 lg:order-2 min-w-0 min-h-0">
        {localError && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm">
            <AlertCircle size={16} />
            {localError}
            <button onClick={() => setLocalError('')} className="ms-auto"><X size={14} /></button>
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute top-3.5 start-4 text-gray-400" />
            <input ref={searchRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery) {
                  const p = products.find(pr => pr.barcode === searchQuery);
                  if (p) { addToCart(p); setSearchQuery(''); }
                }
              }}
              placeholder={t.search_placeholder || 'اسم المنتج أو الباركود...'}
              className="w-full py-3 ps-11 pe-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary" />
          </div>
          <button onClick={() => setIsScannerOpen(true)}
            className="p-3 bg-primary text-white rounded-2xl shadow hover:scale-105 transition active:scale-95 flex-shrink-0"
            title={t.scan_camera || 'مسح الباركود'}>
            <Camera size={22} />
          </button>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 overflow-y-auto flex-1 pb-2">
          {products
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery))
            .map(p => (
              <ProductCard key={p.id} product={p}
                cartQty={cart.filter(i => i.id === p.id).reduce((s,i) => s+i.quantity, 0)}
                onAdd={addToCart}
                onRemoveOne={(pid) => removeOneFromCart(makeCartKey(pid, saleType))}
                cur={cur} truncate={truncate} />
            ))}
        </div>
      </div>
      </div>{/* end desktop flex wrapper */}

      {/* ═══════════════ MOBILE: Products tab ═══════════════ */}
      {mobileTab === 'products' && (
        <div className="lg:hidden space-y-3">
          {localError && <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm"><AlertCircle size={16}/>{localError}<button onClick={()=>setLocalError('')} className="ms-auto"><X size={14}/></button></div>}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute top-3 start-3 text-gray-400"/>
              <input ref={searchRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                placeholder={t.search_placeholder||'اسم المنتج أو الباركود...'}
                className="w-full py-2.5 ps-9 pe-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary"/>
            </div>
            <button onClick={()=>setIsScannerOpen(true)} className="p-2.5 bg-primary text-white rounded-2xl flex-shrink-0"><Camera size={20}/></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {products.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())||p.barcode.includes(searchQuery))
              .map(p=>(<ProductCard key={p.id} product={p}
                cartQty={cart.filter(i=>i.id===p.id).reduce((s,i)=>s+i.quantity,0)}
                onAdd={addToCart}
                onRemoveOne={(pid)=>removeOneFromCart(makeCartKey(pid, saleType))}
                cur={cur} truncate={truncate}/>))}
          </div>
          {cart.length>0 && (
            <div className="sticky bottom-20 flex justify-center pb-2">
              <button onClick={()=>setMobileTab('cart')}
                className="bg-primary text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-sm flex items-center gap-2">
                <ShoppingCart size={18}/> {t.cart||'السلة'} ({cart.length}) — {total.toFixed(0)} {cur}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MOBILE: Cart tab ═══════════════ */}
      {mobileTab === 'cart' && (
        <div className="lg:hidden bg-white dark:bg-[#1a2233] rounded-3xl border border-gray-100 dark:border-white/5">
          <div className="p-4 bg-primary text-white flex justify-between items-center rounded-t-3xl">
            <div className="flex items-center gap-2"><ShoppingCart size={20}/><h2 className="text-base font-black">{t.cart||'السلة'}</h2>{cart.length>0&&<span className="bg-white text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">{cart.length}</span>}</div>
            <div className="flex gap-2">
              {(settings as any).allowCartPriceEdit && (
                <button
                  onClick={() => { setPriceGrantPass(''); setPriceGrantModal(true); }}
                  className={`p-1.5 rounded-xl transition-colors ${(settings as any).allowEmployeeCartPriceEdit ? 'bg-yellow-400 text-gray-900' : 'bg-white/20'}`}
                  title={(settings as any).allowEmployeeCartPriceEdit ? 'إلغاء صلاحية تعديل السعر' : 'منح تعديل السعر للموظف'}>
                  {(settings as any).allowEmployeeCartPriceEdit ? <Unlock size={15}/> : <Lock size={15}/>}
                </button>
              )}
              <button onClick={()=>setShowCalculator(v=>!v)} className="bg-white/20 p-1.5 rounded-xl"><Calculator size={15}/></button>
              <button onClick={()=>{setCart([]);setSelectedCustomerId('');setDiscount('');}} className="bg-white/20 p-1.5 rounded-xl"><RefreshCcw size={15}/></button>
            </div>
          </div>
          {showCalculator&&<div className="p-3 border-b border-gray-100 dark:border-white/5 flex justify-center"><CalculatorWidget compact theme={settings.theme} onInsertAmount={v=>{setAmountPaid(v.toFixed(2));setShowCalculator(false);}} t={t}/></div>}
          <div className="p-3 border-b border-gray-100 dark:border-white/5 space-y-2">
            <div className="flex gap-1.5">
              <div className="relative flex-1"><Search size={13} className="absolute top-2.5 start-3 text-gray-400"/><input type="text" placeholder={t.customer_search||'بحث عن زبون...'} value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 ps-9 pe-3 py-2 rounded-xl text-xs outline-none border border-gray-100 dark:border-transparent focus:border-primary dark:text-white"/></div>
              <button onClick={()=>setShowQuickAddCustomer(true)} className="bg-primary/10 text-primary p-2 rounded-xl hover:bg-primary hover:text-white flex-shrink-0"><Plus size={14}/></button>
            </div>
            <select value={selectedCustomerId} onChange={e=>setSelectedCustomerId(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl text-xs font-bold dark:text-white appearance-none border border-gray-100 dark:border-transparent">
              <option value="">{t.customer_anonymous||'زبون عابر'}</option>
              {filteredCustomers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="p-3 space-y-2">
            {cart.length===0?<p className="text-center text-gray-300 dark:text-gray-600 py-8 text-sm font-bold">{t.empty_cart||'السلة فارغة'}</p>
              :cart.map(item=>{
              const ck=item.cartKey||`${item.id}_${item.saleType||'retail'}`;
              const stInfo=allSaleTypes.find(s=>s.key===item.saleType);
              return(
              <div key={ck} className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <button onClick={()=>removeFromCart(ck)} className="p-1 text-red-500 bg-white dark:bg-gray-800 rounded-lg flex-shrink-0"><Trash2 size={12}/></button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-xs dark:text-white truncate">{item.name}</h4>
                  <div className="flex items-center gap-1">
                    {editingCartKey === ck ? (
                      <input
                        type="number" value={editingPriceValue} min="0" step="0.01"
                        onChange={e => {
                          setEditingPriceValue(e.target.value);
                          const np = parseFloat(e.target.value);
                          if (!isNaN(np) && np >= 0) setCart(prev => prev.map(i => i.cartKey === ck ? { ...i, price: np } : i));
                        }}
                        onBlur={() => setEditingCartKey(null)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setCart(prev => prev.map(i => i.cartKey === ck ? { ...i, price: item.price } : i)); setEditingCartKey(null); } }}
                        className="w-16 text-[10px] px-1 py-0.5 border border-primary rounded-lg focus:outline-none dark:bg-gray-800 dark:text-white"
                        autoFocus />
                    ) : (
                      <p className="text-[10px] text-primary font-black">{item.price} {cur}</p>
                    )}
                    {stInfo&&<span className="text-[8px] bg-primary/10 text-primary px-1 rounded-full font-bold">{stInfo.icon}{stInfo.label}</span>}
                    {(currentUser.role === 'admin' || (settings as any).allowEmployeeCartPriceEdit) && (settings as any).allowCartPriceEdit && editingCartKey !== ck && (
                      <button onClick={() => { setEditingCartKey(ck); setEditingPriceValue(item.price.toString()); }}
                        className="text-gray-300 hover:text-primary transition-colors" title="تعديل السعر">
                        <Edit2 size={9} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg flex-shrink-0">
                  <button onClick={()=>addToCart(item,item.saleType)} className="p-0.5 rounded"><Plus size={11}/></button>
                  <span className="font-black text-xs dark:text-white w-5 text-center">{item.quantity}</span>
                  <button onClick={()=>setCart(cart.map(i=>i.cartKey===ck?{...i,quantity:Math.max(1,i.quantity-1)}:i))} className="p-0.5 rounded"><Minus size={11}/></button>
                </div>
              </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2.5">
            {/* ── أزرار نوع البيع (موبايل) ── */}
            <div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-1">
                {activeSaleTypes.map((st, idx) => {
                  const isLastBtn = idx === activeSaleTypes.length - 1;
                  return (
                  <div key={st.key} className="flex-1 relative">
                    <button
                      onPointerDown={e=>{e.preventDefault();setSaleType(st.key);}}
                      className={`w-full py-1.5 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-0.5 ${saleType===st.key?'bg-primary text-white shadow':'text-gray-500 dark:text-gray-400'}`}>
                      {st.icon} <span className="hidden xs:inline">{st.label}</span>
                    </button>
                    <button
                      onPointerDown={e=>{e.preventDefault();e.stopPropagation();setTooltipVisible(tooltipVisible===st.key?null:st.key);}}
                      className="absolute -top-1 -end-1 z-10 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                      <Info size={9}/>
                    </button>
                    {tooltipVisible===st.key&&(
                      <div className={`absolute bottom-full mb-2 z-50 w-44 bg-gray-800 text-white text-[10px] rounded-xl p-2 shadow-2xl leading-relaxed ${isLastBtn ? 'end-0' : 'start-0'}`}>
                        <p className="font-black text-primary mb-0.5">{st.label}</p>
                        {st.desc}
                        <button onPointerDown={e=>{e.preventDefault();setTooltipVisible(null);}} className="absolute top-1 end-1 text-white/50 hover:text-white"><X size={10}/></button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-400 text-center">{t.sale_type_label||'نوع البيع الحالي'}: <span className="text-primary font-bold">{allSaleTypes.find(s=>s.key===saleType)?.label}</span> — {t.mixed_sale||'بيع مختلط مسموح'}</p>
            </div>
            <div className="flex gap-2 items-center"><span className="text-xs text-gray-500 font-bold flex-shrink-0">{t.discount||'خصم'}:</span><input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="0 أو %" className="flex-1 py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs outline-none border border-gray-100 dark:border-transparent dark:text-white" min="0"/></div>
            {discountAmount>0&&<div className="flex justify-between text-xs text-gray-500"><span>{t.discount||'خصم'}:</span><span className="text-red-500 font-bold">-{discountAmount.toFixed(2)} {cur}</span></div>}
            <div className="flex justify-between items-center"><span className="text-gray-400 font-black text-xs">{t.total||'الإجمالي'}:</span><span className="text-primary font-black text-xl">{total.toFixed(2)} {cur}</span></div>
            <button onClick={()=>setIsCheckoutOpen(true)} disabled={cart.length===0} className="w-full bg-primary text-white font-black py-3.5 rounded-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-all text-sm">{t.checkout||'متابعة الدفع'}</button>
          </div>
        </div>
      )}

      {/* ═══════════════ CHECKOUT MODAL ═══════════════ */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a2233] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black dark:text-white">{t.checkout || 'إتمام البيع'}</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              {/* Error + Inline customer selector for debt */}
              {checkoutError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                  {checkoutError}
                  {/* Inline customer search */}
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-400">اختر زبوناً موجوداً:</div>
                    <input type="text" placeholder="بحث بالاسم أو الهاتف..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
                      onChange={e => setCustomerSearch(e.target.value)} autoFocus />
                    {customerSearch && (
                      <div className="max-h-32 overflow-y-auto space-y-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-1">
                        {filteredCustomers.length === 0
                          ? <p className="text-xs text-gray-400 p-2 text-center">لا توجد نتائج</p>
                          : filteredCustomers.slice(0, 6).map(c => (
                            <button key={c.id}
                              onClick={() => { setSelectedCustomerId(c.id); setCheckoutError(''); }}
                              className={`w-full text-start px-3 py-2 rounded-lg text-xs hover:bg-primary/10 transition-all ${selectedCustomerId === c.id ? 'bg-primary/20 font-bold' : ''}`}>
                              {c.name} — <span dir="ltr">{c.phone}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    <button onClick={() => setShowQuickAddCustomer(true)}
                      className="w-full bg-primary text-white py-2 rounded-xl text-xs font-bold">
                      ➕ {t.add_customer || 'إضافة زبون جديد'}
                    </button>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-3xl text-center border border-primary/20">
                <p className="text-4xl font-black text-primary">{total.toFixed(2)} {cur}</p>
                {discountAmount > 0 && <p className="text-xs text-red-500 mt-1">خصم: -{discountAmount.toFixed(2)} {cur}</p>}
              </div>

              {/* Amount paid */}
              <div>
                <label className="text-xs font-black text-gray-400 block mb-1.5 uppercase tracking-wider">{t.amount_paid || 'المبلغ المستلم'}</label>
                <div className="relative">
                  <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                    placeholder={paymentMethod === "debt" ? "0 (اختياري)" : total.toString()}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center text-2xl font-black dark:text-white outline-none border-2 focus:border-primary transition-all" />
                  <button onClick={() => setShowCalculator(v => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 text-primary">
                    <Calculator size={20} />
                  </button>
                </div>
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((v, i) => (
                      <button key={i} onClick={() => setAmountPaid(v.toFixed(2))}
                        className="py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-primary hover:text-white transition-all">
                        {v.toFixed(0)}
                      </button>
                    ))}
                </div>
              </div>

              {/* Change due */}
              {Number(amountPaid) > 0 && (
                <div className="bg-green-500/10 p-3 rounded-2xl text-center border border-green-500/20">
                  <p className="text-xs text-green-600 font-black">{t.change_due || 'الباقي للزبون'}</p>
                  <p className="text-xl font-black text-green-600">{changeDue.toFixed(2)} {cur}</p>
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="text-xs font-black text-gray-400 block mb-1.5 uppercase tracking-wider">{t.payment_method || 'طريقة الدفع'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['cash','نقدي','💵'],['card','بطاقة','💳'],['debt','دين','📝']] as const).map(([id, label, icon]) => (
                    <button key={id} onClick={() => { setPaymentMethod(id as any); setCheckoutError(''); }}
                      className={`py-3 rounded-2xl font-black text-sm flex flex-col items-center gap-1 transition-all ${paymentMethod === id ? 'bg-primary text-white shadow-md' : 'bg-gray-100 dark:bg-gray-800 dark:text-white'}`}>
                      <span>{icon}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card details */}
              {paymentMethod === 'card' && (
                <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">معلومات البطاقة</span>
                    {cardType && <span className="text-xs font-black text-primary">{cardType === 'Visa' ? '💙 Visa' : cardType === 'Mastercard' ? '🔴 Mastercard' : cardType === 'Amex' ? '🟢 Amex' : `🏦 ${cardType}`}</span>}
                  </div>
                  <input type="tel" placeholder="رقم البطاقة" maxLength={19}
                    value={cardNumber}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g,'').slice(0,16);
                      const fmt = val.replace(/(.{4})/g,'$1 ').trim();
                      setCardNumber(fmt);
                      setCardType(detectCardType(val));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary dark:text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="انتهاء الصلاحية MM/YY" maxLength={5}
                      value={cardExpiry}
                      onChange={e => {
                        let val = e.target.value.replace(/\D/g,'');
                        if (val.length >= 3) val = val.slice(0,2) + '/' + val.slice(2,4);
                        setCardExpiry(val);
                      }}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary dark:text-white" />
                    <div className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 flex items-center justify-center">
                      {cardType || 'نوع البطاقة تلقائي'}
                    </div>
                  </div>
                </div>
              )}

              {/* Debt info: show paid/remaining */}
              {paymentMethod === 'debt' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 rounded-xl p-3 text-xs">
                  <div className="font-bold text-yellow-800 dark:text-yellow-400 mb-1">📝 معلومات الدين</div>
                  <div className="flex justify-between">
                    <span>المدفوع الآن:</span>
                    <span className="font-black text-green-600">{amountPaid !== '' ? Number(amountPaid).toFixed(2) : '0.00'} {cur}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتبقي كدين:</span>
                    <span className="font-black text-red-600">{(total - (amountPaid !== '' ? Math.min(Number(amountPaid), total) : 0)).toFixed(2)} {cur}</span>
                  </div>
                </div>
              )}

              {/* Confirm */}
              <button onClick={handleCheckout}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">
                {t.confirm_checkout || 'تأكيد وإصدار الفاتورة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ RECEIPT PREVIEW ═══════════════ */}
      {showReceiptPreview && pendingSale && (() => {
        const sz = settings.receiptSize || 'thermal';
        const isTh = sz === 'thermal' || sz === 'thermal58';
        const stL: Record<string,string> = { retail:'تجزئة', wholesale:'جملة', halfWholesale:'نصف جملة', installment:'تقسيط' };
        const payL = pendingSale.paymentMethod==='cash'?'نقدي':pendingSale.paymentMethod==='card'?'بطاقة بنكية':'دين';
        const modalMax = isTh ? 'max-w-sm' : sz==='A5' ? 'max-w-xl' : 'max-w-2xl';
        const previewW = isTh ? (sz==='thermal58'?'w-52':'w-64') : sz==='A5' ? 'w-full' : 'w-full';
        return (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-3 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`bg-white rounded-3xl ${modalMax} w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-800 text-sm">{t.receipt_preview||'معاينة الفاتورة'} <span className="text-primary">#{pendingSale.id}</span></h3>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sz==='thermal58'?'58mm':sz==='thermal'?'80mm':sz}</span>
              </div>
              <button onClick={() => { setShowReceiptPreview(false); setPendingSale(null); }} disabled={isProcessing} className="text-gray-400 hover:text-gray-600 p-1"><X size={20}/></button>
            </div>
            {localError && <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2"><AlertCircle size={14}/>{localError}</div>}

            {/* Preview body */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex justify-center">
              <div ref={receiptRef} dir="rtl"
                className={`bg-white font-cairo text-black rounded-xl shadow border border-gray-100 ${previewW} ${isTh?'p-3 text-[9px]':'p-5 text-[11px]'}`}>

                {/* شعار + اسم المتجر */}
                {isTh ? (
                  <div className="text-center mb-2">
                    {(settings as any).storeLogo
                      ? <img src={(settings as any).storeLogo} className="w-10 h-10 object-contain mx-auto mb-1"/>
                      : <svg width="32" height="32" viewBox="0 0 100 100" className="mx-auto mb-1" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                    <h1 className="font-black text-blue-900 text-sm leading-tight">{settings.storeName}</h1>
                    {settings.storeSubtitle && <p className="text-[8px] text-gray-500">{settings.storeSubtitle}</p>}
                  </div>
                ) : (
                  <div className="flex justify-between items-start border-b-2 border-blue-500 pb-3 mb-3">
                    <div>
                      {(settings as any).storeLogo
                        ? <img src={(settings as any).storeLogo} className="w-14 h-14 object-contain mb-1"/>
                        : <svg width="48" height="48" viewBox="0 0 100 100" className="mb-1" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                      <h1 className="font-black text-blue-900 text-xl">{settings.storeName}</h1>
                      {settings.storeSubtitle && <p className="text-xs text-gray-500">{settings.storeSubtitle}</p>}
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-black text-blue-500">فاتورة بيع</div>
                      <div className="font-black text-gray-700 mt-1">#{pendingSale.id}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{new Date(pendingSale.timestamp).toLocaleString('ar-MA')}</div>
                    </div>
                  </div>
                )}

                {/* معلومات البيع */}
                {isTh ? (
                  <div className="border-t border-b border-dashed border-gray-300 py-1.5 my-1.5 space-y-0.5">
                    <div className="flex justify-between"><span className="font-bold">رقم الفاتورة:</span><span className="font-black">#{pendingSale.id}</span></div>
                    <div className="flex justify-between"><span>التاريخ:</span><span>{new Date(pendingSale.timestamp).toLocaleString('ar-MA')}</span></div>
                    <div className="flex justify-between"><span>الزبون:</span><span className="font-bold">{pendingSale.customerName||'زبون عابر'}</span></div>
                    <div className="flex justify-between"><span>البائع:</span><span>{currentUser.name||currentUser.username}</span></div>
                    <div className="flex justify-between"><span>الدفع:</span><span className="font-bold">{payL}</span></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[['الزبون', pendingSale.customerName||'زبون عابر'],['البائع', currentUser.name||currentUser.username],['طريقة الدفع', payL]].map(([label,val])=>(
                      <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                        <div className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</div>
                        <div className="font-black text-xs mt-0.5">{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* جدول المنتجات */}
                <table className={`w-full border-collapse ${isTh?'text-[8px] my-1':'text-[10px] mb-2'}`}>
                  <thead>
                    <tr className="bg-blue-50 border-b-2 border-blue-400">
                      <th className="py-1 px-1 text-right text-blue-700">الصنف</th>
                      {!isTh && <th className="py-1 px-1 text-center text-blue-700">نوع البيع</th>}
                      <th className="py-1 px-1 text-center text-blue-700">الكمية</th>
                      {!isTh && <th className="py-1 px-1 text-center text-blue-700">سعر الوحدة</th>}
                      <th className="py-1 px-1 text-left text-blue-700">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSale.items.map((item, i) => (
                      <tr key={i} className="border-b border-dashed border-gray-100">
                        <td className="py-1 px-1 font-bold">
                          {truncate(item.name, isTh?(sz==='thermal58'?12:16):30)}
                          {isTh && <div className="text-[7px] text-gray-400">{stL[item.saleType||'retail']||'تجزئة'}</div>}
                        </td>
                        {!isTh && <td className="py-1 px-1 text-center"><span className="bg-blue-50 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full">{stL[item.saleType||'retail']||'تجزئة'}</span></td>}
                        <td className="py-1 px-1 text-center">{item.quantity}</td>
                        {!isTh && <td className="py-1 px-1 text-center">{item.price.toFixed(2)}</td>}
                        <td className="py-1 px-1 text-left font-bold">{(item.price*item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* الإجماليات */}
                <div className={`border-t-2 border-gray-800 pt-1 space-y-0.5 ${isTh?'text-[9px]':'text-[10px]'} ${!isTh?'flex justify-end':''}`}>
                  <div className={!isTh?'w-52 space-y-1':''}>
                    {pendingSale.discount>0 && <div className="flex justify-between text-red-500"><span>خصم:</span><span>-{pendingSale.discount.toFixed(2)} {cur}</span></div>}
                    {!!settings.taxRate && <div className="flex justify-between text-gray-500"><span>ضريبة ({settings.taxRate}%):</span><span>{(pendingSale.tax||0).toFixed(2)} {cur}</span></div>}
                    <div className={`bg-blue-50 border border-blue-300 rounded-lg text-center ${isTh?'p-1.5 my-1':'p-2 my-1.5'}`}>
                      <div className="text-[8px] text-gray-500">الإجمالي النهائي</div>
                      <div className={`font-black text-blue-800 ${isTh?'text-sm':'text-lg'}`}>{pendingSale.total.toFixed(2)} {cur}</div>
                    </div>
                    <div className="flex justify-between"><span className="font-bold">المدفوع:</span><span>{pendingSale.amountPaid.toFixed(2)} {cur}</span></div>
                    {pendingSale.changeDue>0 && <div className="flex justify-between text-green-600 font-bold"><span>الباقي:</span><span>{pendingSale.changeDue.toFixed(2)} {cur}</span></div>}
                  </div>
                </div>

                {pendingSale.paymentMethod==='debt' && (
                  <div className="mt-1.5 bg-red-50 border border-red-300 rounded-lg p-1.5 text-[8px] text-center text-red-700 font-black">
                    ⚠️ دين — المتبقي: {(pendingSale.total-pendingSale.amountPaid).toFixed(2)} {cur}
                  </div>
                )}
                {pendingSale.pointsInfo && (
                  <div className="mt-1 bg-yellow-50 border border-dashed border-yellow-300 rounded-lg p-1.5 text-[8px] text-center">
                    ⭐ نقاط الولاء: {pendingSale.pointsInfo.newTotal.toFixed(3)} (+{pendingSale.pointsInfo.earned.toFixed(3)} جديدة)
                  </div>
                )}

                {/* QR — مركزي في الأسفل */}
                <div className="mt-3 text-center">
                  <QRCodeSVG id="receipt-qr-svg" value={generateQRData()} size={isTh?64:90} level="H" includeMargin />
                  <p className="text-[7px] text-gray-400 mt-0.5 font-mono">{pendingSale.id}</p>
                  <p className={`text-gray-400 ${isTh?'text-[7px]':'text-[9px]'}`}>شكراً لزيارتكم • {settings.storeName}</p>
                </div>
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="p-4 border-t bg-white shrink-0 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => finalizeSale('print')} disabled={isProcessing}
                  className="bg-primary text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm">
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Printer size={16}/>}
                  {t.print_receipt||'طباعة'}
                </button>
                <button onClick={() => finalizeSale('save')} disabled={isProcessing}
                  className="bg-emerald-500 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm">
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Download size={16}/>}
                  {t.save_receipt||'حفظ PNG'}
                </button>
              </div>
              <button onClick={() => finalizeSale('both')} disabled={isProcessing}
                className="w-full bg-purple-500 text-white py-3 rounded-xl font-black text-sm active:scale-95 disabled:opacity-50">
                🖨️ {t.print_and_save||'طباعة وحفظ'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ═══════════════ QUICK ADD CUSTOMER ═══════════════ */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-800 dark:text-white">{t.quick_add_customer || 'إضافة زبون سريعة'}</h3>
              <button onClick={() => setShowQuickAddCustomer(false)} className="text-gray-400 p-1"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder={t.customer_name || 'اسم الزبون *'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
                value={quickName} onChange={e => setQuickName(e.target.value)} autoFocus />
              <input type="tel" placeholder={t.phone || 'الهاتف'}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
                value={quickPhone} onChange={e => setQuickPhone(e.target.value)} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowQuickAddCustomer(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm font-bold">
                {t.cancel || 'إلغاء'}
              </button>
              <button
                onClick={() => {
                  if (!quickName.trim()) return;
                  const newCust = {
                    id: `CUST_${Date.now()}`,
                    name: quickName.trim(),
                    phone: quickPhone || '',
                    email: '', points: 0, pointsRemainder: 0,
                    totalSpent: 0, vouchersUsed: 0,
                    createdAt: new Date().toISOString(),
                    visitStats: { monthly: 0, semiAnnual: 0, annual: 0 }
                  };
                  if (window.__matjariAddCustomer) window.__matjariAddCustomer(newCust);
                  setSelectedCustomerId(newCust.id);
                  setCustomerSearch(newCust.name);
                  setShowQuickAddCustomer(false);
                  setQuickName(''); setQuickPhone('');
                  setCheckoutError('');
                }}
                disabled={!quickName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
                ✓ {t.add || 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ BARCODE SCANNER ═══════════════ */}
      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setIsScannerOpen(false)}
          title={t.scan_product || 'مسح منتج'}
          hint={t.scan_product_hint || 'وجّه الكاميرا نحو باركود المنتج'}
          t={t}
        />
      )}

    {/* ─── Modal: كلمة مرور المدير لمنح/إلغاء صلاحية تعديل سعر السلة ─── */}
    {priceGrantModal && (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[6000] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#1e293b] p-6 sm:p-10 rounded-2xl sm:rounded-[3rem] w-full max-w-sm shadow-2xl border border-gray-100 dark:border-white/10 text-center">
          <div className="text-4xl mb-4">{(settings as any).allowEmployeeCartPriceEdit ? '🔒' : '🔓'}</div>
          <h3 className="text-gray-800 dark:text-white font-black text-xl mb-1">
            {(settings as any).allowEmployeeCartPriceEdit ? 'إلغاء صلاحية تعديل السعر' : 'منح صلاحية تعديل السعر'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">يتطلب كلمة مرور المدير</p>
          <input
            type="password"
            value={priceGrantPass}
            onChange={e => setPriceGrantPass(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const admin = users.find(u => u.role === 'admin');
                const correct = admin ? priceGrantPass === admin.password : priceGrantPass === currentUser.password;
                if (correct) {
                  setSettings && setSettings(s => ({ ...s, allowEmployeeCartPriceEdit: !(s as any).allowEmployeeCartPriceEdit }));
                  setPriceGrantModal(false); setPriceGrantPass('');
                } else { alert('كلمة المرور خاطئة!'); setPriceGrantPass(''); }
              }
              if (e.key === 'Escape') { setPriceGrantModal(false); setPriceGrantPass(''); }
            }}
            className="w-full p-4 bg-gray-50 dark:bg-black/30 rounded-2xl text-center dark:text-white text-2xl font-black mb-5 outline-none border-2 border-transparent focus:border-primary transition-all"
            placeholder="كلمة المرور"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                const admin = users.find(u => u.role === 'admin');
                const correct = admin ? priceGrantPass === admin.password : priceGrantPass === currentUser.password;
                if (correct) {
                  setSettings && setSettings(s => ({ ...s, allowEmployeeCartPriceEdit: !(s as any).allowEmployeeCartPriceEdit }));
                  setPriceGrantModal(false); setPriceGrantPass('');
                } else { alert('كلمة المرور خاطئة!'); setPriceGrantPass(''); }
              }}
              className="flex-[2] bg-primary text-white py-3 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
              تأكيد
            </button>
            <button
              onClick={() => { setPriceGrantModal(false); setPriceGrantPass(''); }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 dark:text-white py-3 rounded-2xl font-black transition-all">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};
