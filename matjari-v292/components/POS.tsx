import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Package, X, Printer, Download,
  RefreshCcw, Star, Search, Trash2, Camera, AlertCircle, Calculator
} from 'lucide-react';
import { InvoiceBarcode, generateInvoiceSerial } from './InvoiceBarcode';
import { printOrShare, saveImage } from '../src/capacitor-bridge';
import html2canvas from 'html2canvas';
import { Product, CartItem, Sale, AppSettings, Customer, User as AuthUser } from '../types';
import { Logo } from './Logo';
import { BarcodeScanner } from './BarcodeScanner';
import { Calculator as CalculatorWidget } from './Calculator';

// ── Code 128B SVG builder (for HTML print template) ──────────────────────────
const C128_PATTERNS: string[] = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100',
];
function buildBarcodeSVG(text: string): string {
  const START = '11010010000';
  const STOP  = '1100011101011';
  let checksum = 104;
  let bars = START;
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    checksum += v * (i + 1);
    bars += C128_PATTERNS[v] || '11011001100';
  }
  bars += C128_PATTERNS[checksum % 103] || '11011001100';
  bars += STOP;
  const W = 240, H = 40, PX = 8;
  const bw = (W - PX * 2) / bars.length;
  let rects = '';
  let x = PX;
  for (let i = 0; i < bars.length; ) {
    if (bars[i] === '1') {
      let w = 0;
      while (i < bars.length && bars[i] === '1') { w++; i++; }
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${(bw*w).toFixed(2)}" height="${H}" fill="#000"/>`;
      x += bw * w;
    } else {
      x += bw; i++;
    }
  }
  const svgH = H + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${svgH}" viewBox="0 0 ${W} ${svgH}" style="display:block;margin:0 auto"><rect width="${W}" height="${svgH}" fill="#fff"/>${rects}<text x="${W/2}" y="${svgH}" text-anchor="middle" font-size="10" font-family="monospace" fill="#333" letter-spacing="1">${text}</text></svg>`;
}
// ─────────────────────────────────────────────────────────────────────────────

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
}


// ─── ProductCard ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: Product;
  cartQty: number;
  onAdd: (p: Product) => void;
  cur: string;
  truncate: (s: string, n?: number) => string;
}> = ({ product: p, cartQty, onAdd, cur, truncate }) => (
  <button onClick={() => onAdd(p)} disabled={p.stock <= 0}
    className={
      `bg-white dark:bg-[#1a2233] p-2 sm:p-3 rounded-2xl shadow-sm flex flex-col items-center relative transition-all active:scale-95 ` +
      (p.stock <= 0 ? 'opacity-50 cursor-not-allowed ' : '') +
      (cartQty > 0 ? 'border-2 border-primary' : 'border-2 border-transparent hover:border-primary/50')
    }>
    <div className="w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl mb-1.5 overflow-hidden">
      {p.image
        ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
        : <Package size={24} className="text-gray-300 mt-4 mx-auto" />}
    </div>
    <h3 className="font-bold text-[11px] text-center line-clamp-2 dark:text-white leading-tight mb-0.5 w-full">{truncate(p.name, 20)}</h3>
    <p className="text-primary font-black text-base">{p.price} {cur}</p>
    {cartQty > 0 && (
      <span className="absolute top-1.5 start-1.5 bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">{cartQty}</span>
    )}
    {p.stock > 0 && p.stock <= 3 && (
      <span className="absolute top-1.5 end-1.5 bg-orange-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">{p.stock}</span>
    )}
    {p.stock <= 0 && (
      <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl text-white text-xs font-black">نفد</span>
    )}
  </button>
);

export const POS: React.FC<POSProps> = ({
  products, cart, setCart, onCompleteSale, settings, customers,
  currentUser, onNavigateToSale, isSaving, saleComplete, onStartNewSale,
  saveError, t = {}, sales = [], setSales, setProducts
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
  const [checkoutError, setCheckoutError]         = useState('');
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickName, setQuickName]                 = useState('');
  const [quickPhone, setQuickPhone]               = useState('');
  const [discount, setDiscount]                   = useState('');
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

  // HID barcode scanner (keyboard wedge)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (document.activeElement === searchRef.current) return;
      if (e.key === 'Enter' && searchQuery.length > 1) {
        const p = products.find(pr => pr.barcode === searchQuery);
        if (p) { addToCart(p); setSearchQuery(''); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [searchQuery, products]);

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

  // ── Cart helpers ───────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex
        ? prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const handleBarcodeScanned = (code: string) => {
    const p = products.find(pr => pr.barcode === code);
    if (p) addToCart(p);
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

    const sale: Sale = {
      id: generateInvoiceSerial(),
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
  const logoSVG = `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

  const generateQRData = () => {
    if (!pendingSale) return '';
    // Only the invoice serial — clean, scannable, no JSON bloat
    return pendingSale.id;
  };

  const generateReceiptHTML = (): string => {
    if (!pendingSale) return '';
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
@font-face{font-family:'UbuntuAr';src:url('./fonts/Ubuntu Arabic Regular.otf') format('opentype')}
*{margin:0;padding:0;box-sizing:border-box;font-family:'UbuntuAr','Cairo',sans-serif}
body{background:#fff;color:#111;width:80mm;font-size:11px}
.c{width:76mm;padding:4mm;margin:0 auto}
.center{text-align:center}
.bold{font-weight:700}.bolder{font-weight:900}
.divider{border-top:1px dashed #999;margin:5px 0}
.divider2{border-top:2px solid #3b82f6;margin:6px 0}
.row{display:flex;justify-content:space-between;margin:3px 0;font-size:10px}
.total-box{background:#f0f9ff;border:2px solid #3b82f6;border-radius:6px;padding:8px;text-align:center;margin:8px 0}
.total-val{font-size:20px;font-weight:900;color:#1e40af}
table{width:100%;border-collapse:collapse;font-size:9px}
th{border-bottom:1px solid #3b82f6;padding:3px;text-align:right;font-weight:700;color:#1e40af}
td{padding:3px;border-bottom:1px dashed #ddd}
.footer{text-align:center;font-size:8px;color:#666;margin-top:8px}
.debt-badge{background:#fef2f2;border:1px solid #dc2626;border-radius:4px;padding:4px;text-align:center;color:#dc2626;font-weight:700;font-size:10px;margin:6px 0}
.qr-sec{text-align:center;margin:8px 0}
@media print{@page{size:80mm auto;margin:2mm}body{width:76mm}.no-print{display:none}}
</style></head><body>
<div class="c">
  <div class="center" style="margin-bottom:8px">
    ${logoSVG}
    <div class="bolder" style="font-size:14px;color:#1e3a8a;margin-top:4px">${settings.storeName}</div>
    <div style="font-size:9px;color:#555">${settings.storeSubtitle}</div>
  </div>
  <div class="divider2"></div>
  <div class="row"><span class="bold">رقم الفاتورة:</span><span class="bolder">#${pendingSale.id}</span></div>
  <div class="row"><span class="bold">التاريخ:</span><span>${new Date(pendingSale.timestamp).toLocaleString('ar-MA')}</span></div>
  <div class="row"><span class="bold">الزبون:</span><span class="bold">${pendingSale.customerName || 'زبون عابر'}</span></div>
  <div class="row"><span class="bold">البائع:</span><span>${currentUser.name || currentUser.username}</span></div>
  <div class="divider"></div>
  <table>
    <thead><tr><th>الصنف</th><th style="text-align:center">الكمية</th><th style="text-align:left">المجموع</th></tr></thead>
    <tbody>
      ${pendingSale.items.map(i => `<tr><td>${truncate(i.name, 20)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:left">${(i.price * i.quantity).toFixed(2)} ${cur}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="divider"></div>
  ${pendingSale.discount > 0 ? `<div class="row"><span>الخصم:</span><span style="color:#dc2626">-${pendingSale.discount.toFixed(2)} ${cur}</span></div>` : ''}
  <div class="total-box">
    <div style="font-size:10px;color:#555;margin-bottom:2px">الإجمالي النهائي</div>
    <div class="total-val">${pendingSale.total.toFixed(2)} ${cur}</div>
  </div>
  <div class="row"><span class="bold">المدفوع:</span><span>${pendingSale.amountPaid.toFixed(2)} ${cur}</span></div>
  ${pendingSale.changeDue > 0 ? `<div class="row"><span class="bold">الباقي:</span><span style="color:#059669">${pendingSale.changeDue.toFixed(2)} ${cur}</span></div>` : ''}
  <div class="row"><span class="bold">طريقة الدفع:</span><span>${pendingSale.paymentMethod === 'cash' ? 'نقدي 💵' : pendingSale.paymentMethod === 'card' ? 'بطاقة 💳' : 'دين 📝'}</span></div>
  ${pendingSale.paymentMethod === 'debt' ? `<div class="debt-badge">⚠️ هذه الفاتورة دين — المتبقي: ${(pendingSale.total - pendingSale.amountPaid).toFixed(2)} ${cur}</div>` : ''}
  ${pendingSale.pointsInfo ? `<div style="background:#fef3c7;border:1px dashed #d97706;border-radius:4px;padding:4px;text-align:center;font-size:9px;margin:6px 0">⭐ نقاط الولاء: ${pendingSale.pointsInfo.newTotal.toFixed(3)} (+${pendingSale.pointsInfo.earned.toFixed(3)} جديدة)</div>` : ''}
  <div class="qr-sec">
    <div style="font-size:8px;color:#555;margin-bottom:4px">رقم الفاتورة التسلسلي</div>
    ${buildBarcodeSVG(pendingSale.id)}
  </div>
  <div class="divider"></div>
  <div class="footer">شكراً لزيارتكم ونتمنى لكم يوماً سعيداً<br>© ${new Date().getFullYear()} ${settings.storeName} — MATJARI POS</div>
</div>
<script>setTimeout(()=>{window.print();setTimeout(()=>window.close(),300)},300);</script>
</body></html>`;
  };

  const printReceipt = async (): Promise<boolean> => {
    if (!pendingSale) return false;
    const html = generateReceiptHTML();
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
          ) : cart.map(item => (
            <div key={item.id} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl flex items-center justify-between gap-2 group">
              <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-red-500 bg-white dark:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Trash2 size={12} />
              </button>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-xs dark:text-white leading-tight truncate">{item.name}</h4>
                <p className="text-[10px] text-primary font-black">{item.price} {cur}</p>
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-white/5 flex-shrink-0">
                <button onClick={() => addToCart(item)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Plus size={12} /></button>
                <span className="font-black text-sm dark:text-white w-5 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><Minus size={12} /></button>
              </div>
            </div>
          ))}
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
              <ProductCard key={p.id} product={p} cartQty={cart.find(i => i.id === p.id)?.quantity || 0}
                onAdd={addToCart} cur={cur} truncate={truncate} />
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
              .map(p=>(<ProductCard key={p.id} product={p} cartQty={cart.find(i=>i.id===p.id)?.quantity||0} onAdd={addToCart} cur={cur} truncate={truncate}/>))}
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
              :cart.map(item=>(
              <div key={item.id} className="bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <button onClick={()=>removeFromCart(item.id)} className="p-1 text-red-500 bg-white dark:bg-gray-800 rounded-lg flex-shrink-0"><Trash2 size={12}/></button>
                <div className="flex-1 min-w-0"><h4 className="font-black text-xs dark:text-white truncate">{item.name}</h4><p className="text-[10px] text-primary font-black">{item.price} {cur}</p></div>
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg flex-shrink-0">
                  <button onClick={()=>addToCart(item)} className="p-0.5 rounded"><Plus size={11}/></button>
                  <span className="font-black text-xs dark:text-white w-5 text-center">{item.quantity}</span>
                  <button onClick={()=>setCart(cart.map(i=>i.id===item.id?{...i,quantity:Math.max(1,i.quantity-1)}:i))} className="p-0.5 rounded"><Minus size={11}/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2.5">
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
      {showReceiptPreview && pendingSale && (
        <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-gray-800">{t.receipt_preview || 'معاينة الفاتورة'} #{pendingSale.id}</h3>
              <button onClick={() => { setShowReceiptPreview(false); setPendingSale(null); }} disabled={isProcessing} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {localError && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} />{localError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div ref={receiptRef} className="bg-white p-4 mx-auto w-72 font-cairo text-black rounded-xl shadow-sm border border-gray-100" dir="rtl">
                <div className="text-center mb-3">
                  <svg width="36" height="36" viewBox="0 0 100 100" className="mx-auto mb-1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" fill="none"/>
                    <rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/>
                    <path d="M40 55L50 65L60 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                  <h1 className="text-lg font-black">{settings.storeName}</h1>
                  <p className="text-[9px] text-gray-500">{settings.storeSubtitle}</p>
                </div>
                <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-2 my-2 space-y-0.5 text-[10px]">
                  <div className="flex justify-between"><span className="font-bold">رقم الفاتورة:</span><span className="font-black">#{pendingSale.id}</span></div>
                  <div className="flex justify-between"><span>التاريخ:</span><span>{new Date(pendingSale.timestamp).toLocaleString('ar-MA')}</span></div>
                  <div className="flex justify-between"><span>الزبون:</span><span className="font-bold">{pendingSale.customerName || 'زبون عابر'}</span></div>
                  <div className="flex justify-between"><span>البائع:</span><span>{currentUser.name || currentUser.username}</span></div>
                </div>
                <table className="w-full text-[9px] mb-2">
                  <thead><tr className="border-b border-gray-300"><th className="py-1 text-right">الصنف</th><th className="text-center">الكمية</th><th className="text-left">المجموع</th></tr></thead>
                  <tbody>
                    {pendingSale.items.map((item, i) => (
                      <tr key={i} className="border-b border-dashed border-gray-100">
                        <td className="py-1 font-bold">{truncate(item.name, 18)}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-left font-bold">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t-2 border-gray-900 pt-1 space-y-0.5 text-[10px]">
                  {pendingSale.discount > 0 && <div className="flex justify-between text-red-600"><span>خصم:</span><span>-{pendingSale.discount.toFixed(2)} {cur}</span></div>}
                  <div className="flex justify-between font-black text-sm"><span>الإجمالي:</span><span>{pendingSale.total.toFixed(2)} {cur}</span></div>
                  <div className="flex justify-between"><span>المدفوع:</span><span>{pendingSale.amountPaid.toFixed(2)} {cur}</span></div>
                  {pendingSale.changeDue > 0 && <div className="flex justify-between text-green-600"><span>الباقي:</span><span>{pendingSale.changeDue.toFixed(2)} {cur}</span></div>}
                </div>
                {pendingSale.pointsInfo && (
                  <div className="mt-2 bg-yellow-50 border border-dashed border-yellow-300 rounded-lg p-2 text-[9px] text-center">
                    ⭐ نقاط الولاء: {pendingSale.pointsInfo.newTotal.toFixed(3)} (+{pendingSale.pointsInfo.earned.toFixed(3)} جديدة)
                  </div>
                )}
                <div className="mt-3 text-center">
                  <InvoiceBarcode value={pendingSale.id} width={220} height={38} showText={true} />
                  <p className="text-[8px] text-gray-400 mt-1">شكراً لزيارتكم</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white shrink-0 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => finalizeSale('print')} disabled={isProcessing}
                  className="bg-primary text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm">
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Printer size={16} />}
                  {t.print_receipt || 'طباعة'}
                </button>
                <button onClick={() => finalizeSale('save')} disabled={isProcessing}
                  className="bg-emerald-500 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-sm">
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Download size={16} />}
                  {t.save_receipt || 'حفظ PNG'}
                </button>
              </div>
              <button onClick={() => finalizeSale('both')} disabled={isProcessing}
                className="w-full bg-purple-500 text-white py-3 rounded-xl font-black text-sm active:scale-95 disabled:opacity-50">
                🖨️ {t.print_and_save || 'طباعة وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
};
