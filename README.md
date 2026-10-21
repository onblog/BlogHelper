<div align="center">

<img src="build/icon.svg" width="104" alt="bar-tool" />

# bar-tool · 吧台

**A macOS menu bar toolbox that turns whatever is on your clipboard into what you need next.**

<a href="https://tool.wordtk.com"><img alt="Download" src="https://img.shields.io/badge/%E2%96%B6_Download-tool.wordtk.com-f2b544?style=for-the-badge"></a>

<br/>

<img alt="platform" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-45-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="runtime deps" src="https://img.shields.io/badge/runtime_deps-0-2f7d52?style=flat-square">
<img alt="actions" src="https://img.shields.io/badge/actions-25-f2b544?style=flat-square">
<img alt="license" src="https://img.shields.io/badge/license-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

🇺🇸 **English** &nbsp;·&nbsp; [🇨🇳 简体中文](README.zh-CN.md)

</div>

> Copy something messy, click the menu bar, pick a transformation. bar-tool rewrites the clipboard
> in place, so the next **⌘V** is already the shape you wanted — plain text without the styling,
> readable JSON, snake_case, a decoded Base64 blob.
>
> No account, no window to manage, no network call. The panel shows **what the current clipboard
> can become**, never a fixed menu of everything the app can do.

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

## What it does

One model, 25 tools: **clipboard in → transformation → clipboard out**.

- **A menu bar panel, not a window.** Click the tray icon, pick an action, paste. No dock icon, no
  window stealing a Space.
- **Only the actions that apply.** The list is filtered by what is actually on the clipboard right
  now: an image shows image actions, a JSON blob unlocks the JSON ones, "To plain text" only appears
  when the clipboard really carries rich text.
- **Undo is one keystroke.** Every action keeps the previous clipboard, so a wrong pick costs a
  ⌥⌘Z, not a re-copy.
- **Zero runtime dependencies.** Only Electron itself; every transformation is hand-written on top
  of Node's built-ins.
- **Offline by construction.** Version 1.1 makes no network requests at all.

What it deliberately does **not** do: host your images (that arrives with bucket upload), reformat
JavaScript/CSS/HTML (that needs a formatter dependency and would break the zero-dependency rule),
ask you to sign in, or phone home.

## Actions

Every action is a pure function; the registry decides what to show for the clipboard at hand.

| Group | Actions |
| --- | --- |
| Clean up | To plain text · Trim whitespace · Collapse blank lines · Join into one line · Strip line numbers |
| Case | UPPERCASE · lowercase · Title Case · camelCase · snake_case · kebab-case · CONSTANT_CASE |
| Encoding | Base64 encode/decode · URL encode/decode · HTML escape/unescape |
| Data | Beautify JSON · Minify JSON · Sort JSON keys |
| Lines | Remove duplicate lines · Sort lines |
| Time | Timestamp → local time · Date → timestamp |

Adding a tool means adding one file under `electron/actions/` — the panel, the tests and the IPC
surface pick it up automatically.

## Shortcuts

| Keys | Action |
| --- | --- |
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

- The clipboard is read **only while the panel is on screen**.
- Version 1.1 makes no network request: no telemetry, no crash reporting, no update check.
- Nothing is written to disk yet. Clipboard history (text + images, stored locally) is the next
  milestone.

## Project layout

```
electron/           Main process: tray, panel window, clipboard, IPC surface
electron/actions/   The transformation registry and its groups
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
npm test               # 44 unit tests, no dependencies
npm run dist:arm64     # dmg for Apple Silicon, output in release/
npm run dist:x64       # dmg for Intel
```

## Status

`1.1.0` is in development: the action framework, all 25 text tools, undo and the bilingual panel are
in place. Next up is clipboard history (text + images), then bucket upload for images, then the
official site.

## License

Dual-licensed:

- **Open source** — [AGPL-3.0-only](LICENSE). Free to use, modify and self-host. If you distribute
  a modified version, the AGPL requires you to publish the corresponding source as well.
- **Commercial** — if AGPL does not fit your product (for example, you want to ship a closed-source
  derivative) see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md).

The name "吧台 / bar-tool" and the icon are not covered by the open-source grant.
