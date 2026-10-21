<div align="center">

<img src="build/icon.svg" width="104" alt="吧台" />

# 吧台 · bar-tool

**一个 macOS 菜单栏工具箱：把剪贴板里的内容，变成你下一步要用的样子。**

<a href="https://tool.wordtk.com"><img alt="下载" src="https://img.shields.io/badge/%E2%96%B6_%E4%B8%8B%E8%BD%BD-tool.wordtk.com-f2b544?style=for-the-badge"></a>

<br/>

<img alt="平台" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-45-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="运行时依赖" src="https://img.shields.io/badge/%E8%BF%90%E8%A1%8C%E6%97%B6%E4%BE%9D%E8%B5%96-0-2f7d52?style=flat-square">
<img alt="动作数" src="https://img.shields.io/badge/%E5%8A%A8%E4%BD%9C-25-f2b544?style=flat-square">
<img alt="协议" src="https://img.shields.io/badge/%E5%8D%8F%E8%AE%AE-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

[🇺🇸 English](README.md) &nbsp;·&nbsp; 🇨🇳 **简体中文**

</div>

> 复制一段乱糟糟的内容，点开菜单栏，挑一个动作。吧台直接把剪贴板就地改写成你要的样子——
> 下一次 **⌘V** 粘出来就是纯文本、排好版的 JSON、snake_case，或者解出来的 Base64。
>
> 不需要账号，没有窗口要管，一次网络请求都不发。面板显示的是**当前这块内容能变成什么**，
> 而不是一个固定的大菜单。

---

## 目录

| | |
| --- | --- |
| [它做什么](#它做什么) | [动作清单](#动作清单) |
| [快捷键](#快捷键) | [工作原理](#工作原理) |
| [隐私](#隐私) | [项目结构](#项目结构) |
| [从源码构建](#从源码构建) | [当前进度](#当前进度) |
| [开源协议](#开源协议) | |

---

## 它做什么

一个模型、25 个工具：**剪贴板进 → 变换 → 剪贴板出**。

- **是菜单栏面板，不是窗口。** 点图标、选动作、去粘贴。没有 Dock 图标，也不占桌面。
- **只显示用得上的动作。** 列表按剪贴板当下真实内容过滤：图片只出图片动作，JSON 才会解锁
  JSON 那组，「转纯文本」只在剪贴板真的带富文本时才出现。
- **撤销只要一个快捷键。** 每个动作都留住了上一次的剪贴板，选错了按 ⌥⌘Z 就回来了。
- **运行时零依赖。** 除 Electron 本体外没有 npm 依赖，每个变换都是用 Node 内置能力手写的。
- **天然离线。** 1.1 版本一次网络请求都不发。

它刻意**不做**的事：不替你托管图片（等存储桶上传上线）、不格式化 JS/CSS/HTML（那要引
formatter 依赖，会撞碎零依赖这条线）、不要求登录、不打电话回家。

## 动作清单

每个动作都是纯函数，由注册表决定当前该列出哪些。

| 分组 | 动作 |
| --- | --- |
| 清理 | 转纯文本 · 去首尾空白 · 合并空行 · 压成一行 · 去掉行号 |
| 大小写 | 全大写 · 全小写 · 首字母大写 · 驼峰命名 · 下划线命名 · 短横线命名 · 常量命名 |
| 编码 | Base64 编码/解码 · URL 编码/解码 · HTML 转义/反转义 |
| 数据 | JSON 美化 · JSON 压缩 · JSON 键排序 |
| 行处理 | 去重行 · 排序行 |
| 时间 | 时间戳 → 本地时间 · 日期 → 时间戳 |

加一个工具就是在 `electron/actions/` 下加一个文件——面板、测试和 IPC 都会自动接上。

## 快捷键

| 按键 | 动作 |
| --- | --- |
| `⌥⌘V` | 显示 / 收起面板 |
| `↑` `↓` | 在动作间移动 |
| `↵` | 执行选中的动作 |
| `⌥⌘Z` | 撤销上一个动作 |
| `Esc` | 收起面板 |

## 工作原理

```
electron/actions/   每个分组一个文件，全是纯函数
electron/clipboard.cjs
                    针对 Electron 44+ 异步剪贴板 API 的读写层
electron/main.cjs   菜单栏图标、面板窗口、快捷键、IPC
src/                面板渲染层：预览、动作网格、双语文案
```

三条规矩让它不跑偏：

1. **动作永远不碰 Electron。** 输入 `{ kind, text, html }`，输出 `{ text }` 或 `{ error }`，
   所以整套动作能用 `node:test` 零依赖覆盖。
2. **剪贴板只有主进程能碰。** 渲染层只能拿到预览和动作清单。
3. **写回剪贴板就是流程终点。** 没有抽屉、没有落地文件——结果就在剪贴板上，直接粘。

## 隐私

- **只在面板显示时**读剪贴板。
- 1.1 版本不发任何网络请求：没有统计、没有崩溃上报、没有更新探测。
- 目前还没有任何落盘。剪贴板历史（文字 + 图片，存在本地）是下一个里程碑。

## 项目结构

```
electron/           主进程：菜单栏图标、面板窗口、剪贴板、IPC
electron/actions/   动作注册表与各分组
src/                渲染层：面板结构、样式、双语文案、DOM 逻辑
src/styles/         一套深色玻璃主题，不引 CSS 框架
build/              应用图标源文件（SVG）与生成的 icns
scripts/            afterPack 钩子，负责 ad-hoc 签名
tests/              动作的 node:test 测试
```

渲染层碰不到 Node：所有能力都收在一个很窄的 `contextBridge` 里，
`contextIsolation` 与 `sandbox` 都是开启的。

## 从源码构建

```bash
npm install
npm run dev            # Vite + Electron，带热更新
npm test               # 44 个单元测试，零依赖
npm run dist:arm64     # Apple Silicon 的 dmg，产物在 release/
npm run dist:x64       # Intel 的 dmg
```

## 当前进度

`1.1.0` 开发中：动作框架、25 个文本工具、撤销、双语面板都已就位。
接下来是剪贴板历史（文字 + 图片），然后是图片的存储桶上传，最后是官网。

## 开源协议

双轨授权：

- **开源** —— [AGPL-3.0-only](LICENSE)。可自由使用、修改、自部署；如果你分发修改后的版本，
  AGPL 要求你一并公开对应源码。
- **商业** —— 如果 AGPL 不适合你的产品（例如要发布闭源衍生品），
  见 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)。

「吧台 / bar-tool」这个名字与图标不在开源授权范围内。
