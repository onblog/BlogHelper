#!/usr/bin/env bash
#
# 从位图母版重新生成全部图标（应用图标 / favicon / 站点图标）。
#
# 母版（提交进仓库，不再从 SVG 渲染）：
#   build/icon-source.png   1024²，纯白圆角底板（r=215，四角透明）+ 整幅插画
#   build/icon-favicon.png  1024²，同一块底板 + 头部特写，供 16/32px 用
#
# 底板几何：圆角半径 215 / 1024，与上一版图标完全一致。换图时沿用这块遮罩，
# 否则 Dock 里的图标会比邻居胖一圈或小一圈。
#
# 出血约定：这张插画在源文件四边就被裁切了（头发、裙摆贴边），所以整幅满出血，
# 不缩进去留白——缩小只会把源文件的硬切口露在底板中间。代价是圆角处会切掉
# 约 0.4% 的画面，真正被切的是发梢和裙角，可接受。
#
# 边缘约定：底板边缘那一圈像素保留插画本色，不压白，这样圆角压在深色、浅色
# Dock 上都能自然过渡；唯一压白底的是 apple-touch-icon（第 5 步），因为 iOS
# 会把透明区域涂黑。
#
# 为什么 16/32 用头部特写：整幅人物缩到 16px 只剩一团深色头发，特写还能认出
# 脸和猫耳。
# 为什么不用 rsvg-convert：图标源是位图插画，矢量管线只会增加偏差。
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

# 1) macOS 图标集 → icns；16/32 用头部特写，64 及以上用整幅插画
mkdir -p build/icon.iconset
for spec in 16:icon_16x16 32:icon_16x16@2x 32:icon_32x32 64:icon_32x32@2x \
            128:icon_128x128 256:icon_128x128@2x 256:icon_256x256 512:icon_256x256@2x \
            512:icon_512x512 1024:icon_512x512@2x; do
  size="${spec%%:*}"
  name="${spec#*:}"
  art="$SRC"
  [ "$size" -le 32 ] && art="$FACE"
  magick "$art" -resize "${size}x${size}" "build/icon.iconset/${name}.png"
done
iconutil -c icns build/icon.iconset -o build/icon.icns

# 2) README 用的单张图标
magick "$SRC" -resize 512x512 build/icon.png

# 3) 站点图标（README 与 og 由 tools/make-og.py 之外的流程单独更新）
for size in 512 256 128; do
  magick "$SRC" -resize "${size}x${size}" "site/public/assets/icon-${size}.png"
done

# 4) favicon.ico：三档都走头部特写，浏览器标签/书签里的尺寸都太小，整幅人物读不出来
magick "$FACE" -resize 16x16 "$tmp/f16.png"
magick "$FACE" -resize 32x32 "$tmp/f32.png"
magick "$FACE" -resize 48x48 "$tmp/f48.png"
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
