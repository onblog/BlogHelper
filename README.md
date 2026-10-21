<div align="center">

<img src="build/icon.svg" width="104" alt="bar-tool" />

# bar-tool · 吧台

**The clipboard workbench for macOS: whatever lands on it — a screenshot, a web page, a table column — comes back cleaned, tidied and ready to paste.**

<a href="https://tool.wordtk.com"><img alt="Download" src="https://img.shields.io/badge/%E2%96%B6_Download-tool.wordtk.com-f2b544?style=for-the-badge"></a>
<img alt="version" src="https://img.shields.io/badge/version-1.5.0-f2b544?style=for-the-badge">

<br/>

<img alt="platform" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-45-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="runtime deps" src="https://img.shields.io/badge/runtime_deps-0-2f7d52?style=flat-square">
<img alt="history" src="https://img.shields.io/badge/history-local_only-2f7d52?style=flat-square">
<img alt="actions" src="https://img.shields.io/badge/actions-21-f2b544?style=flat-square">
<img alt="license" src="https://img.shields.io/badge/license-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

🇺🇸 **English** &nbsp;·&nbsp; [🇨🇳 简体中文](README.zh-CN.md)

</div>

> Copy something messy, click the menu bar, pick what it should become. bar-tool rewrites the
> clipboard in place, so the next **⌘V** is already right: plain text without the web styling,
> Chinese and English properly spaced, a list squeezed into one line, a link without the
> `utm_source=…` tail.
>
> No account, no window to manage, no network call. The panel shows **what the current clipboard can
> become**, never a fixed menu of everything the app can do.

---

## Table of contents

| | |
| --- | --- |
| [What it does](#what-it-does) | [Actions](#actions) |
| [Shortcuts](#shortcuts) | [How it works](#how-it-works) |
| [Privacy](#privacy) | [Project layout](#project-layout) |
| [Build from source](#build-from-source) | [Status](#status) |
| [License](#license) | |

---

## Install

Grab the dmg from **[tool.wordtk.com](https://tool.wordtk.com)** (Apple Silicon and Intel), drag the
app into `Applications`, and launch it. The build is ad-hoc signed rather than notarised, so the
first launch needs one extra click: **right-click → Open → Open** (or allow it under System Settings
→ Privacy & Security).

Nothing to configure for the text tools. For image uploads, add a bucket in Settings → Storage — the
site's [image host section](https://tool.wordtk.com/#bucket) walks through the four fields that
matter.

## What it does

One model, one job: **clipboard in → transformation → clipboard out**.

- **Two appearances, no auto-switching.** A dark bar at night (charcoal and amber) and a light bar
  at daytime (cream paper and caramel ink). The switch lives in the top bar and the choice is
  remembered — nothing changes under you when macOS flips its own appearance.
- **Capture straight into the clipboard.** `⌥⌘S` borrows macOS's own region selector, drops the shot on the clipboard and opens the panel, so the very next click can send it to your bucket as a link.
- **A menu bar panel, not a window.** Click the tray icon, pick an action, paste. No dock icon, no
  window stealing a Space.
- **Only the actions that apply.** The list is filtered by what is actually on the clipboard right
  now: "To plain text" only appears for rich text, the typography group only when Chinese sits next
  to Latin, the tracking-link cleaner only for links that carry tracking.
- **Chinese typesetting, done properly.** A space between Chinese and Latin, and punctuation that
  belongs to the right script — the two things every Chinese writer fixes by hand.
- **Undo is one keystroke.** Every action keeps the previous clipboard, so a wrong pick costs a
  ⌥⌘Z, not a re-copy.
- **Images go to your own bucket.** One click on a screenshot uploads it to Cloudflare R2, Tencent
  COS, Alibaba OSS or MinIO and puts the link back on the clipboard — as a URL, Markdown, HTML tag
  or BBCode.
- **Zero runtime dependencies.** Only Electron itself; signing, storage and every transformation are
  hand-written on top of Node's built-ins.

Who this is **not** for: there is no Base64 encoder, no regex playground and no timestamp converter
here. Those are developer tools, and this app deliberately belongs to whoever copies text — writers,
ops people, anyone tidying a list at midnight. Formatting JavaScript/CSS/HTML is out of scope too:
it needs a formatter dependency, which is exactly the weight this project refuses.

## Actions

Every action is a pure function; the registry decides what to show for the clipboard at hand.

| Group | Actions |
| --- | --- |
| Clean up | To plain text · Trim whitespace · Collapse blank lines · Remove blank lines · Join into one line · Strip line numbers · Remove invisible characters · Strip Markdown syntax |
| Typography | Space between Chinese and Latin · Punctuation → full-width · Punctuation → half-width |
| Lists | Remove duplicate lines · Sort lines · Reverse line order · Number the lines · Join into a comma list |
| Links | Clean tracking parameters · Decode `%20` in links · Extract every link |
| Image | Upload to your bucket · Save to Downloads |

Adding a tool means adding one file under `electron/actions/` — the panel, the tests and the IPC
surface pick it up automatically.

## Image hosting

Add a bucket in **Settings → Storage** and the image actions appear whenever the clipboard holds a
picture.

| Field | What to put there |
| --- | --- |
| Endpoint | `https://<account-id>.r2.cloudflarestorage.com` for R2, `https://cos.<region>.myqcloud.com` for COS, `https://oss-<region>.aliyuncs.com` for OSS |
| Region | `auto` for R2; the real region for COS/OSS |
| Bucket | The bucket name |
| Public domain | The domain your images are served from — this is the link you get back |
| Access key / Secret | An S3 key with write access; the secret is encrypted with the macOS Keychain |
| Path-style | On for MinIO and self-hosted, off for virtual-host buckets |

Object keys are content addressed (`images/2026/10/4f9c1a2b.png`), so the same screenshot uploaded
twice is one object. The link format (URL / Markdown / HTML / BBCode) is a setting, not a per-upload
choice.

## Capture

`⌥⌘S` (or the camera button in the panel, or the tray menu) runs macOS's own region selector and puts
the result on the clipboard, ready for the image actions.

- The first use asks for **Screen Recording** permission — the same one every capture tool needs.
  If it is missing the app opens the right pane in System Settings instead of failing silently.
- Nothing is captured in the background: the system selector only appears when you ask for it.
- Prefer the built-in `⌘⇧⌃4`? It works too — the panel picks the image up from the clipboard either way.

## History

The bottom row of the panel keeps the last three things you copied; **All** opens the full list.

- Text and images, newest first, one character or a thumbnail as the preview
- Click any entry to put it back on the clipboard
- 100 items / 200 MB by default (50, 100 or 200 in settings), oldest dropped first
- Re-copying something moves it to the top instead of piling up duplicates
- Only what you copy — nothing is uploaded, ever
- Recording can be switched off at any time

## Shortcuts

| Keys | Action |
| --- | --- |
| `⌥⌘S` | Region screenshot → clipboard (needs Screen Recording once) |
| `⌥⌘V` | Show / hide the panel |
| `↑` `↓` | Move through the actions |
| `↵` | Run the selected action |
| `⌥⌘Z` | Undo the last action |
| `Esc` | Close the panel |

## How it works

```
electron/actions/   One file per group of transformations, pure functions
electron/clipboard.cjs
                    Clipboard read/write for Electron 44+'s async clipboard API
electron/main.cjs   Tray, panel window, shortcuts, IPC
src/                Panel renderer: preview, action grid, bilingual copy
```

Three rules keep it honest:

1. **Actions never touch Electron.** They take `{ kind, text, html }` and return `{ text }` or
   `{ error }`, which is why the whole set is covered by `node:test` with no dependency.
2. **The main process owns the clipboard.** The renderer only ever sees a preview and a list.
3. **Writing back is the end of the flow.** No drawers, no side files — the result is on the
   clipboard, ready to paste.

## Privacy

- The clipboard is read while the panel is open, and polled in the background to build history —
  every 1.2 s for text, every 3 s for images.
- History never leaves this Mac: it is an index plus image blobs in
  `~/Library/Application Support/bar-tool/`.
- The only network request the app ever makes is the `PUT` to the bucket you configured. No
  telemetry, no crash reporting, no update check.
- Turning history off stops recording immediately; **Clear history** deletes the index and every
  blob.
- Screen Recording is requested only for the capture shortcut, and only the region you select is
  captured — there is no background grab.
- No telemetry, no crash reporting, no update check.

## Project layout

```
electron/           Main process: tray, panel window, clipboard, IPC surface
electron/actions/   The transformation registry and its groups
electron/sigv4.cjs
                    AWS Signature V4 + S3 PUT, verified against the AWS test vector
electron/storage.cjs
                    Bucket configuration; secrets encrypted with the Keychain
electron/history.cjs
                    History index + image blobs, Electron-free and unit tested
electron/watcher.cjs
                    Clipboard poller (macOS has no clipboard change event)
electron/settings.cjs
                    Persisted switches and limits
src/                Renderer: panel markup, styles, i18n, DOM logic
src/styles/         One dark glass theme, no CSS framework
build/              App icon sources (SVG) and the generated icns
scripts/            afterPack hook that ad-hoc signs the bundle
tests/              node:test suites for the actions
```

The renderer never touches Node: everything goes through a narrow `contextBridge` with
`contextIsolation` and `sandbox` enabled.

## Build from source

```bash
npm install
npm run dev            # Vite + Electron with hot reload
npm test               # 102 unit tests, no dependencies
npm run dist:arm64     # dmg for Apple Silicon, output in release/
npm run dist:x64       # dmg for Intel
```

## Status

`1.5.0`: 19 text tools, image upload to your own S3-compatible bucket, save-to-Downloads,
local clipboard history for text and images, undo and the bilingual panel. The site lives at
**https://tool.wordtk.com**; dmgs for both architectures are served from Cloudflare R2.

## License

Dual-licensed:

- **Open source** — [AGPL-3.0-only](LICENSE). Free to use, modify and self-host. If you distribute
  a modified version, the AGPL requires you to publish the corresponding source as well.
- **Commercial** — if AGPL does not fit your product (for example, you want to ship a closed-source
  derivative) see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md).

The name "吧台 / bar-tool" and the icon are not covered by the open-source grant.
