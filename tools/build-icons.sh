#!/usr/bin/env bash
#
# 从 SVG 源文件重新生成站点图标。
#
# 依赖：rsvg-convert（brew install librsvg） + ImageMagick 7（brew install imagemagick）
#
# 为什么不用 `magick icon.svg favicon.ico` 一步到位：
# 没装 librsvg 时 ImageMagick 会退回自带的 MSVG 内部渲染器，它**不认** rx 圆角、
# 渐变、clipPath 和 alpha —— 结果是四角本该透明却变成实心、图形中间发黑，
# 渲染出来的东西和原 SVG 完全不是一回事（本项目踩过这个坑）。
# 所以：SVG → PNG 一律交给 rsvg-convert，magick 只负责把多张 PNG 组装成 .ico。
#
# **源文件不参与删除**：脚本只写 ico / png 产物，SVG 源文件始终保留在仓库里。
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${ICON_SRC:-site/public/assets/icon.svg}"
OUT="${ICON_OUT:-site/public}"
NAME="${ICON_NAME:-favicon.ico}"
# 额外 PNG 产物：`尺寸:文件名`，空格分隔。apple-touch 开头的一律压到白底上
# （iOS 会把透明区域涂黑，压白底才不难看）。
PNGS="${ICON_PNGS:-}"

command -v rsvg-convert >/dev/null || { echo "缺少 rsvg-convert：brew install librsvg" >&2; exit 1; }
command -v magick       >/dev/null || { echo "缺少 ImageMagick 7：brew install imagemagick" >&2; exit 1; }
[ -f "$SRC" ] || { echo "找不到 SVG 源文件：$SRC" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 16 给标签页、32 给书签/工具栏、48 给 Windows、64/128/256 给高分屏与固定到开始菜单
sizes=(16 32 48 64 128 256)
frames=()
for s in "${sizes[@]}"; do
  rsvg-convert -w "$s" -h "$s" -o "$tmp/icon-$s.png" "$SRC"
  frames+=("$tmp/icon-$s.png")
done

magick "${frames[@]}" "$OUT/$NAME"

for spec in $PNGS; do
  size="${spec%%:*}"
  file="${spec#*:}"
  rsvg-convert -w "$size" -h "$size" -o "$tmp/png-$file" "$SRC"
  case "$file" in
    apple-touch*) magick "$tmp/png-$file" -background white -alpha remove -alpha off "$OUT/$file" ;;
    *)            cp "$tmp/png-$file" "$OUT/$file" ;;
  esac
done

echo "已生成（源文件 $SRC 保留）："
magick identify "$OUT/$NAME" | awk '{printf "  %-28s %s\n", $1, $3}'
for spec in $PNGS; do
  file="${spec#*:}"
  printf '  %-28s %sx%s\n' "$OUT/$file" "${spec%%:*}" "${spec%%:*}"
done

# 透明性自检：背景带圆角的图标，四角必须透。全不透明说明又退回了 MSVG 渲染器。
alpha="$(magick "$OUT/$NAME[1]" -format '%[fx:p{1,1}.a]' info:)"
echo "  32px 帧左上角 alpha = ${alpha}（0 表示透明）"
case "$alpha" in
  0|0.0*) : ;;
  *) echo "  ⚠️ 四角不透明：检查是不是缺少 rsvg-convert" >&2 ;;
esac
