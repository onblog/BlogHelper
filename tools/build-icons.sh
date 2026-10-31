#!/usr/bin/env bash
#
# 从位图母版重新生成全部图标（应用图标 / favicon / 站点图标）。
#
# 母版（提交进仓库，不再从 SVG 渲染）：
#   build/icon-source.png   1024²，纯白圆角底 + 橘猫全图，四角透明
#   build/icon-favicon.png  1024²，同一套白底 + 猫脸特写，供 16/32px 小尺寸用
#
# 为什么 16/32 用猫脸：整张构图缩到 16px 会糊成一团橙色，特写还能认出是猫。
# 为什么不用 rsvg-convert：图标源已是手绘位图，矢量管线只会增加偏差。
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=build/icon-source.png
FACE=build/icon-favicon.png

command -v magick >/dev/null || { echo "缺少 ImageMagick 7：brew install imagemagick" >&2; exit 1; }
command -v iconutil >/dev/null || { echo "缺少 iconutil（macOS 自带）" >&2; exit 1; }
[ -f "$SRC" ] || { echo "找不到母版：$SRC" >&2; exit 1; }
[ -f "$FACE" ] || { echo "找不到母版：$FACE" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# 1) macOS 图标集 → icns
mkdir -p build/icon.iconset
for spec in 16:icon_16x16 32:icon_16x16@2x 32:icon_32x32 64:icon_32x32@2x \
            128:icon_128x128 256:icon_128x128@2x 256:icon_256x256 512:icon_256x256@2x \
            512:icon_512x512 1024:icon_512x512@2x; do
  size="${spec%%:*}"
  name="${spec#*:}"
  magick "$SRC" -resize "${size}x${size}" "build/icon.iconset/${name}.png"
done
iconutil -c icns build/icon.iconset -o build/icon.icns

# 2) README 用的单张图标
magick "$SRC" -resize 512x512 build/icon.png

# 3) 站点图标（README 与 og 由 tools/make-og.py 之外的流程单独更新）
for size in 512 256 128; do
  magick "$SRC" -resize "${size}x${size}" "site/public/assets/icon-${size}.png"
done

# 4) favicon.ico：小尺寸走猫脸，48px 用整图
magick "$FACE" -resize 16x16 "$tmp/f16.png"
magick "$FACE" -resize 32x32 "$tmp/f32.png"
magick "$SRC" -resize 48x48 "$tmp/f48.png"
magick "$tmp/f16.png" "$tmp/f32.png" "$tmp/f48.png" site/public/favicon.ico

# 5) apple-touch-icon：iOS 会把透明区域涂黑，压到纯白底上
magick "$SRC" -resize 180x180 -background '#FFFFFF' -alpha remove -alpha off \
  site/public/apple-touch-icon.png

# 6) 菜单栏模板图：单色剪影，22/44；反色交给 macOS 的模板机制
if command -v rsvg-convert >/dev/null; then
  rsvg-convert -w 22 -h 22 -o electron/assets/trayTemplate.png build/tray.svg
  rsvg-convert -w 44 -h 44 -o electron/assets/trayTemplate@2x.png build/tray.svg
else
  echo "跳过菜单栏图标：缺少 rsvg-convert（brew install librsvg）" >&2
fi

echo "已生成："
printf "  %-32s %s\n" build/icon.icns "$(stat -f%z build/icon.icns) bytes"
printf '  %-32s %s\n' build/icon.png "$(magick identify -format '%wx%h' build/icon.png)"
printf '  %-32s %s\n' site/public/favicon.ico "$(magick identify -format '%wx%h' 'site/public/favicon.ico[0]')"
printf '  %-32s %s\n' site/public/apple-touch-icon.png "$(magick identify -format '%wx%h' site/public/apple-touch-icon.png)"
printf '  %-32s %s\n' electron/assets/trayTemplate.png "$(magick identify -format '%wx%h' electron/assets/trayTemplate.png)"
