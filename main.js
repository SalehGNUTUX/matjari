const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// ==================== تعطيل GPU نهائياً ====================
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

// ==================== حل مشكلة Wayland/Linux ====================
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
  app.commandLine.appendSwitch('ozone-platform', 'x11');
}

// ==================== دعم النسخة المحمولة (Portable) ====================
const isPortable = process.env.PORTABLE_EXECUTABLE_DIR ||
(process.platform === 'win32' &&
process.execPath.includes('portable'));

if (isPortable) {
  console.log('📦 تشغيل النسخة المحمولة...');
  const portableDataPath = path.join(path.dirname(process.execPath), 'data');
  app.setPath('userData', portableDataPath);
  app.setPath('sessionData', portableDataPath);
  app.setPath('logs', path.join(portableDataPath, 'logs'));
}

// ==================== تنظيف البيانات عند أول تشغيل ====================
const userDataPath = app.getPath('userData');
const firstRunFlag = path.join(userDataPath, '.first-run');

if (!fs.existsSync(firstRunFlag)) {
  console.log('🧹 أول تشغيل - تنظيف البيانات...');
  try {
    fs.rmSync(userDataPath, { recursive: true, force: true });
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(firstRunFlag, 'first-run');
    console.log('✅ تم تنظيف البيانات');
  } catch (error) {
    console.error('❌ فشل تنظيف البيانات:', error);
  }
}

// ==================== إنشاء نافذة التطبيق ====================
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'public/icon.png'),
                                webPreferences: {
                                  nodeIntegration: false,
                                  contextIsolation: true
                                }
  });

  win.loadFile(path.join(__dirname, 'dist/index.html'));

  if (process.platform === 'linux') {
    win.setIcon(path.join(__dirname, 'public/icon.png'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
