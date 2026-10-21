'use strict';

/**
 * bar-tool — macOS menu bar shell.
 *
 * The app has no dock icon and no main window: a tray icon owns a single
 * frameless panel that is positioned right below it. Every heavy feature
 * (bucket upload, clipboard history) is implemented behind IPC handlers in
 * later milestones; this file only owns window lifecycle, tray, shortcuts
 * and the clipboard read used by the preview.
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  clipboard,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  shell,
} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 528;
const PANEL_MARGIN = 6;
const PANEL_EDGE = 8;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const projectRoot = path.join(__dirname, '..');

/** @type {Tray | null} */
let tray = null;
/** @type {BrowserWindow | null} */
let panel = null;
let quitting = false;

function trayImage() {
  const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png'));
  // Template images are recoloured by macOS, so one monochrome file works in
  // both light and dark menu bars.
  image.setTemplateImage(true);
  return image;
}

function createPanel() {
  panel = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  panel.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (isDev) {
    panel.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    panel.loadFile(path.join(projectRoot, 'dist', 'index.html'));
  }

  // The renderer polls the clipboard only while it is on screen.
  panel.on('show', () => panel?.webContents.send('panel:visibility', true));
  panel.on('hide', () => panel?.webContents.send('panel:visibility', false));

  // Clicking anywhere else on the desktop dismisses the panel, like every
  // other menu bar popover on macOS.
  panel.on('blur', () => {
    if (!panel.webContents.isDevToolsOpened()) hidePanel();
  });

  panel.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      hidePanel();
    }
  });
}

function positionPanel() {
  if (!tray || !panel) return;

  const bounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
  const area = display.workArea;

  const centered = Math.round(bounds.x + bounds.width / 2 - PANEL_WIDTH / 2);
  const x = Math.max(
    area.x + PANEL_EDGE,
    Math.min(centered, area.x + area.width - PANEL_WIDTH - PANEL_EDGE),
  );
  const y = Math.round(bounds.y + bounds.height + PANEL_MARGIN);

  panel.setPosition(x, y, false);
}

function showPanel() {
  if (!panel) return;
  positionPanel();
  panel.show();
  panel.focus();
}

function hidePanel() {
  if (panel?.isVisible()) panel.hide();
}

function togglePanel() {
  if (panel?.isVisible()) hidePanel();
  else showPanel();
}

function contextMenu() {
  return Menu.buildFromTemplate([
    { label: '打开吧台', click: showPanel },
    { label: '设置…', click: showPanel },
    { type: 'separator' },
    {
      label: '使用文档',
      click: () => shell.openExternal('https://tool.wordtk.com/docs'),
    },
    {
      label: 'GitHub',
      click: () => shell.openExternal('https://github.com/onblog/bar-tool'),
    },
    { type: 'separator' },
    { label: `版本 ${app.getVersion()}`, enabled: false },
    { label: '退出', accelerator: 'Command+Q', click: () => app.quit() },
  ]);
}

function createTray() {
  tray = new Tray(trayImage());
  tray.setToolTip('吧台 · bar-tool');
  tray.on('click', togglePanel);
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu()));
}

/**
 * Read the clipboard and describe it for the panel preview.
 *
 * Electron 44+ models the clipboard after the web standard: `read()` resolves
 * to ClipboardItem entries whose `getType()` yields a Blob. One path only —
 * there is no synchronous fallback to keep in sync.
 */
async function readClipboard() {
  let items = [];
  try {
    items = await clipboard.read();
  } catch (error) {
    console.error('clipboard.read failed', error);
  }

  const imageItem = items.find((item) => item.types.some((type) => type.startsWith('image/')));
  if (imageItem) {
    const type =
      imageItem.types.find((candidate) => candidate === 'image/png') ??
      imageItem.types.find((candidate) => candidate.startsWith('image/'));

    const blob = await imageItem.getType(type);
    const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer()));

    if (!image.isEmpty()) {
      const { width, height } = image.getSize();
      const scale = Math.min(1, 720 / Math.max(width, height));
      const preview = scale < 1 ? image.resize({ width: Math.round(width * scale) }) : image;
      return {
        kind: 'image',
        width,
        height,
        dataUrl: preview.toDataURL(),
      };
    }
  }

  const text = await clipboard.readText();
  if (text.trim()) {
    return {
      kind: 'text',
      length: text.length,
      text: text.slice(0, 4000),
    };
  }

  return { kind: 'empty' };
}

/**
 * Development helper: BAR_TOOL_CAPTURE=<png> opens the panel, saves a PNG of it
 * and quits. BAR_TOOL_LANG=zh|en forces the UI language first, which is how the
 * bilingual screenshots for the README are produced without a mouse.
 */
async function devCapture(target) {
  showPanel();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const forced = process.env.BAR_TOOL_LANG;
  if (forced === 'zh' || forced === 'en') {
    await panel.webContents.executeJavaScript(
      `localStorage.setItem('bar-tool.lang', ${JSON.stringify(forced)}); location.reload();`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  const image = await panel.webContents.capturePage();
  await fs.writeFile(target, image.toPNG());
  console.log(`[capture] wrote ${target}`);
  app.quit();
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    locale: app.getLocale(),
    dev: isDev,
  }));

  ipcMain.handle('clipboard:read', () => readClipboard());

  ipcMain.handle('panel:hide', () => {
    hidePanel();
  });

  ipcMain.handle('app:open-external', (_event, url) => {
    if (typeof url !== 'string' || !/^https:\/\//.test(url)) return false;
    shell.openExternal(url);
    return true;
  });
}

function registerShortcuts() {
  // Option+Command+U — upload whatever image is on the clipboard.
  globalShortcut.register('Alt+Command+U', () => {
    showPanel();
    panel?.webContents.send('shortcut:upload');
  });

  // Option+Command+V — show/hide the panel.
  globalShortcut.register('Alt+Command+V', togglePanel);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showPanel);

  app.whenReady().then(() => {
    // A menu bar app never shows a dock icon.
    app.dock?.hide();
    app.setName('吧台');

    createPanel();
    createTray();
    registerIpc();
    registerShortcuts();

    app.on('activate', showPanel);

    if (process.env.BAR_TOOL_CAPTURE) {
      devCapture(process.env.BAR_TOOL_CAPTURE).catch((error) => {
        console.error('[capture] failed', error);
        app.quit();
      });
    }
  });

  app.on('window-all-closed', () => {
    // The tray keeps the app alive even with every window closed.
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
