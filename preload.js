// preload.js
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    platform: process.platform
});
