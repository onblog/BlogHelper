/**
 * Pure geometry for the image editor: fitting, cropping and the mosaic block
 * size. Kept apart from fabric so it can be unit tested without a DOM.
 */

/** Scale that makes an image fit the available area without ever upscaling. */
export function fitScale(width, height, maxWidth, maxHeight) {
  if (!width || !height) return 1;
  return Math.min(1, maxWidth / width, maxHeight / height);
}

/**
 * Convert a canvas-space selection into source-pixel coordinates, clamped to the
 * image. Negative or out-of-bounds drags are normal, so this never trusts them.
 */
export function cropBox(box, scale, sourceWidth, sourceHeight) {
  const safeScale = scale > 0 ? scale : 1;
  const left = Math.max(0, Math.min(box.left / safeScale, sourceWidth));
  const top = Math.max(0, Math.min(box.top / safeScale, sourceHeight));
  const width = Math.max(1, Math.min(box.width / safeScale, sourceWidth - left));
  const height = Math.max(1, Math.min(box.height / safeScale, sourceHeight - top));

  return { left, top, width, height };
}

/** Block size for pixelation: bigger regions get bigger blocks, within bounds. */
export function mosaicBlock(width, height) {
  const shortest = Math.min(width, height);
  return Math.max(6, Math.min(48, Math.round(shortest / 24)));
}

/** Annotation coordinates after a crop, in the freshly fitted canvas space. */
export function shiftForCrop(left, top, cropLeft, cropTop, ratio) {
  return { left: (left - cropLeft) * ratio, top: (top - cropTop) * ratio };
}
