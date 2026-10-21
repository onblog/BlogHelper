'use strict';

/**
 * Clipboard access, in one place.
 *
 * Electron 44+ models the clipboard after the web standard: `read()` resolves
 * to ClipboardItem entries whose `getType()` yields a Blob. Everything else in
 * the app works with the normalised `source` shape produced here:
 *
 *   { kind: 'text',  text, html? }
 *   { kind: 'image', mime, buffer, width, height, dataUrl }
 *   { kind: 'empty' }
 */

const { clipboard, nativeImage, ClipboardItem } = require('electron');

const PREVIEW_MAX = 720;
const TEXT_PREVIEW_MAX = 4000;

async function readItems() {
  try {
    return await clipboard.read();
  } catch (error) {
    console.error('clipboard.read failed', error);
    return [];
  }
}

async function blobText(item, type) {
  if (!item.types.includes(type)) return null;
  try {
    const blob = await item.getType(type);
    return typeof blob === 'string' ? blob : await blob.text();
  } catch {
    return null;
  }
}

function downscale(image, width, height) {
  const scale = Math.min(1, PREVIEW_MAX / Math.max(width, height));
  const preview = scale < 1 ? image.resize({ width: Math.round(width * scale) }) : image;
  return preview.toDataURL();
}

/** Full clipboard contents — the shape actions receive. */
async function readSource() {
  const items = await readItems();

  for (const item of items) {
    const imageType =
      item.types.find((type) => type === 'image/png') ??
      item.types.find((type) => type.startsWith('image/'));
    if (!imageType) continue;

    try {
      const blob = await item.getType(imageType);
      const buffer = Buffer.from(await blob.arrayBuffer());
      const image = nativeImage.createFromBuffer(buffer);
      if (image.isEmpty()) continue;

      const { width, height } = image.getSize();
      return {
        kind: 'image',
        mime: imageType,
        buffer,
        width,
        height,
        // Rendered once here, reused by the preview on every poll.
        dataUrl: downscale(image, width, height),
      };
    } catch (error) {
      console.error('clipboard image read failed', error);
    }
  }

  let html = null;
  for (const item of items) {
    html = await blobText(item, 'text/html');
    if (html !== null) break;
  }

  let text = null;
  for (const item of items) {
    text = await blobText(item, 'text/plain');
    if (text !== null) break;
  }
  if (text === null) {
    text = await clipboard.readText().catch(() => '');
  }

  if (text) return { kind: 'text', text, html: html || undefined };
  return { kind: 'empty' };
}

/** The slice of a source that the renderer is allowed to see. */
function toPreview(source) {
  if (source.kind === 'image') {
    return {
      kind: 'image',
      width: source.width,
      height: source.height,
      dataUrl: source.dataUrl,
    };
  }

  if (source.kind === 'text') {
    return {
      kind: 'text',
      text: source.text.slice(0, TEXT_PREVIEW_MAX),
      length: source.text.length,
      rich: Boolean(source.html),
    };
  }

  return { kind: 'empty' };
}

async function writeText(text) {
  await clipboard.write([new ClipboardItem({ 'text/plain': text })]);
}

async function writeImage(image) {
  const type = image.mime ?? 'image/png';
  const blob = new Blob([image.buffer], { type });
  await clipboard.write([new ClipboardItem({ [type]: blob })]);
}

/** Put a previously read source back on the clipboard (used for undo). */
async function restore(source) {
  if (source.kind === 'text') await writeText(source.text);
  else if (source.kind === 'image') await writeImage(source);
}

module.exports = { readSource, toPreview, writeText, writeImage, restore };
