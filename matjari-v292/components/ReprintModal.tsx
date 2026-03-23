import React, { useRef, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { InvoiceBarcode } from './InvoiceBarcode';
import html2canvas from 'html2canvas';
import { Sale, AppSettings, User } from '../types';
import { printOrShare, saveImage } from '../src/capacitor-bridge';

// ── Code 128B SVG builder ──────────────────────────────────────────────────────
const C128R: string[] = [
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
function buildBarcodeSVGR(text: string): string {
  const START = '11010010000', STOP = '1100011101011';
  let chk = 104, bars = START;
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    chk += v * (i + 1);
    bars += C128R[v] || C128R[0];
  }
  bars += C128R[chk % 103] || C128R[0];
  bars += STOP;
  const W = 240, H = 40, PX = 8, bw = (W - PX * 2) / bars.length;
  let rects = '', x = PX;
  for (let i = 0; i < bars.length; ) {
    if (bars[i] === '1') {
      let w = 0;
      while (i < bars.length && bars[i] === '1') { w++; i++; }
      rects += `<rect x="${x.toFixed(2)}" y="0" width="${(bw*w).toFixed(2)}" height="${H}" fill="#000"/>`;
      x += bw * w;
    } else { x += bw; i++; }
  }
  const svgH = H + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${svgH}" viewBox="0 0 ${W} ${svgH}" style="display:block;margin:0 auto"><rect width="${W}" height="${svgH}" fill="#fff"/>${rects}<text x="${W/2}" y="${svgH}" text-anchor="middle" font-size="10" font-family="monospace" fill="#333" letter-spacing="1">${text}</text></svg>`;
}
// ──────────────────────────────────────────────────────────────────────────────

interface ReprintModalProps {
  sale: Sale;
  settings: AppSettings;
  currentUser: User;
  t: any;
  onClose: () => void;
}

const truncate = (s: string, n = 18) => s.length > n ? s.slice(0, n - 1) + '…' : s;

export const ReprintModal: React.FC<ReprintModalProps> = ({
  sale, settings, currentUser, t, onClose
}) => {
  const receiptRef  = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const cur  = settings.currency || 'MAD';
  const isRTL = settings.interfaceLanguage === 'ar';

  // Serial-only — no JSON dump

  const logoSVG = `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/><path d="M40 55L50 65L60 55" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

  const generateHTML = (): string => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
@font-face{font-family:'UbuntuAr';src:url('./fonts/Ubuntu Arabic Regular.otf') format('opentype')}
*{margin:0;padding:0;box-sizing:border-box;font-family:'UbuntuAr','Cairo',sans-serif}
body{background:#fff;color:#111;width:80mm;font-size:11px}
.c{width:76mm;padding:4mm;margin:0 auto}
.center{text-align:center}.bold{font-weight:700}.bolder{font-weight:900}
.divider{border-top:1px dashed #999;margin:5px 0}
.divider2{border-top:2px solid #3b82f6;margin:6px 0}
.row{display:flex;justify-content:space-between;margin:3px 0;font-size:10px}
.total-box{background:#f0f9ff;border:2px solid #3b82f6;border-radius:6px;padding:8px;text-align:center;margin:8px 0}
.total-val{font-size:20px;font-weight:900;color:#1e40af}
table{width:100%;border-collapse:collapse;font-size:9px}
th{border-bottom:1px solid #3b82f6;padding:3px;text-align:right;font-weight:700;color:#1e40af}
td{padding:3px;border-bottom:1px dashed #ddd}
.footer{text-align:center;font-size:8px;color:#666;margin-top:8px}
@media print{@page{size:80mm auto;margin:2mm}body{width:76mm}}
</style></head><body><div class="c">
<div class="center" style="margin-bottom:8px">${logoSVG}
<div class="bolder" style="font-size:14px;color:#1e3a8a;margin-top:4px">${settings.storeName}</div>
<div style="font-size:9px;color:#555">${settings.storeSubtitle}</div></div>
<div class="divider2"></div>
<div class="row"><span class="bold">رقم الفاتورة:</span><span class="bolder">#${sale.id}</span></div>
<div class="row"><span class="bold">التاريخ:</span><span>${new Date(sale.timestamp).toLocaleString('ar-MA')}</span></div>
<div class="row"><span class="bold">الزبون:</span><span class="bold">${sale.customerName || 'زبون عابر'}</span></div>
<div class="row"><span class="bold">البائع:</span><span>${sale.sellerName || currentUser.name || currentUser.username}</span></div>
<div class="divider"></div>
<table><thead><tr><th>الصنف</th><th style="text-align:center">الكمية</th><th style="text-align:left">المجموع</th></tr></thead>
<tbody>${sale.items.map(i => `<tr><td>${truncate(i.name, 20)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:left">${(i.price * i.quantity).toFixed(2)} ${cur}</td></tr>`).join('')}</tbody></table>
<div class="divider"></div>
${sale.discount > 0 ? `<div class="row"><span>الخصم:</span><span style="color:#dc2626">-${sale.discount.toFixed(2)} ${cur}</span></div>` : ''}
<div class="total-box"><div style="font-size:10px;color:#555;margin-bottom:2px">الإجمالي النهائي</div>
<div class="total-val">${sale.total.toFixed(2)} ${cur}</div></div>
<div class="row"><span class="bold">المدفوع:</span><span>${sale.amountPaid.toFixed(2)} ${cur}</span></div>
${sale.changeDue > 0 ? `<div class="row"><span class="bold">الباقي:</span><span style="color:#059669">${sale.changeDue.toFixed(2)} ${cur}</span></div>` : ''}
<div class="row"><span class="bold">طريقة الدفع:</span><span>${sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'دين'}</span></div>
<div style="text-align:center;margin:8px 0 4px"><div style="font-size:8px;color:#555;margin-bottom:4px">رقم الفاتورة التسلسلي</div>${buildBarcodeSVGR(sale.id)}</div>
<div class="footer">شكراً لزيارتكم — © ${new Date().getFullYear()} ${settings.storeName}</div>
</div></body></html>`;

  const handlePrint = async () => {
    setLoading(true); setError('');
    try {
      const r = await printOrShare(generateHTML(), sale.id, receiptRef.current || undefined);
      if (!r.success) setError(r.error || 'خطأ في الطباعة');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!receiptRef.current) return;
    setLoading(true); setError('');
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 3, useCORS: true, backgroundColor: '#fff' });
      await saveImage(canvas.toDataURL('image/png', 1.0), `فاتورة_${sale.id}.png`);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[9000] flex items-center justify-center p-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="font-black text-gray-800 dark:text-white text-base">
            {t.receipt_preview || 'معاينة الفاتورة'} #{sale.id}
          </h3>
          <button onClick={onClose} className="text-gray-400 p-1 hover:text-gray-600"><X size={20} /></button>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">{error}</div>
        )}

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div ref={receiptRef} className="bg-white p-4 mx-auto w-64 font-cairo text-black rounded-xl shadow text-xs" dir="rtl">
            <div className="text-center mb-2">
              <svg width="32" height="32" viewBox="0 0 100 100" className="mx-auto mb-1" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 35V28C32 18 40 10 50 10C60 10 68 18 68 28V35" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" fill="none"/>
                <rect x="15" y="35" width="70" height="55" rx="15" fill="#3b82f6"/>
                <path d="M40 55L50 65L60 55" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <div className="font-black text-sm">{settings.storeName}</div>
              <div className="text-[9px] text-gray-400">{settings.storeSubtitle}</div>
            </div>
            <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-1.5 my-1.5 space-y-0.5">
              <div className="flex justify-between"><span className="font-bold">رقم:</span><span className="font-black">#{sale.id}</span></div>
              <div className="flex justify-between"><span>التاريخ:</span><span>{new Date(sale.timestamp).toLocaleString('ar-MA')}</span></div>
              <div className="flex justify-between"><span>الزبون:</span><span className="font-bold">{sale.customerName || 'زبون عابر'}</span></div>
            </div>
            <table className="w-full mb-1.5">
              <thead><tr className="border-b border-gray-300"><th className="text-right py-0.5 font-bold">الصنف</th><th className="text-center">الكمية</th><th className="text-left">المجموع</th></tr></thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} className="border-b border-dashed border-gray-100">
                    <td className="py-0.5 font-bold">{truncate(item.name, 16)}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-left">{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t-2 border-gray-900 pt-1 space-y-0.5">
              {sale.discount > 0 && <div className="flex justify-between text-red-500"><span>خصم:</span><span>-{sale.discount.toFixed(2)} {cur}</span></div>}
              <div className="flex justify-between font-black text-sm"><span>الإجمالي:</span><span>{sale.total.toFixed(2)} {cur}</span></div>
              <div className="flex justify-between"><span>المدفوع:</span><span>{sale.amountPaid.toFixed(2)} {cur}</span></div>
              {sale.changeDue > 0 && <div className="flex justify-between text-green-500"><span>الباقي:</span><span>{sale.changeDue.toFixed(2)} {cur}</span></div>}
              <div className="flex justify-between text-gray-500"><span>الدفع:</span><span>{sale.paymentMethod === 'cash' ? 'نقدي' : sale.paymentMethod === 'card' ? 'بطاقة' : 'دين'}</span></div>
            </div>
            <div className="mt-2 text-center">
              <InvoiceBarcode value={sale.id} width={220} height={36} showText={true} />
            </div>
            <div className="text-center text-[9px] text-gray-400 mt-1">شكراً لزيارتكم</div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handlePrint} disabled={loading}
              className="flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Printer size={15}/>}
              {t.print_receipt || 'طباعة'}
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Download size={15}/>}
              {t.save_receipt || 'حفظ PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
