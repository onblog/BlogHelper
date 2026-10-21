'use strict';

/**
 * bar-tool — macOS menu bar shell.
 *
 * The app has no dock icon and no main window: a tray icon owns a single
 * frameless panel that is positioned right below it. This file owns window
 * lifecycle, tray, shortcuts and the IPC surface; clipboard reading lives in
 * clipboard.cjs and the tools live in actions/.
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  shell,
} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const clipboardBridge = require('./clipboard.cjs');
const actions = require('./actions/index.cjs');

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 600;
const PANEL_MARGIN = 6;
const PANEL_EDGE = 8;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const projectRoot = path.join(__dirname, '..');

/** @type {Tray | null} */
let tray = null;
/** @type {BrowserWindow | null} */
let panel = null;
let quitting = false;
/** Clipboard contents from before the last action, so it can be undone. */
let undoSource = null;

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

/* ---------- IPC surface ---------- */

/**
 * Everything the panel needs in one round trip: what is on the clipboard, what
 * it can become, and whether the last action can still be undone.
 */
async function buildState() {
  const source = await clipboardBridge.readSource();

  return {
    version: app.getVersion(),
    preview: clipboardBridge.toPreview(source),
    actions: actions.listFor(source),
    groups: actions.GROUP_ORDER,
    canUndo: Boolean(undoSource),
  };
}

async function runAction(id) {
  const action = actions.get(id);
  if (!action) return { ok: false, error: 'unknown_action' };

  const source = await clipboardBridge.readSource();
  if (!action.accepts.includes(source.kind)) return { ok: false, error: 'not_applicable' };

  const result = action.run(source);
  if (result.error) return { ok: false, error: result.error };

  if (typeof result.text === 'string') {
    await clipboardBridge.writeText(result.text);
  } else if (result.image) {
    await clipboardBridge.writeImage(result.image);
  } else {
    return { ok: false, error: 'empty_result' };
  }

  undoSource = source;
  return { ok: true };
}

async function undoLast() {
  if (!undoSource) return { ok: false, error: 'nothing_to_undo' };

  const target = undoSource;
  undoSource = null;
  await clipboardBridge.restore(target);
  return { ok: true };
}

function registerIpc() {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    locale: app.getLocale(),
    dev: isDev,
    actionCount: actions.count,
  }));

  ipcMain.handle('panel:state', () => buildState());

  ipcMain.handle('action:run', async (_event, id) => {
    const result = await runAction(id);
    return { ...result, state: await buildState() };
  });

  ipcMain.handle('action:undo', async () => {
    const result = await undoLast();
    return { ...result, state: await buildState() };
  });

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
  // Option+Command+V — show/hide the panel.
  globalShortcut.register('Alt+Command+V', togglePanel);

  // Option+Command+Z — undo the last action, even while the panel is hidden.
  globalShortcut.register('Alt+Command+Z', async () => {
    if (!undoSource) return;
    await undoLast();
    panel?.webContents.send('panel:refresh');
  });
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

  // Optionally exercise an action before the screenshot: proves the click path.
  if (process.env.BAR_TOOL_CLICK) {
    await panel.webContents.executeJavaScript(
      `document.querySelector('[data-id="${process.env.BAR_TOOL_CLICK}"]')?.click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }

  const image = await panel.webContents.capturePage();
  await fs.writeFile(target, image.toPNG());
  console.log(`[capture] wrote ${target}`);
  app.quit();
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
