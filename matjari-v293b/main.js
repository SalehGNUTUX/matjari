const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ─── Linux Wayland ──────────────────────────────────────────────
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('disable-gpu-sandbox');

// ─── Portable mode ──────────────────────────────────────────────
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR;
if (isPortable) {
  const portableDir = path.join(path.dirname(process.execPath), 'MatjariData');
  if (!fs.existsSync(portableDir)) fs.mkdirSync(portableDir, { recursive: true });
  app.setPath('userData', portableDir);
}

let mainWindow = null;

// ─── PRINT (AppImage-safe) ──────────────────────────────────────
// Strategy: write HTML to a temp file → open with system browser (xdg-open)
// This is the most reliable approach for AppImage on Linux.
// The system browser (Firefox / Chrome) handles the print dialog natively.
ipcMain.handle('print-invoice', async (event, htmlContent) => {
  try {
    const tmpPath = path.join(os.tmpdir(), `matjari-invoice-${Date.now()}.html`);
    fs.writeFileSync(tmpPath, htmlContent, 'utf-8');

    // shell.openPath uses xdg-open on Linux → opens in default browser
    const err = await shell.openPath(tmpPath);
    if (err) {
      // Fallback: try shell.openExternal with file:// URL
      await shell.openExternal(`file://${tmpPath}`);
    }

    // Clean up temp file after delay
    setTimeout(() => { try { fs.unlinkSync(tmpPath); } catch {} }, 60000);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Save file ──────────────────────────────────────────────────
ipcMain.handle('save-file', async (event, { content, filename, filters }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: filename,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, path: filePath };
    }
    return { success: false, cancelled: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Misc ────────────────────────────────────────────────────────
ipcMain.handle('get-platform',    () => process.platform);
ipcMain.handle('get-app-version', () => app.getVersion());

// ─── Main window ────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 360, minHeight: 600,
    icon: iconPath,
    title: 'MATJARI | متجري',
    backgroundColor: '#0a0f1a',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  if (process.platform === 'linux' && fs.existsSync(iconPath)) {
    try { mainWindow.setIcon(nativeImage.createFromPath(iconPath)); } catch {}
  }

  // Permissions
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(['media','camera','microphone','notifications','clipboard-read','clipboard-write'].includes(permission));
  });
  mainWindow.webContents.session.setPermissionCheckHandler(() => true);

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
