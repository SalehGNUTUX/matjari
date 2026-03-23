import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Keyboard, ImageIcon } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  t?: any;
}

const isNativeAndroid = () =>
  !!(window as any).Capacitor?.isNativePlatform?.() &&
  (window as any).Capacitor?.getPlatform?.() === 'android';

// Decode barcode from canvas using jsQR + html5-qrcode as fallback
async function decodeFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const jsQR = (await import('jsqr')).default;
    const ctx  = canvas.getContext('2d')!;
    const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (result?.data) return result.data;
    // Try inverted
    const result2 = jsQR(img.data, img.width, img.height, { inversionAttempts: 'onlyInvert' });
    if (result2?.data) return result2.data;
  } catch {}
  return null;
}

// Convert dataUrl to canvas
function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      // Scale down large images for performance
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const r = Math.min(MAX / w, MAX / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Try html5-qrcode file scan as secondary fallback
async function h5ScanFile(file: File): Promise<string | null> {
  const tmpId = 'bsc-h5-' + Date.now();
  const tmp   = document.createElement('div');
  tmp.id = tmpId;
  tmp.style.cssText = 'position:fixed;top:-9999px;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(tmp);
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode(tmpId);
    const result  = await scanner.scanFileV2(file, false);
    try { scanner.clear(); } catch {}
    document.body.removeChild(tmp);
    return result?.decodedText || null;
  } catch {
    try { document.body.removeChild(tmp); } catch {}
    return null;
  }
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan, onClose,
  title = 'مسح منتج',
  hint  = 'وجّه الكاميرا نحو باركود المنتج',
  t = {}
}) => {
  const [mode, setMode]       = useState<'camera' | 'image' | 'manual'>('camera');
  const [manual, setManual]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef            = useRef<any>(null);
  const fileRef               = useRef<HTMLInputElement>(null);
  const readerId              = 'bsc-web-reader';

  const success = (code: string) => { onScan(code); onClose(); };

  // ── Main image processing pipeline ─────────────────────────
  const processImageDataUrl = async (dataUrl: string) => {
    setLoading(true); setError('');
    try {
      // 1. Try jsQR (fast, works on canvas)
      const canvas = await dataUrlToCanvas(dataUrl);
      const code   = await decodeFromCanvas(canvas);
      if (code) { success(code); return; }

      // 2. Try html5-qrcode with file
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'scan.jpg', { type: blob.type || 'image/jpeg' });
      const code2 = await h5ScanFile(file);
      if (code2) { success(code2); return; }

      setError('لم يتم التعرف على الرمز — حاول مع صورة أوضح أو أدخله يدوياً');
    } catch (e: any) {
      setError('خطأ في معالجة الصورة — حاول مرة أخرى');
    }
    setLoading(false);
  };

  // ── Android: take photo ──────────────────────────────────────
  const androidCapture = async () => {
    setLoading(true); setError('');
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        allowEditing: false,
        correctOrientation: true,
        width: 1200,
      });
      if (photo.dataUrl) {
        await processImageDataUrl(photo.dataUrl);
      }
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes('cancel')) {
        setError(e.message || t.camera_error || 'خطأ في الكاميرا');
      }
      setLoading(false);
    }
  };

  // ── Android: pick from gallery ───────────────────────────────
  const androidGallery = async () => {
    setLoading(true); setError('');
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        allowEditing: false,
        correctOrientation: true,
      });
      if (photo.dataUrl) await processImageDataUrl(photo.dataUrl);
      else setLoading(false);
    } catch (e: any) {
      if (!e.message?.toLowerCase().includes('cancel')) {
        setError(e.message || 'خطأ في المعرض');
      }
      setLoading(false);
    }
  };

  // ── Web: start html5-qrcode inline scanner ───────────────────
  const startWebCamera = async () => {
    setLoading(true); setError('');
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      setError(t.camera_permission_hint || 'تأكد من منح إذن الكاميرا');
      setLoading(false); return;
    }
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const scanner = new Html5QrcodeScanner(
        readerId,
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true, showTorchButtonIfSupported: true },
        false
      );
      scanner.render((code: string) => {
        try { scanner.clear(); } catch {}
        success(code);
      }, () => {});
      scannerRef.current = scanner;
    } catch (e: any) {
      setError(e.message || t.camera_error || 'خطأ في الكاميرا');
    }
    setLoading(false);
  };

  // ── Web: pick file ───────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (ev.target?.result) await processImageDataUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (mode !== 'camera') return;
    if (!isNativeAndroid()) startWebCamera();
    return () => {
      if (scannerRef.current) { try { scannerRef.current.clear(); } catch {}; scannerRef.current = null; }
    };
  }, [mode]);

  const tabs = [
    { key: 'camera' as const, icon: '📷', label: t.scan_barcode || 'كاميرا' },
    { key: 'image'  as const, icon: '🖼',  label: 'صورة' },
    { key: 'manual' as const, icon: '⌨',  label: t.manual_barcode || 'يدوي' },
  ];

  return (
    <div className="fixed inset-0 bg-black/92 z-[5000] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex items-center justify-between mb-3">
        <h3 className="text-white font-black text-base">{title}</h3>
        <button onClick={onClose} className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10"><X size={20}/></button>
      </div>

      <div className="flex gap-1 mb-3 bg-white/10 p-1 rounded-2xl">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setMode(tab.key); setError(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${mode === tab.key ? 'bg-primary text-white shadow' : 'text-white/60 hover:text-white'}`}>
            <span style={{ fontSize: 14 }}>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm">
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-2xl p-3 mb-3 text-center">{error}</div>
        )}
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
            <p className="text-white/60 text-sm">جاري المعالجة...</p>
          </div>
        )}

        {/* Camera tab */}
        {mode === 'camera' && !loading && (
          isNativeAndroid() ? (
            <div className="bg-white/5 rounded-2xl p-8 text-center space-y-4">
              <p className="text-white/60 text-sm">{hint}</p>
              <button onClick={androidCapture}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3">
                <Camera size={22}/> {t.scan_barcode || 'فتح الكاميرا'}
              </button>
            </div>
          ) : (
            <div className="bg-white/5 rounded-2xl overflow-hidden">
              {!error && <div id={readerId} className="w-full"/>}
            </div>
          )
        )}

        {/* Image tab */}
        {mode === 'image' && !loading && (
          <div className="bg-white/5 rounded-2xl p-8 text-center space-y-4">
            <ImageIcon size={44} className="text-white/30 mx-auto"/>
            <p className="text-white/60 text-sm">اختر صورة تحتوي على باركود أو QR</p>
            {isNativeAndroid() ? (
              <div className="space-y-3">
                <button onClick={androidGallery}
                  className="w-full bg-primary text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2">
                  <ImageIcon size={18}/> اختر من المعرض
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="w-full bg-primary text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2">
                  <ImageIcon size={18}/> اختر صورة
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
              </>
            )}
          </div>
        )}

        {/* Manual tab */}
        {mode === 'manual' && !loading && (
          <div className="bg-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-white/60 text-sm text-center">أدخل الرمز يدوياً</p>
            <input autoFocus value={manual} onChange={e => setManual(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && manual.trim() && success(manual.trim())}
              placeholder="0123456789..."
              className="w-full px-4 py-3.5 rounded-xl bg-white/10 text-white text-center text-xl font-mono outline-none border-2 border-transparent focus:border-primary"
            />
            <button onClick={() => manual.trim() && success(manual.trim())} disabled={!manual.trim()}
              className="w-full bg-primary text-white py-3 rounded-xl font-black disabled:opacity-50 text-base">
              ✓ {t.confirm || 'تأكيد'}
            </button>
          </div>
        )}
      </div>
      <p className="text-white/30 text-xs mt-4 text-center max-w-xs">{hint}</p>
    </div>
  );
};
