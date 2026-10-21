<div align="center">

<img src="build/icon.svg" width="104" alt="吧台" />

# 吧台 · bar-tool

**一个 macOS 菜单栏小工具：把剪贴板里的图片变成链接——存在你自己的桶里，不需要任何账号。**

<a href="https://tool.wordtk.com"><img alt="下载" src="https://img.shields.io/badge/%E2%96%B6_%E4%B8%8B%E8%BD%BD-tool.wordtk.com-f2b544?style=for-the-badge"></a>

<br/>

<img alt="平台" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-45-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="运行时依赖" src="https://img.shields.io/badge/%E8%BF%90%E8%A1%8C%E6%97%B6%E4%BE%9D%E8%B5%96-0-2f7d52?style=flat-square">
<img alt="协议" src="https://img.shields.io/badge/%E5%8D%8F%E8%AE%AE-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

[🇺🇸 English](README.md) &nbsp;·&nbsp; 🇨🇳 **简体中文**

</div>

> 截个图，点一下菜单栏，粘贴。吧台把图片放进**你自己的** S3 兼容存储桶
> （Cloudflare R2、腾讯 COS、阿里 OSS、MinIO），再按你选的格式把链接交还给你。
> 没有账号、没有中转服务、没有订阅——面板除了你的桶，谁都不连。

---

## 目录

| | |
| --- | --- |
| [它做什么](#它做什么) | [复制格式](#复制格式) |
| [安装](#安装) | [第一次运行](#第一次运行) |
| [快捷键](#快捷键) | [图片存在哪](#图片存在哪) |
| [隐私](#隐私) | [项目结构](#项目结构) |
| [从源码构建](#从源码构建) | [开源协议](#开源协议) |

---

## 它做什么

只做一件事，并且做扎实：**剪贴板图片 → 链接**。

- **是菜单栏面板，不是窗口。** 点图标、面板落下、点一下上传，结束。没有 Dock 图标，也不会占一个桌面。
- **你的桶、你的链接。** 填一个 endpoint 和一对密钥，图片进你的存储、走你的域名。没有吧台服务器会宕机、向你收费，或者看见你的截图。
- **给你真正会粘贴的格式。** URL、Markdown、HTML、BBCode，选一次记住。
- **靠得住的剪贴板历史。** 最近 50 条文字与图片，只存在本地，键盘就能捞回来。
- **运行时零依赖。** 除 Electron 本体外没有 npm 依赖；存储、签名、上传都是用 Node 内置能力手写的。

它刻意**不做**的事：不发博客平台、不帮你托管图片、不压缩文件、不要求登录、不打电话回家。

## 复制格式

| 选项 | 结果 |
| --- | --- |
| `URL` | `https://img.example.com/images/2026/10/4f9c1a2b.png` |
| `Markdown` | `![4f9c1a2b](https://img.example.com/images/2026/10/4f9c1a2b.png)` |
| `HTML` | `<img src="https://img.example.com/images/2026/10/4f9c1a2b.png" width="1280" height="720" alt="">` |
| `BBCode` | `[img]https://img.example.com/images/2026/10/4f9c1a2b.png[/img]` |

## 安装

从 [tool.wordtk.com](https://tool.wordtk.com) 下载 dmg（Apple Silicon 与 Intel 两个版本），
把「吧台」拖进 `Applications`，打开即可。

安装包是 ad-hoc 签名、没有做 Apple 公证，所以第一次打开要额外点一下：

1. 在访达里右键图标 → **打开** → 再点一次 **打开**；或者
2. `系统设置 → 隐私与安全性 → 仍要打开`。

## 第一次运行

打开面板，点 **管理**，添加一个存储桶。全部走标准 S3，所以这些都行：

| 存储 | Endpoint | 说明 |
| --- | --- | --- |
| Cloudflare R2 | `https://<account-id>.r2.cloudflarestorage.com` | 10 GB 免费，**不收流出流量费**——最便宜的图床 |
| 腾讯云 COS | `https://cos.<region>.myqcloud.com` | 需要公共读桶或绑定 CDN 域名 |
| 阿里云 OSS | `https://oss-<region>.aliyuncs.com` | 同上 |
| MinIO / 自建 | 你自己的地址 | 走 path-style 寻址 |

你要给吧台四个值：endpoint、region、Access Key、Secret Key，外加桶对外提供服务的公开域名。
Secret 会用 macOS 钥匙串加密，不落明文，也不离开你的 Mac。

## 快捷键

| 按键 | 动作 |
| --- | --- |
| `⌘⇧⌃4` | 系统截图直接进剪贴板 |
| `⌥⌘U` | 上传剪贴板图片并复制链接 |
| `⌥⌘V` | 显示 / 收起面板 |
| `Esc` | 收起面板 |

## 图片存在哪

```
images/{yyyy}/{mm}/{sha1-8}{ext}
```

对象名按内容寻址，所以同一张截图传两次只会有一个对象。没有任何后台逻辑会替你删文件——
桶是你的，清理也归你。

## 隐私

- **只在面板显示时**读剪贴板，且只为渲染预览。
- 应用发出的唯一网络请求，是 `PUT` 到你的存储桶 endpoint。
- 没有统计、没有崩溃上报、没有后台更新探测。
- 密钥经 `safeStorage`（钥匙串）加密，存放在 `~/Library/Application Support/bar-tool/`。

## 项目结构

```
electron/       主进程：菜单栏图标、面板窗口、剪贴板、IPC 接口
src/            渲染层：面板结构、样式、双语文案、DOM 逻辑
src/styles/     一套深色玻璃主题，不引 CSS 框架
build/          应用图标源文件（SVG）与生成的 icns
scripts/        afterPack 钩子，负责 ad-hoc 签名
```

渲染层碰不到 Node：所有能力都收在一个很窄的 `contextBridge` 里，
`contextIsolation` 与 `sandbox` 都是开启的。

## 从源码构建

```bash
npm install
npm run dev            # Vite + Electron，带热更新
npm run dist:arm64     # Apple Silicon 的 dmg，产物在 release/
npm run dist:x64       # Intel 的 dmg
```

## 当前进度

`1.0.0` 正在公开开发中：菜单栏外壳、面板、剪贴板预览与双语界面已经就位，
存储桶上传与剪贴板历史紧随其后。

## 开源协议

双轨授权：

- **开源** —— [AGPL-3.0-only](LICENSE)。可自由使用、修改、自部署；如果你分发修改后的版本，
  AGPL 要求你一并公开对应源码。
- **商业** —— 如果 AGPL 不适合你的产品（例如要发布闭源衍生品），
  见 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)。

「吧台 / bar-tool」这个名字与图标不在开源授权范围内。
