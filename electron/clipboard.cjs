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

/**
 * Cheap content stamp for the preview.
 *
 * The renderer used to key its repaint on `dataUrl.length`, so two different
 * pictures of the same size and similar compression were treated as "already
 * rendered" and the panel kept showing the old one — or a blank checkerboard.
 */
function stampOf(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

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
  if (scale >= 1) return image.toDataURL();

  // resize() can hand back an empty image for some sizes; that preview showed up
  // as a transparent checkerboard. Fall back to the original instead of painting
  // nothing at all.
  const resized = image.resize({ width: Math.max(1, Math.round(width * scale)), quality: 'good' });
  const dataUrl = resized.isEmpty() ? '' : resized.toDataURL();
  return dataUrl.length > 64 ? dataUrl : image.toDataURL();
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
      stamp: stampOf(source.dataUrl),
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

/** Cheap probe for the watcher: the plain-text flavour only. */
async function readText() {
  try {
    return await clipboard.readText();
  } catch {
    return '';
  }
}

/** Cheap probe for the watcher: does the pasteboard hold an image at all? */
async function hasImage() {
  try {
    return (await clipboard.has('image/png')) || (await clipboard.has('image/tiff'));
  } catch {
    return false;
  }
}

async function writeText(text) {
  await clipboard.write([new ClipboardItem({ 'text/plain': text })]);
}

/**
 * Write rich text: both flavours in one atomic write, so the same clipboard item
 * pastes formatted into Word and as Markdown into an editor.
 */
async function writeRich(text, html) {
  const document = /^\s*<(!doctype|html)/i.test(html)
    ? html
    : `<!DOCTYPE html><html><body>${html}</body></html>`;

  await clipboard.write([
    new ClipboardItem({ 'text/plain': text, 'text/html': document }),
  ]);
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

module.exports = { readSource, readText, hasImage, toPreview, writeText, writeRich, writeImage, restore };
