'use strict';

/**
 * Regenerates the panel screenshots used by the README and the website.
 *
 * The renderer normally talks to the main process, so this script stands in for
 * it: the real action registry supplies the action list, and a small fixture
 * fills in clipboard, history and settings. Nothing here ships with the app.
 *
 * Usage:  npm run build && npx electron tools/shoot-panels.cjs
 * Output: docs/screenshots/panel-{main,history,settings}.png (2x), copied to
 *         site/public/assets/ as well.
 */

const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
// SHOOT_THEME=dark renders the dark palette; SHOOT_OUT redirects the output so a
// preview run cannot overwrite the committed light screenshots.
const THEME = process.env.SHOOT_THEME === 'dark' ? 'dark' : 'light';
const OUT = process.env.SHOOT_OUT
  ? path.resolve(process.env.SHOOT_OUT)
  : path.join(ROOT, 'docs', 'screenshots');
const SITE = process.env.SHOOT_OUT ? null : path.join(ROOT, 'site', 'public', 'assets');

const WIDTH = 420;
const HEIGHT = 700;
const SCALE = 2;

const { version } = require(path.join(ROOT, 'package.json'));

const SAMPLE = [
  '# 周报 · 第 12 周',
  '',
  '- 完成了三件事',
  '- 还有一件在排队',
  '- 详见 https://example.com/notes?id=42&utm_source=x',
  '',
].join('\n');

// The real registry, so the screenshots can never drift from what ships.
const actions = require(path.join(ROOT, 'electron', 'actions', 'index.cjs'));
const source = { kind: 'text', text: SAMPLE, html: null };
const actionList = actions.listFor(source, {
  settings: { maxItems: 100 },
  linkFormat: 'url',
  upload: async () => ({ ok: false }),
  saveFile: async () => ({ ok: false }),
  openInPreview: () => {},
});

const now = Date.now();
const RECENT = [
  { id: 'r1', kind: 'text', at: now - 90_000, snippet: '# 周报 · 第 12 周' },
  { id: 'r2', kind: 'image', at: now - 3_600_000, snippet: '截图.png' },
  { id: 'r3', kind: 'text', at: now - 7_200_000, snippet: '# 会议记录' },
];

// The full history view needs more rows than the strip, or the screenshot shows
// a nearly empty page.
const HISTORY_ITEMS = [
  ['r1', 'text', 90_000, '# 周报 · 第 12 周'],
  ['r2', 'image', 3_600_000, '截图.png'],
  ['r3', 'text', 7_200_000, '# 会议记录'],
  ['r4', 'text', 8_400_000, 'https://example.com/notes?id=42'],
  ['r5', 'text', 26_000_000, '去首尾空白之后的一整段说明文字'],
  ['r6', 'image', 50_000_000, 'design-tokens.png'],
  ['r7', 'text', 88_000_000, '- 待办：补 README 截图'],
  ['r8', 'text', 172_000_000, 'npm run dist:arm64'],
  ['r9', 'text', 260_000_000, '把剪贴板里乱糟糟的内容，变成你下一步要用的样子'],
].map(([id, kind, ago, snippet]) => ({ id, kind, at: now - ago, snippet, thumb: null }));

const STATE = {
  version,
  preview: { kind: 'text', text: SAMPLE, length: SAMPLE.length, rich: false },
  actions: actionList,
  groups: actions.GROUP_ORDER,
  canUndo: false,
  history: {
    enabled: true,
    count: 24,
    bytes: 3_412_000,
    recent: RECENT.map(({ id, kind, at, snippet }) => ({ id, kind, at, snippet })),
  },
  settings: { historyEnabled: true, maxItems: 100, launchAtLogin: false, linkFormat: 'url' },
  buckets: [
    { id: 'b1', name: 'R2 主力桶', bucketName: 'miao-images', active: true, pathStyle: false },
    { id: 'b2', name: 'COS 备用', bucketName: 'miao-backup', active: false, pathStyle: true },
  ],
};

function registerStubs() {
  ipcMain.handle('app:info', () => ({ version, locale: 'zh' }));
  ipcMain.handle('panel:state', () => STATE);
  ipcMain.handle('history:all', () => ({
    items: HISTORY_ITEMS,
    stats: { count: HISTORY_ITEMS.length, bytes: 3_412_000 },
  }));
  ipcMain.handle('settings:update', () => ({ ok: true, state: STATE }));
  ipcMain.handle('appearance:set', () => ({ ok: true }));
  ipcMain.handle('update:check', () => ({ ok: true, current: version, latest: version }));
  ipcMain.handle('panel:hide', () => ({ ok: true }));
  ipcMain.handle('action:run', () => ({ ok: false, error: 'not_supported' }));
  ipcMain.handle('action:undo', () => ({ ok: false }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

async function shoot(win, name) {
  const { data } = await withTimeout(
    win.webContents.debugger.sendCommand('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: SCALE },
    }),
    15_000,
    'captureScreenshot',
  );

  const buffer = Buffer.from(data, 'base64');
  const target = path.join(OUT, `panel-${name}.png`);
  fs.writeFileSync(target, buffer);
  if (SITE) {
    fs.mkdirSync(SITE, { recursive: true });
    fs.copyFileSync(target, path.join(SITE, `panel-${name}.png`));
  }
  const { width, height } = nativeImage.createFromBuffer(buffer).getSize();
  console.log(`  panel-${name}.png  ${width}×${height}`);
}

app.whenReady().then(async () => {
  registerStubs();
  fs.mkdirSync(OUT, { recursive: true });

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: -3000,
    y: -3000,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(ROOT, 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(ROOT, 'dist', 'index.html'));
  await win.webContents.executeJavaScript(
    `localStorage.setItem('miaomiao-bar.theme', '${THEME}'); document.documentElement.dataset.theme = '${THEME}';`,
  );

  win.webContents.debugger.attach('1.3');
  // Transparent capture, so the rounded panel keeps its own corners.
  await win.webContents.debugger.sendCommand('Emulation.setDefaultBackgroundColorOverride', {
    color: { r: 0, g: 0, b: 0, a: 0 },
  });
  win.showInactive();
  await wait(900);

  console.log('capturing:');
  await shoot(win, 'main');

  await win.webContents.executeJavaScript("document.getElementById('history-all').click()");
  await wait(600);
  await shoot(win, 'history');

  await win.webContents.executeJavaScript("document.getElementById('settings').click()");
  await wait(600);
  await shoot(win, 'settings');

  win.destroy();
  app.quit();
});

// Never leave a stray Electron process behind if a capture stalls.
setTimeout(() => {
  console.error('shoot-panels: watchdog fired, exiting');
  app.exit(1);
}, 90_000).unref();
