'use strict';

/**
 * Renders site/public/assets/og.png — the 1200×630 card that link previews show.
 *
 * The card is a browser render rather than a hand-made export, so the copy can
 * follow the site (title, tagline, badges) without a design file in the loop.
 * Captured at 2x and downsampled with nativeImage, because Chromium's text
 * rasteriser beats a 1x capture once the card is scaled down in a chat client.
 *
 * Usage: npx electron tools/make-og.cjs
 * Output: site/public/assets/og.png (1200×630)
 */

const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'public', 'assets', 'og.png');
const ICON = path.join(ROOT, 'build', 'icon-source.png');
// A data: page cannot load file:// resources, so the icon rides in as base64.
const ICON_DATA = `data:image/png;base64,${fs.readFileSync(ICON).toString('base64')}`;

const CARD = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; }
      body {
        background: #FAF9F7;
        color: #23211E;
        font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .accent { height: 6px; background: #E8731F; }
      .card {
        display: flex;
        align-items: center;
        gap: 44px;
        height: 624px;
        padding: 0 56px 0 60px;
      }
      .art { flex: 0 0 400px; display: flex; justify-content: center; }
      .art img { width: 400px; height: 400px; display: block; }
      .copy { flex: 1 1 auto; padding-top: 4px; }
      .eyebrow {
        font-size: 21px;
        font-weight: 600;
        letter-spacing: 6px;
        color: #7C766C;
        text-transform: uppercase;
      }
      h1 {
        margin-top: 14px;
        font-size: 104px;
        line-height: 1.06;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .tagline {
        margin-top: 26px;
        font-size: 29px;
        line-height: 1.4;
        font-weight: 500;
        color: #6C675F;
        white-space: nowrap;
      }
      .meta {
        margin-top: 12px;
        font-size: 24px;
        line-height: 1.4;
        color: #8B867D;
        white-space: nowrap;
      }
      .pills { margin-top: 34px; display: flex; align-items: center; gap: 18px; }
      .pill {
        display: inline-flex;
        align-items: center;
        height: 54px;
        padding: 0 26px;
        border-radius: 27px;
        font-size: 24px;
        font-weight: 500;
        white-space: nowrap;
      }
      .pill--ghost { border: 1.5px solid #E2DCD1; color: #57524B; }
      .pill--solid { background: #23211E; color: #FAF9F7; }
    </style>
  </head>
  <body>
    <div class="accent"></div>
    <div class="card">
      <div class="art"><img src="${ICON_DATA}" alt="" /></div>
      <div class="copy">
        <p class="eyebrow">Miaomiao Bar</p>
        <h1>喵喵剪贴板</h1>
        <p class="tagline">把剪贴板里乱糟糟的内容，变成你下一步要用的样子</p>
        <p class="meta">macOS 剪贴板工作台 · text, images, your own bucket</p>
        <div class="pills">
          <span class="pill pill--ghost">AGPL-3.0 · free</span>
          <span class="pill pill--solid">github.com/onblog</span>
        </div>
      </div>
    </div>
  </body>
</html>`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.dock?.hide();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 630,
    show: false,
    frame: false,
    backgroundColor: '#FAF9F7',
    webPreferences: { offscreen: true, contextIsolation: true, nodeIntegration: false },
  });

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(CARD));
  // Give the icon decode and font shaping a frame to settle before capturing.
  await wait(600);

  win.webContents.debugger.attach('1.3');
  const { data } = await win.webContents.debugger.sendCommand('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    clip: { x: 0, y: 0, width: 1200, height: 630, scale: 2 },
  });

  const shot = nativeImage.createFromBuffer(Buffer.from(data, 'base64'));
  const card = shot.resize({ width: 1200, height: 630, quality: 'best' });
  fs.writeFileSync(OUT, card.toPNG());

  const { width, height } = card.getSize();
  console.log(`wrote ${path.relative(ROOT, OUT)} ${width}×${height}`);

  win.destroy();
  app.quit();
});

setTimeout(() => {
  console.error('make-og: watchdog fired');
  app.exit(1);
}, 60_000).unref();
