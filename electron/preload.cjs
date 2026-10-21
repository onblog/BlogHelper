'use strict';

/**
 * The panel talks to the main process through this narrow, serialisable API.
 * No Node primitives are exposed to the renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bar', {
  info: () => ipcRenderer.invoke('app:info'),

  /** Current clipboard preview + the actions that apply to it. */
  state: () => ipcRenderer.invoke('panel:state'),

  /** Run one action; resolves with the fresh state so the panel can repaint. */
  run: (id) => ipcRenderer.invoke('action:run', id),
  undo: () => ipcRenderer.invoke('action:undo'),

  /** Clipboard history. */
  historyAll: () => ipcRenderer.invoke('history:all'),
  historyRestore: (id) => ipcRenderer.invoke('history:restore', id),
  historyClear: () => ipcRenderer.invoke('history:clear'),

  /** Settings. */
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),

  hide: () => ipcRenderer.invoke('panel:hide'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  onVisibility: (handler) => {
    ipcRenderer.on('panel:visibility', (_event, visible) => handler(visible));
  },
  onRefresh: (handler) => {
    ipcRenderer.on('panel:refresh', () => handler());
  },
  onView: (handler) => {
    ipcRenderer.on('panel:view', (_event, view) => handler(view));
  },
});
