const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printInvoice: (html) => ipcRenderer.invoke('print-invoice', html),
  saveFile: (opts) => ipcRenderer.invoke('save-file', opts),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  on: (channel, cb) => {
    const valid = ['print-completed', 'print-failed', 'update-available'];
    if (valid.includes(channel)) ipcRenderer.on(channel, (e, ...a) => cb(e, ...a));
  },
  off: (channel, cb) => {
    ipcRenderer.removeListener(channel, cb);
  }
});

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isElectron: true
});
