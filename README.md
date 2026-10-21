<div align="center">

<img src="build/icon.svg" width="104" alt="bar-tool" />

# bar-tool · 吧台

**A macOS menu bar tool that turns clipboard images into links — on your own bucket, with no account.**

<a href="https://tool.wordtk.com"><img alt="Download" src="https://img.shields.io/badge/%E2%96%B6_Download-tool.wordtk.com-f2b544?style=for-the-badge"></a>

<br/>

<img alt="platform" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-33-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="runtime deps" src="https://img.shields.io/badge/runtime_deps-0-2f7d52?style=flat-square">
<img alt="license" src="https://img.shields.io/badge/license-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

🇺🇸 **English** &nbsp;·&nbsp; [🇨🇳 简体中文](README.zh-CN.md)

</div>

> Take a screenshot, click the menu bar, paste. bar-tool puts the image on **your own**
> S3-compatible bucket (Cloudflare R2, Tencent COS, Alibaba OSS, MinIO) and hands back a link
> in the format you asked for. No account, no upload service, no subscription — the panel
> never talks to anyone but your bucket.

---

## Table of contents

| | |
| --- | --- |
| [What it does](#what-it-does) | [Formats](#formats) |
| [Install](#install) | [First run](#first-run) |
| [Shortcuts](#shortcuts) | [Where images live](#where-images-live) |
| [Privacy](#privacy) | [Project layout](#project-layout) |
| [Build from source](#build-from-source) | [License](#license) |

---

## What it does

One job, done properly: **clipboard image → link**.

- **A menu bar panel, not a window.** Click the icon, the panel drops down, click upload, done.
  No dock icon, no main window taking up a Space.
- **Your bucket, your links.** You paste an endpoint and a key; images land in your storage under
  your domain. There is no bar-tool server that can go down, bill you, or read your screenshots.
- **The formats you actually paste.** URL, Markdown, HTML and BBCode — pick once, remembered.
- **A clipboard history you can trust.** The last 50 text snippets and images, stored locally,
  recalled with the keyboard.
- **Zero runtime dependencies.** Only Electron itself; storage, signing and upload are hand-written
  on top of Node's built-ins.

What it deliberately does **not** do: publish to blogging platforms, host images for you, compress
your files, ask you to sign in, or phone home.

## Formats

| Choice | Result |
| --- | --- |
| `URL` | `https://img.example.com/images/2026/10/4f9c1a2b.png` |
| `Markdown` | `![4f9c1a2b](https://img.example.com/images/2026/10/4f9c1a2b.png)` |
| `HTML` | `<img src="https://img.example.com/images/2026/10/4f9c1a2b.png" width="1280" height="720" alt="">` |
| `BBCode` | `[img]https://img.example.com/images/2026/10/4f9c1a2b.png[/img]` |

## Install

**Download** the dmg from [tool.wordtk.com](https://tool.wordtk.com) (Apple Silicon and Intel builds),
drag 吧台 into `Applications`, and launch it.

The build is signed ad-hoc, not notarised by Apple, so the first launch needs one extra click:

1. Right-click the app in Finder → **Open** → **Open** again; or
2. `System Settings → Privacy & Security → Open Anyway`.

## First run

Open the panel, hit **Manage**, and add a bucket. Everything is standard S3, so any of these work:

| Storage | Endpoint | Notes |
| --- | --- | --- |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | 10 GB free, **no egress fee** — the cheapest way to serve images |
| Tencent COS | `https://cos.<region>.myqcloud.com` | Needs a public-read bucket or a CDN domain |
| Alibaba OSS | `https://oss-<region>.aliyuncs.com` | Same |
| MinIO / self-hosted | your own URL | Path-style addressing |

You give bar-tool four values: endpoint, region, access key, secret key — plus the public domain
your bucket is served from. The secret is encrypted with the macOS Keychain, never written in plain
text, and never leaves your Mac.

## Shortcuts

| Keys | Action |
| --- | --- |
| `⌘⇧⌃4` | System screenshot straight to the clipboard |
| `⌥⌘U` | Upload the clipboard image and copy the link |
| `⌥⌘V` | Show / hide the panel |
| `Esc` | Close the panel |

## Where images live

```
images/{yyyy}/{mm}/{sha1-8}{ext}
```

Object keys are content-addressed, so uploading the same screenshot twice is one object. Nothing is
deleted behind your back — the bucket is yours, and so is the cleanup.

## Privacy

- The clipboard is read **only while the panel is on screen**, and only to render the preview.
- The only network request the app makes is the `PUT` to your bucket endpoint.
- No telemetry, no crash reporting, no analytics, no update ping in the background.
- Secrets are encrypted through `safeStorage` (Keychain) and kept in
  `~/Library/Application Support/bar-tool/`.

## Project layout

```
electron/       Main process: tray icon, panel window, clipboard, IPC surface
src/            Renderer: panel markup, styles, i18n, DOM logic
src/styles/     One dark glass theme, no CSS framework
build/          App icon sources (SVG) and the generated icns
scripts/        afterPack hook that ad-hoc signs the bundle
```

The renderer never touches Node: everything goes through a narrow `contextBridge` with
`contextIsolation` and `sandbox` enabled.

## Build from source

```bash
npm install
npm run dev            # Vite + Electron with hot reload
npm run dist:arm64     # dmg for Apple Silicon, output in release/
npm run dist:x64       # dmg for Intel
```

## Status

`1.0.0` is being built in the open: the menu bar shell, the panel, the clipboard preview and the
bilingual UI are in place; bucket upload and clipboard history come next.

## License

Dual-licensed:

- **Open source** — [AGPL-3.0-only](LICENSE). Free to use, modify and self-host. If you distribute
  a modified version, the AGPL requires you to publish the corresponding source as well.
- **Commercial** — if AGPL does not fit your product (for example, you want to ship a closed-source
  derivative) see [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md).

The name "吧台 / bar-tool" and the icon are not covered by the open-source grant.
