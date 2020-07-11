# 自定义你的快捷键

示例：

```json
[
  {
    "name": "剪贴板-图片上传",
    "accelerator": "CmdOrCtrl+Shift+P",
    "switch": true
  },
  {
    "name": "剪贴板-转纯文字",
    "accelerator": "CmdOrCtrl+Alt+T",
    "switch": true
  }
]
```

`name` : 使用`-`分割菜单的路径

`switch` : 是否启用快捷键，`true` 或 `false`

`accelerator` : 符号`+`连接键盘按键，使用规则如下。

## 跨平台提醒

在 Linux 和 Windows 上, `Command` 键没有任何效果, 所以使用 `CommandOrControl`表述, macOS 是 `Command` ，在 Linux 和 Windows 上是`Control`。

使用 `Alt` 代替`Option`. `Option` 键只在 macOS 系统上存在, 而 `Alt` 键在任何系统上都有效.

`Super`键是指 Windows 和 Linux 系统上的 `Windows` 键，但在 macOS 里为 `Cmd` 键.

## 可用的功能键

- `Command` (缩写为`Cmd`)
- `Control` (缩写为`Ctrl`)
- `CommandOrControl` (缩写为 `CmdOrCtrl`)
- `Alt`
- `Option`
- `AltGr`
- `Shift`
- `Super`

## 可用的普通按键

- `0` to `9`
- `A` to `Z`
- `F1` to `F24`
- 类似`~`, `!`, `@`, `#`, `$`的标点符号
- `Plus`
- `Space`
- `Tab`
- `Backspace`
- `Delete`
- `Insert`
- `Return` (等同于 `Enter`)
- `Up`, `Down`, `Left` and `Right`
- `Home` 和 `End`
- `PageUp` 和 `PageDown`
- `Escape` (缩写为 `Esc`)
- `VolumeUp`, `VolumeDown` 和 `VolumeMute`
- `MediaNextTrack`、`MediaPreviousTrack`、`MediaStop` 和 `MediaPlayPause`
- `PrintScreen`