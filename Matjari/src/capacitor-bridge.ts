/**
 * Matjari Capacitor Bridge
 * Handles platform-specific: print, save, camera
 */

const isNativeAndroid = (): boolean =>
  !!(window as any).Capacitor?.isNativePlatform?.() &&
  (window as any).Capacitor?.getPlatform?.() === 'android';

const isElectron = (): boolean => !!(window as any).electronAPI;

// ─────────────────────────────────────────────────────────────────
// PRINT
// ─────────────────────────────────────────────────────────────────
export const printOrShare = async (
  htmlContent: string,
  saleId: string
): Promise<{ success: boolean; error?: string }> => {

  // ── Electron / AppImage ───────────────────────────────────────
  // main.js writes to temp HTML → xdg-open → system browser prints
  if (isElectron()) {
    try {
      const r = await (window as any).electronAPI.printInvoice(htmlContent);
      return r;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ── Android Native ────────────────────────────────────────────
  // Save as HTML file → Share with MIME text/html
  // Android shows: Print / Gmail / Drive / WhatsApp etc.
  // Printer apps (Brother, HP, etc.) also appear in this list.
  if (isNativeAndroid()) {
    try {
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const filename = `Matjari_Invoice_${saleId}.html`;

      // Write to cache directory
      await Filesystem.writeFile({
        path: filename,
        data: htmlContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const { uri } = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });

      // Share — Android will show all apps that handle HTML/print
      await Share.share({
        title: `فاتورة متجري #${saleId}`,
        url: uri,
        dialogTitle: 'طباعة أو مشاركة الفاتورة',
      });

      return { success: true };
    } catch (e: any) {
      // Fallback to window.print() inside an iframe
      return androidIframePrint(htmlContent);
    }
  }

  // ── Web / PWA ─────────────────────────────────────────────────
  return webBlobPrint(htmlContent, saleId);
};

// Uses a hidden iframe + window.print() — works in most mobile browsers
function androidIframePrint(
  html: string
): { success: boolean; error?: string } {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;border:0;';
    document.body.appendChild(iframe);
    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    }, 800);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function webBlobPrint(
  html: string,
  saleId: string
): { success: boolean; error?: string } {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const w    = window.open(url, '_blank');
    if (w) { setTimeout(() => URL.revokeObjectURL(url), 30000); return { success: true }; }
    // Popup blocked → download
    const a = document.createElement('a');
    a.href = url; a.download = `Invoice_${saleId}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// SAVE IMAGE
// ─────────────────────────────────────────────────────────────────
export const saveImage = async (
  dataUrl: string,
  filename: string
): Promise<{ success: boolean }> => {
  if (isNativeAndroid()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const base64 = dataUrl.split(',')[1];
      // Try Downloads directory first
      try {
        await Filesystem.writeFile({
          path: `Download/${filename}`,
          data: base64,
          directory: Directory.ExternalStorage,
        });
        return { success: true };
      } catch {
        // Fallback to cache
        await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });
        return { success: true };
      }
    } catch { /* fallback below */ }
  }
  // Web fallback
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename; a.click();
  return { success: true };
};

// ─────────────────────────────────────────────────────────────────
// CAMERA PERMISSION
// ─────────────────────────────────────────────────────────────────
export const requestCameraPermission = async (): Promise<boolean> => {
  if (isNativeAndroid()) {
    try {
      const { Camera } = await import('@capacitor/camera');
      const s = await Camera.requestPermissions({ permissions: ['camera'] });
      return s.camera === 'granted';
    } catch { return false; }
  }
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    return true;
  } catch { return false; }
};
