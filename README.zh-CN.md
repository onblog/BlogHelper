<div align="center">

<img src="build/icon.svg" width="104" alt="吧台" />

# 吧台 · bar-tool

**一个 macOS 菜单栏工具箱，专治你每天粘来粘去的文字——清理干净、中文排版、列表理顺、链接去尾巴。**

<a href="https://tool.wordtk.com"><img alt="下载" src="https://img.shields.io/badge/%E2%96%B6_%E4%B8%8B%E8%BD%BD-tool.wordtk.com-f2b544?style=for-the-badge"></a>

<br/>

<img alt="平台" src="https://img.shields.io/badge/macOS-12%2B-1f2328?style=flat-square&logo=apple&logoColor=white">
<img alt="electron" src="https://img.shields.io/badge/Electron-45-47848f?style=flat-square&logo=electron&logoColor=white">
<img alt="运行时依赖" src="https://img.shields.io/badge/%E8%BF%90%E8%A1%8C%E6%97%B6%E4%BE%9D%E8%B5%96-0-2f7d52?style=flat-square">
<img alt="历史" src="https://img.shields.io/badge/%E5%8E%86%E5%8F%B2-%E4%BB%85%E6%9C%AC%E5%9C%B0-2f7d52?style=flat-square">
<img alt="动作数" src="https://img.shields.io/badge/%E5%8A%A8%E4%BD%9C-19-f2b544?style=flat-square">
<img alt="协议" src="https://img.shields.io/badge/%E5%8D%8F%E8%AE%AE-AGPL--3.0--only-6b7280?style=flat-square">

<br/><br/>

[🇺🇸 English](README.md) &nbsp;·&nbsp; 🇨🇳 **简体中文**

</div>

> 复制一段乱糟糟的内容，点开菜单栏，选它该变成什么样。吧台直接把剪贴板就地改写，下一次
> **⌘V** 粘出来就是对的：网页样式剥干净的纯文本、中英文之间加好空格、多行清单压成一行、
> 去掉 `utm_source=…` 尾巴的干净链接。
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

一个模型、一件事：**剪贴板进 → 变换 → 剪贴板出**。

- **是菜单栏面板，不是窗口。** 点图标、选动作、去粘贴。没有 Dock 图标，也不占桌面。
- **只显示用得上的动作。** 列表按剪贴板当下真实内容过滤：「转纯文本」只对富文本出现，中文排版组只在中英文相邻时出现，净化链接只对带跟踪参数的链接出现。
- **中文排版做对了。** 中英文之间自动加空格、标点按语境转全角或半角——这两件是每个中文写作者天天手动改的事。
- **撤销只要按一下 ⌥⌘Z。** 每个动作都留住了上一次的剪贴板，点错了不用重新复制。
- **运行时零依赖、天然离线。** 除 Electron 本体外没有 npm 依赖；这个版本一次网络请求都不发。

**它不是给程序员的**：这里没有 Base64 编码器、没有正则调试台、没有时间戳转换器。那些是开发者工具，而这个应用刻意属于所有会复制文字的人——写作者、运营、半夜整理名单的你。格式化 JS/CSS/HTML 也不做：那要引 formatter 依赖，正是这个项目拒绝的重量。

## 动作清单

每个动作都是纯函数，由注册表决定当前该列出哪些。

| 分组 | 动作 |
| --- | --- |
| 清理 | 转纯文本 · 去首尾空白 · 合并空行 · 删掉空行 · 压成一行 · 去掉行号 · 清除隐形字符 · 去掉 Markdown 标记 |
| 中文排版 | 中英文之间加空格 · 标点转全角 · 标点转半角 |
| 列表整理 | 去重行 · 排序行 · 反转行序 · 加序号 · 合并成逗号分隔 |
| 链接 | 净化链接 · 链接里的 %20 解码 · 提取文中所有链接 |

加一个工具就是在 `electron/actions/` 下加一个文件——面板、测试和 IPC 都会自动接上。

## 剪贴板历史

面板底部那一行保留最近 3 条，点「全部」看完整列表。

- 文字与图片都记，最新在前，用首字或缩略图当预览
- 点任意一条即可回填到剪贴板
- 默认上限 100 条 / 200 MB（设置里可选 50 / 100 / 200），超出先丢最旧的
- 重复复制的内容会移到最前，而不是堆一堆副本
- 只记你复制过的东西，一个字节都不上传
- 随时可在设置里关掉记录

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

- 面板显示时会读剪贴板；为了攒历史，后台也会轮询——文字每 1.2 秒、图片每 3 秒。
- 历史从不离开这台 Mac：它是 `~/Library/Application Support/bar-tool/` 下的一个索引加若干图片文件。
  这个版本完全不发网络请求。
- 关掉记录会立刻停止写入；「清空历史」会把索引和所有图片一起删掉。
- 没有统计、没有崩溃上报、没有更新探测。

## 项目结构

```
electron/           主进程：菜单栏图标、面板窗口、剪贴板、IPC
electron/actions/   动作注册表与各分组
electron/history.cjs
                    历史索引 + 图片文件，不依赖 Electron、有单元测试
electron/watcher.cjs
                    剪贴板轮询器（macOS 没有剪贴板变更事件）
electron/settings.cjs
                    持久化的开关与上限
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
npm test               # 67 个单元测试，零依赖
npm run dist:arm64     # Apple Silicon 的 dmg，产物在 release/
npm run dist:x64       # Intel 的 dmg
```

## 当前进度

`1.2.0` 开发中：19 个文本工具（4 组）、本地剪贴板历史（文字 + 图片）、撤销、设置，以及双语三视图面板都已就位。
接下来是图片上传到你自己的存储桶，最后是官网。

## 开源协议

双轨授权：

- **开源** —— [AGPL-3.0-only](LICENSE)。可自由使用、修改、自部署；如果你分发修改后的版本，
  AGPL 要求你一并公开对应源码。
- **商业** —— 如果 AGPL 不适合你的产品（例如要发布闭源衍生品），
  见 [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md)。

「吧台 / bar-tool」这个名字与图标不在开源授权范围内。
