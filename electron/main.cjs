'use strict';

/**
 * bar-tool — macOS menu bar shell.
 *
 * The app has no dock icon and no main window: a tray icon owns a single
 * frameless panel that is positioned right below it. This file owns window
 * lifecycle, tray, shortcuts and the IPC surface; clipboard reading lives in
 * clipboard.cjs, the tools in actions/, and history/settings in their own
 * Electron-free modules.
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  globalShortcut,
  ipcMain,
  nativeImage,
  safeStorage,
  systemPreferences,
  screen,
  shell,
} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const clipboardBridge = require('./clipboard.cjs');
const actions = require('./actions/index.cjs');
const { HistoryStore } = require('./history.cjs');
const { SettingsStore } = require('./settings.cjs');
const { ClipboardWatcher } = require('./watcher.cjs');
const { BucketStore } = require('./storage.cjs');
const sigv4 = require('./sigv4.cjs');

const execFileAsync = promisify(execFile);
const SCREENSHOT_BIN = '/usr/sbin/screencapture';
const CAPTURE_SHORTCUT = 'Command+Shift+S';
const SCREENSHOT_SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';

/** Labels for the capture overlay's annotation toolbar. */
const SCREENSHOT_LANG = {
  magnifier_position_label: '位置',
  operation_ok_title: '完成',
  operation_cancel_title: '取消',
  operation_save_title: '保存',
  operation_undo_title: '撤销',
  operation_redo_title: '重做',
  operation_mosaic_title: '马赛克',
  operation_text_title: '文字',
  operation_brush_title: '画笔',
  operation_arrow_title: '箭头',
  operation_ellipse_title: '椭圆',
  operation_rectangle_title: '矩形',
};

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 700;
const PANEL_MARGIN = 6;
const PANEL_EDGE = 8;
const THUMB_WIDTH = 96;

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const projectRoot = path.join(__dirname, '..');

/** @type {Tray | null} */
let tray = null;
/** @type {BrowserWindow | null} */
let panel = null;
let quitting = false;
/** Clipboard contents from before the last action, so it can be undone. */
let undoSource = null;

/** @type {HistoryStore | null} */
let history = null;
/** @type {SettingsStore | null} */
let settings = null;
/** @type {ClipboardWatcher | null} */
let watcher = null;
/** @type {BucketStore | null} */
let buckets = null;
/** @type {BrowserWindow | null} */
let editorWindow = null;
let capturing = false;
/** Buffer from the overlay, held until the overlay has actually hidden. */
let pendingCapture = null;
/** @type {import('electron-screenshots').default | null} */
let screenshotTool = null;
let screenshotToolBroken = false;

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
    // The sticker look paints its own paper; no window material behind it.
    vibrancy: undefined,
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
    { label: '截图到剪贴板', accelerator: CAPTURE_SHORTCUT, click: () => runCapture() },
    { label: '设置…', click: () => openSettings() },
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

/** Ask the renderer to switch to a named view (used by the tray menu). */
function openSettings() {
  showPanel();
  panel?.webContents.send('panel:view', 'settings');
}

/* ---------- history ---------- */

async function thumbOf(buffer) {
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) return { thumb: null, width: null, height: null };

  const { width, height } = image.getSize();
  return {
    thumb: image.resize({ width: Math.min(THUMB_WIDTH, width) }).toPNG(),
    width,
    height,
  };
}

async function recordItem(entry) {
  if (!history || !settings?.get().historyEnabled) return null;

  if (entry.kind === 'text') return history.addText(entry.text);

  const { thumb, width, height } = await thumbOf(entry.buffer);
  return history.addImage({ buffer: entry.buffer, thumb, width, height, mime: entry.mime });
}

async function historyList() {
  if (!history) return [];
  const items = history.list();

  // Thumbnails are only shipped to the renderer when the full list is opened.
  const out = [];
  for (const item of items) {
    if (!item.thumbFile) {
      out.push({ ...item, thumb: null });
      continue;
    }
    const buffer = await history.readThumb(item.id);
    out.push({
      ...item,
      thumb: buffer ? `data:image/png;base64,${buffer.toString('base64')}` : null,
    });
  }
  return out;
}

async function restoreHistory(id) {
  if (!history) return { ok: false, error: 'not_found' };

  const payload = await history.read(id);
  if (!payload) return { ok: false, error: 'not_found' };

  if (payload.kind === 'text') {
    await clipboardBridge.writeText(payload.text);
    watcher?.expectText(payload.text);
  } else {
    await clipboardBridge.writeImage(payload);
    watcher?.skipNextImage();
  }

  return { ok: true };
}

/* ---------- screenshots ---------- */

function notifyPanel(key, detail) {
  showPanel();
  panel?.webContents.send('panel:notice', { key, detail });
}

/**
 * The annotation overlay, ported rather than written.
 *
 * `electron-screenshots` freezes every display, lets you drag a region and
 * annotate it (rectangle, ellipse, arrow, brush, text, mosaic, undo/redo) and
 * hands back a PNG buffer — the part that is genuinely hard to get right across
 * multiple displays and Retina scaling.
 */
function getScreenshotTool() {
  if (screenshotTool) return screenshotTool;
  if (screenshotToolBroken) return null;

  try {
    const Screenshots = require('electron-screenshots');
    screenshotTool = new Screenshots({ singleWindow: true, lang: SCREENSHOT_LANG });

    // The overlay emits `ok` *before* it resets and hides itself. Showing the
    // panel from inside that handler stole focus back to the overlay while it was
    // still a kiosk window, which made it reappear in selection mode. The buffer
    // is parked here and the hand-off happens only once the overlay is gone.
    screenshotTool.on('ok', (_event, buffer) => {
      pendingCapture = buffer;
    });

    screenshotTool.on('cancel', () => {
      pendingCapture = null;
      capturing = false;
    });

    screenshotTool.on('windowCreated', ($win) => {
      const settled = () => {
        const buffer = pendingCapture;
        pendingCapture = null;
        capturing = false;
        if (!buffer?.length) return;

        // One beat for the overlay's own teardown, then the panel may take focus.
        setTimeout(() => {
          capturedToClipboard(buffer).catch((error) => {
            console.error('capture handoff failed', error);
          });
        }, 140);
      };

      $win.on('hide', settled);
      $win.on('closed', settled);
    });

    return screenshotTool;
  } catch (error) {
    // A missing native binary must not take the whole capture feature down.
    console.error('annotation overlay unavailable, falling back to the system selector', error);
    screenshotToolBroken = true;
    return null;
  }
}

async function capturedToClipboard(buffer) {
  capturing = false;
  if (!buffer?.length) return;

  await clipboardBridge.writeImage({ buffer, mime: 'image/png' });

  // Deliberately not suppressed: a screenshot is a real copy, so it belongs in
  // history like anything else.
  showPanel();
  panel?.webContents.send('panel:refresh');
}

/** Fallback: borrow macOS's own region selector. */
async function runSystemCapture() {
  const before = await clipboardBridge.readSource();

  capturing = true;
  try {
    await execFileAsync(SCREENSHOT_BIN, ['-i', '-c', '-x'], { timeout: 180_000 });
  } catch (error) {
    const detail = String(error.stderr || error.message || '').trim().slice(0, 140);
    notifyPanel('capture.failed', detail);
    return { ok: false, error: 'capture_failed', detail };
  } finally {
    capturing = false;
  }

  const after = await clipboardBridge.readSource();
  const unchanged =
    before.kind === after.kind &&
    (before.kind !== 'image' ||
      (before.buffer && after.buffer && before.buffer.equals(after.buffer)));

  if (unchanged) return { ok: false, error: 'cancelled' };

  showPanel();
  panel?.webContents.send('panel:refresh');
  return { ok: true };
}

async function runCapture() {
  if (capturing) return { ok: false, error: 'busy' };

  const status = systemPreferences.getMediaAccessStatus('screen');
  if (status !== 'granted') {
    shell.openExternal(SCREENSHOT_SETTINGS_URL);
    notifyPanel('capture.permission', status);
    return { ok: false, error: 'permission', detail: status };
  }

  const tool = getScreenshotTool();
  if (!tool) return runSystemCapture();

  capturing = true;
  try {
    await tool.startCapture();
    return { ok: true };
  } catch (error) {
    capturing = false;
    console.error('annotation overlay failed to start, falling back', error);
    return runSystemCapture();
  }
}

/* ---------- image editor ---------- */

/**
 * One editor window serves both entry points: the clipboard picture and (later)
 * a screenshot that needs another pass. It always works on a copy — the
 * clipboard changes only when the user saves.
 */
async function openImageEditor(dataUrl, { debug = false, theme = 'light' } = {}) {
  if (!dataUrl) return { ok: false, error: 'no_image' };

  const night = theme === 'dark';

  if (editorWindow) {
    editorWindow.setBackgroundColor(night ? '#241f1a' : '#fff7e8');
    editorWindow.focus();
    editorWindow.webContents.send('editor:theme', night ? 'dark' : 'light');
    editorWindow.webContents.send('editor:image', dataUrl);
    return { ok: true, reused: true };
  }

  editorWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    title: '编辑图片 · 吧台',
    backgroundColor: night ? '#241f1a' : '#fff7e8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'editor-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  editorWindow.once('ready-to-show', () => editorWindow?.show());
  editorWindow.loadFile(path.join(projectRoot, 'dist', 'editor.html'), {
    query: { theme: night ? 'dark' : 'light', ...(debug ? { debug: '1' } : {}) },
  });
  editorWindow.webContents.once('did-finish-load', () => {
    editorWindow?.webContents.send('editor:image', dataUrl);
  });
  editorWindow.on('closed', () => {
    editorWindow = null;
  });

  return { ok: true };
}

async function editClipboardImage(theme = 'light') {
  const source = await clipboardBridge.readSource();
  if (source.kind !== 'image') return { ok: false, error: 'no_image' };

  const dataUrl = `data:${source.mime || 'image/png'};base64,${source.buffer.toString('base64')}`;
  return openImageEditor(dataUrl, { theme });
}

function closeEditor() {
  if (!editorWindow) return { ok: true };
  const win = editorWindow;
  editorWindow = null;
  win.close();
  return { ok: true };
}

/* ---------- uploads ---------- */

async function uploadImage(image) {
  const bucket = buckets?.active();
  if (!bucket) return { ok: false, error: 'no_bucket' };

  const key = sigv4.objectKey({ buffer: image.buffer, mime: image.mime });
  const result = await sigv4.putObject({
    endpoint: bucket.endpoint,
    region: bucket.region,
    bucket: bucket.bucketName,
    key,
    body: image.buffer,
    contentType: image.mime || 'image/png',
    accessKey: bucket.accessKey,
    secretKey: bucket.secret,
    pathStyle: bucket.pathStyle,
    publicBase: bucket.publicBase || undefined,
  });

  if (!result.ok) {
    console.error('upload failed', result.status, result.error);
    return { ok: false, error: 'upload_failed' };
  }

  return { ok: true, url: result.url };
}

async function saveImageToDownloads(image) {
  const pad = (value) => String(value).padStart(2, '0');
  const now = new Date();
  const name = [
    'bar-tool',
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join('-');

  const file = path.join(app.getPath('downloads'), `${name}.png`);
  await fs.writeFile(file, image.buffer);
  return file;
}

/** Everything an action needs from the outside world. */
function actionContext() {
  return {
    hasBucket: Boolean(buckets?.hasActive()),
    linkFormat: settings?.get().linkFormat ?? 'url',
    upload: uploadImage,
    saveFile: saveImageToDownloads,
  };
}

/* ---------- IPC surface ---------- */

/**
 * Everything the panel needs in one round trip: what is on the clipboard, what
 * it can become, whether the last action can still be undone, and a cheap
 * summary of the history (no thumbnails — those wait for the full view).
 */
async function buildState() {
  const source = await clipboardBridge.readSource();
  const context = actionContext();
  const stats = history ? history.stats() : { count: 0, bytes: 0 };
  const recent = history ? history.list(3) : [];

  return {
    version: app.getVersion(),
    preview: clipboardBridge.toPreview(source),
    actions: actions.listFor(source, context),
    groups: actions.GROUP_ORDER,
    canUndo: Boolean(undoSource),
    history: {
      enabled: settings?.get().historyEnabled ?? false,
      count: stats.count,
      bytes: stats.bytes,
      recent: recent.map((item) => ({
        id: item.id,
        kind: item.kind,
        at: item.at,
        snippet: item.snippet,
      })),
    },
    settings: settings?.get() ?? {},
    buckets: buckets?.list() ?? [],
  };
}

async function runAction(id) {
  const action = actions.get(id);
  if (!action) return { ok: false, error: 'unknown_action' };

  const source = await clipboardBridge.readSource();
  if (!action.accepts.includes(source.kind)) return { ok: false, error: 'not_applicable' };

  const result = await action.run(source, actionContext());
  if (result.error) return { ok: false, error: result.error };

  if (typeof result.text === 'string') {
    if (result.html) await clipboardBridge.writeRich(result.text, result.html);
    else await clipboardBridge.writeText(result.text);
    watcher?.expectText(result.text);
  } else if (result.image) {
    await clipboardBridge.writeImage(result.image);
    watcher?.skipNextImage();
  } else {
    return { ok: false, error: 'empty_result' };
  }

  undoSource = source;
  return { ok: true, toast: result.toast };
}

async function undoLast() {
  if (!undoSource) return { ok: false, error: 'nothing_to_undo' };

  const target = undoSource;
  undoSource = null;

  await clipboardBridge.restore(target);
  if (target.kind === 'text') watcher?.expectText(target.text);
  else if (target.kind === 'image') watcher?.skipNextImage();

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

  ipcMain.handle('history:all', async () => ({
    items: await historyList(),
    stats: history ? history.stats() : { count: 0, bytes: 0 },
  }));

  ipcMain.handle('history:restore', async (_event, id) => {
    const result = await restoreHistory(id);
    return { ...result, state: await buildState() };
  });

  ipcMain.handle('history:clear', async () => {
    await history?.clear();
    return { ok: true, state: await buildState() };
  });

  ipcMain.handle('settings:update', async (_event, patch) => {
    if (!settings) return { ok: false, error: 'unavailable' };

    const before = settings.get();
    const next = await settings.update(patch ?? {});

    if (next.launchAtLogin !== before.launchAtLogin) {
      app.setLoginItemSettings({ openAtLogin: next.launchAtLogin });
    }
    if (next.maxItems !== before.maxItems && history) {
      history.maxItems = next.maxItems;
      await history.trim();
      await history.save();
    }
    if (next.historyEnabled !== before.historyEnabled) {
      if (next.historyEnabled) watcher?.start();
      else watcher?.stop();
    }

    return { ok: true, state: await buildState() };
  });

  ipcMain.handle('appearance:set', (_event, theme) => {
    // The vibrancy material only works behind the dark panel; the light theme
    // paints its own paper, so the material is switched off.
    // Sticker themes are opaque paper in both appearances.
    panel?.setVibrancy(null);
    return true;
  });

  ipcMain.handle('clipboard:fullText', async () => {
    const source = await clipboardBridge.readSource();
    return { kind: source.kind, text: source.kind === 'text' ? source.text : '' };
  });

  ipcMain.handle('clipboard:writeText', async (_event, text) => {
    if (typeof text !== 'string') {
      return { ok: false, error: 'invalid_input', state: await buildState() };
    }

    const before = await clipboardBridge.readSource();
    await clipboardBridge.writeText(text);
    // The write came from us, so history must not record it as a new copy.
    watcher?.expectText(text);
    undoSource = before.kind === 'empty' ? null : before;

    return { ok: true, state: await buildState() };
  });

  ipcMain.handle('capture:run', () => runCapture());

  ipcMain.handle('image:edit', (_event, theme) => editClipboardImage(theme));

  ipcMain.handle('editor:save', async (_event, dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return { ok: false, error: 'invalid_image' };
    }

    const image = nativeImage.createFromDataURL(dataUrl);
    if (image.isEmpty()) return { ok: false, error: 'invalid_image' };

    await clipboardBridge.writeImage({ buffer: image.toPNG(), mime: 'image/png' });
    closeEditor();

    showPanel();
    panel?.webContents.send('panel:notice', { key: 'image.edited' });
    panel?.webContents.send('panel:refresh');
    return { ok: true };
  });

  ipcMain.handle('editor:cancel', () => closeEditor());

  ipcMain.handle('buckets:save', async (_event, input) => {
    if (!buckets) return { ok: false, error: 'unavailable' };
    const result = await buckets.save(input ?? {});
    return { ...result, state: await buildState() };
  });

  ipcMain.handle('buckets:remove', async (_event, id) => {
    if (!buckets) return { ok: false, error: 'unavailable' };
    const result = await buckets.remove(id);
    return { ...result, state: await buildState() };
  });

  ipcMain.handle('buckets:activate', async (_event, id) => {
    if (!buckets) return { ok: false, error: 'unavailable' };
    const result = await buckets.setActive(id);
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
  // Option+Command+S — region screenshot straight to the clipboard.
  globalShortcut.register(CAPTURE_SHORTCUT, () => {
    runCapture().catch((error) => console.error('capture failed', error));
  });

  // Option+Command+V — show/hide the panel.
  globalShortcut.register('Alt+Command+V', togglePanel);

  // Option+Command+Z — undo the last action, even while the panel is hidden.
  globalShortcut.register('Alt+Command+Z', async () => {
    if (!undoSource) return;
    await undoLast();
    panel?.webContents.send('panel:refresh');
  });
}

/* ---------- startup ---------- */

async function initStores() {
  const userData = app.getPath('userData');

  settings = await new SettingsStore({ file: path.join(userData, 'settings.json') }).init();
  buckets = await new BucketStore({
    file: path.join(userData, 'buckets.json'),
    encrypt: (value) => {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('keychain unavailable');
      return safeStorage.encryptString(value).toString('base64');
    },
    decrypt: (value) => safeStorage.decryptString(Buffer.from(value, 'base64')),
  }).init();

  history = await new HistoryStore({
    dir: path.join(userData, 'history'),
    maxItems: settings.get().maxItems,
  }).init();

  // Blobs without an index entry can only be leftovers from a crash.
  await history.sweep();

  watcher = new ClipboardWatcher({
    readText: () => clipboardBridge.readText(),
    hasImage: () => clipboardBridge.hasImage(),
    readImage: async () => {
      const source = await clipboardBridge.readSource();
      return source.kind === 'image' ? source : null;
    },
    onItem: recordItem,
  });

  if (settings.get().historyEnabled) watcher.start();
}

/**
 * Development helper: BAR_TOOL_EDIT_PROBE=<png> opens the image editor on the
 * clipboard picture, screenshots the editor window and quits.
 */
async function devEditorProbe(target) {
  const source = await clipboardBridge.readSource();
  if (source.kind !== 'image') {
    console.error('[editor-probe] no image on the clipboard');
    app.quit();
    return;
  }

  const dataUrl = `data:${source.mime || 'image/png'};base64,${source.buffer.toString('base64')}`;
  await openImageEditor(dataUrl, {
    debug: true,
    theme: process.env.BAR_TOOL_THEME === 'dark' ? 'dark' : 'light',
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // Exercise the tools without a mouse, then capture the result.
  const drawn = await editorWindow.webContents.executeJavaScript(`(() => {
    const e = window.__editor;
    if (!e) return { error: 'no debug handle' };
    e.commitArrow({ x: 60, y: 60 }, { x: 320, y: 170 });
    e.applyMosaic({ left: 120, top: 210, width: 240, height: 160 });
    return { w: e.state.canvas.getWidth(), h: e.state.canvas.getHeight(), objects: e.state.canvas.getObjects().length };
  })()`);
  console.log('[editor-probe] tools', JSON.stringify(drawn));
  await new Promise((resolve) => setTimeout(resolve, 900));

  const afterTools = await editorWindow.webContents.capturePage();
  await fs.writeFile(`${target}.tools.png`, afterTools.toPNG());

  const cropped = await editorWindow.webContents.executeJavaScript(
    `window.__editor.applyCrop({ left: 60, top: 60, width: 340, height: 300 }).then(() => ({
       w: window.__editor.state.canvas.getWidth(),
       h: window.__editor.state.canvas.getHeight(),
       objects: window.__editor.state.canvas.getObjects().length,
     }))`,
  );
  console.log('[editor-probe] crop', JSON.stringify(cropped));
  await new Promise((resolve) => setTimeout(resolve, 700));

  const info = await editorWindow.webContents.executeJavaScript(`(() => {
    const c = document.querySelector('canvas');
    const style = c ? getComputedStyle(c) : null;
    return {
      canvas: c ? { w: c.width, h: c.height, inlineBg: c.style.backgroundColor, computedBg: style.backgroundColor } : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      tools: document.querySelectorAll('.tool').length,
      cornerPixel: (() => { try { return Array.from(c.getContext('2d').getImageData(2, 2, 1, 1).data); } catch (e) { return String(e.message); } })(),
      hint: document.getElementById('tool-hint')?.textContent,
    };
  })()`);
  console.log('[editor-probe] dom', JSON.stringify(info));

  const image = await editorWindow.webContents.capturePage();
  await fs.writeFile(target, image.toPNG());
  console.log(`[editor-probe] wrote ${target}`);

  // Save and confirm the clipboard actually received the edited pixels.
  await editorWindow.webContents.executeJavaScript("document.getElementById('save').click()");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const saved = clipboardBridge.readSource
    ? await clipboardBridge.readSource()
    : null;
  console.log(
    '[editor-probe] clip',
    JSON.stringify({
      windowClosed: editorWindow === null,
      kind: saved?.kind,
      width: saved?.width,
      height: saved?.height,
      bytes: saved?.buffer?.length,
    }),
  );
  app.quit();
}

/**
 * Development helper: BAR_TOOL_CAPTURE=<png> opens the panel, saves a PNG of it
 * and quits. BAR_TOOL_LANG=zh|en forces the UI language first, BAR_TOOL_CLICK runs
 * an action and BAR_TOOL_VIEW opens history/settings — which is how the
 * screenshots for the README are produced without a mouse.
 */
async function devCapture(target) {
  showPanel();
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const forced = process.env.BAR_TOOL_LANG;
  if (forced === 'zh' || forced === 'en') {
    await panel.webContents.executeJavaScript(
      `localStorage.setItem('bar-tool.lang', ${JSON.stringify(forced)}); location.reload();`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }

  if (process.env.BAR_TOOL_THEME) {
    await panel.webContents.executeJavaScript(
      `localStorage.setItem('bar-tool.theme', ${JSON.stringify(process.env.BAR_TOOL_THEME)}); location.reload()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  if (process.env.BAR_TOOL_EVAL) {
    const value = await panel.webContents.executeJavaScript(process.env.BAR_TOOL_EVAL);
    console.log('[eval]', JSON.stringify(value));
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  if (process.env.BAR_TOOL_BUCKET) {
    await panel.webContents.executeJavaScript(
      `window.bar.bucketsSave(${process.env.BAR_TOOL_BUCKET}).then(() => location.reload())`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1600));
  }

  if (process.env.BAR_TOOL_VIEW) {
    const targets = { history: 'history-all', bucket: 'bucket-add' };
    const buttonId = targets[process.env.BAR_TOOL_VIEW] ?? process.env.BAR_TOOL_VIEW;
    await panel.webContents.executeJavaScript(
      `document.getElementById(${JSON.stringify(buttonId)})?.click()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }

  if (process.env.BAR_TOOL_CHIP) {
    await panel.webContents.executeJavaScript(
      `document.querySelectorAll('.chip-item')[${Number(process.env.BAR_TOOL_CHIP)}]?.click()`,
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

  app.whenReady().then(async () => {
    // A menu bar app never shows a dock icon.
    app.dock?.hide();
    app.setName('吧台');

    await initStores();

    createPanel();
    createTray();
    registerIpc();
    registerShortcuts();

    app.on('activate', showPanel);

    if (process.env.BAR_TOOL_OVERLAY_PROBE) {
      // Loads the overlay from the packaged asar to prove the native addon
      // resolves outside the archive.
      const tool = getScreenshotTool();
      console.log(
        '[overlay-probe]',
        JSON.stringify({ loaded: Boolean(tool), hasView: Boolean(tool?.$view), broken: screenshotToolBroken }),
      );
      app.quit();
    }

    if (process.env.BAR_TOOL_EDIT_PROBE) {
      devEditorProbe(process.env.BAR_TOOL_EDIT_PROBE).catch((error) => {
        console.error('[editor-probe] failed', error);
        app.quit();
      });
    }

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
    watcher?.stop();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
