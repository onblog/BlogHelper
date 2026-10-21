'use strict';

/**
 * The panel talks to the main process through this narrow, serialisable API.
 * No Node primitives are exposed to the renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bar', {
  info: () => ipcRenderer.invoke('app:info'),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  hide: () => ipcRenderer.invoke('panel:hide'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  onShortcutUpload: (handler) => {
    ipcRenderer.on('shortcut:upload', () => handler());
  },
  onVisibility: (handler) => {
    ipcRenderer.on('panel:visibility', (_event, visible) => handler(visible));
  },
});
