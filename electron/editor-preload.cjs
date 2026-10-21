'use strict';

/**
 * The editor window's only API: receive an image, hand one back, or close.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('barEditor', {
  onImage: (handler) => {
    ipcRenderer.on('editor:image', (_event, dataUrl) => handler(dataUrl));
  },
  onTheme: (handler) => {
    ipcRenderer.on('editor:theme', (_event, theme) => handler(theme));
  },
  save: (dataUrl) => ipcRenderer.invoke('editor:save', dataUrl),
  cancel: () => ipcRenderer.invoke('editor:cancel'),
});
