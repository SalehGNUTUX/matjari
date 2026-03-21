import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, ScanLine as QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  t?: any;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, title, hint, t = {} }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState<string>('');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const containerId = 'barcode-scanner-container';

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        // Request camera permission explicitly first (critical for Android)
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (permErr: any) {
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            setError(t.camera_permission_hint || 'تأكد من منح إذن الكاميرا للمتصفح');
            setIsStarting(false);
            return;
          }
        }
        const devices = await Html5Qrcode.getCameras();
        if (devices.length === 0) {
          setError(t.no_camera || 'لا توجد كاميرا متاحة');
          setIsStarting(false);
          return;
        }

        // Prefer back camera on mobile
        const backCamera = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('خلفية')
        );
        const cameraId = backCamera?.id || devices[devices.length - 1].id;

        setCameras(devices.map(d => ({ id: d.id, label: d.label || `كاميرا ${d.id.slice(-4)}` })));
        setSelectedCamera(cameraId);

        scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          cameraId,
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.65;
              return { width: Math.round(size), height: Math.round(size) };
            },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            setScanned(decodedText);
            // Short feedback then close
            setTimeout(() => {
              onScan(decodedText);
              stopScanner(scanner!);
            }, 500);
          },
          () => {}
        );
        setIsStarting(false);
      } catch (err: any) {
        setError(err?.message || t.camera_error || 'خطأ في الكاميرا');
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      if (scanner) stopScanner(scanner);
    };
  }, []);

  const stopScanner = async (s: Html5Qrcode) => {
    try {
      if (s.getState && s.getState() === Html5QrcodeScannerState.SCANNING) {
        await s.stop();
      }
      s.clear();
    } catch {}
  };

  const switchCamera = async (cameraId: string) => {
    if (!scannerRef.current) return;
    setSelectedCamera(cameraId);
    try {
      await scannerRef.current.stop();
      await scannerRef.current.start(
        cameraId,
        { fps: 15, qrbox: 250 },
        (decodedText) => {
          setScanned(decodedText);
          setTimeout(() => { onScan(decodedText); }, 500);
        },
        () => {}
      );
    } catch (err: any) {
      setError(err?.message || 'فشل تبديل الكاميرا');
    }
  };

  const handleClose = () => {
    if (scannerRef.current) stopScanner(scannerRef.current);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <QrCode size={22} className="text-primary" />
          <div>
            <div className="font-bold text-sm">{title || t.scan_barcode || 'مسح الباركود'}</div>
            {hint && <div className="text-xs text-gray-400">{hint}</div>}
          </div>
        </div>
        <button onClick={handleClose} className="text-white p-2 hover:text-red-400">
          <X size={24} />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center relative">
        {isStarting && (
          <div className="text-white text-center">
            <Camera size={48} className="mx-auto mb-3 animate-pulse" />
            <p>{t.starting_camera || 'جاري تشغيل الكاميرا...'}</p>
          </div>
        )}

        {error && (
          <div className="text-center p-8">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-3" />
            <p className="text-white font-bold mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-4">
              {t.camera_permission_hint || 'تأكد من منح إذن الكاميرا للمتصفح'}
            </p>
            <button
              onClick={handleClose}
              className="bg-primary text-white px-6 py-2 rounded-xl font-bold"
            >
              {t.close || 'إغلاق'}
            </button>
          </div>
        )}

        {scanned && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 z-10">
            <div className="text-center text-white">
              <CheckCircle size={64} className="mx-auto mb-3" />
              <p className="text-xl font-black">{t.scan_success || 'تم المسح!'}</p>
              <p className="text-lg mt-2 font-mono bg-white/20 px-4 py-2 rounded-lg">{scanned}</p>
            </div>
          </div>
        )}

        <div id={containerId} className="w-full max-w-md" />

        {/* Corner guides overlay */}
        {!error && !scanned && !isStarting && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-56 h-56">
              {/* Corner marks */}
              {[
                'top-0 left-0 border-t-4 border-l-4',
                'top-0 right-0 border-t-4 border-r-4',
                'bottom-0 left-0 border-b-4 border-l-4',
                'bottom-0 right-0 border-b-4 border-r-4',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-primary ${cls} rounded-sm`} />
              ))}
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-primary animate-bounce top-1/2" />
            </div>
          </div>
        )}
      </div>

      {/* Camera switcher */}
      {cameras.length > 1 && !error && (
        <div className="p-4 bg-black/80 flex gap-2 overflow-x-auto">
          {cameras.map(cam => (
            <button
              key={cam.id}
              onClick={() => switchCamera(cam.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 ${
                selectedCamera === cam.id ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              <Camera size={14} />
              {cam.label.slice(0, 20)}
            </button>
          ))}
        </div>
      )}

      {/* Manual input fallback */}
      <div className="p-4 bg-black/80">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t.manual_barcode || 'أدخل الرمز يدوياً...'}
            className="flex-1 bg-gray-800 text-white px-3 py-2.5 rounded-xl text-sm border border-gray-600 focus:outline-none focus:border-primary"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                onScan((e.target as HTMLInputElement).value);
                handleClose();
              }
            }}
          />
          <button
            onClick={handleClose}
            className="bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            {t.cancel || 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
};
