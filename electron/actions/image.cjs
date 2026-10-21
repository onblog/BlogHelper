'use strict';

/**
 * Image actions.
 *
 * Unlike the text tools these are not pure: uploading and saving touch the
 * network and the disk. They receive a context from the main process instead of
 * importing Electron themselves, so they stay testable with a fake context.
 */

const { formatLink } = require('../link-format.cjs');

module.exports = [
  {
    id: 'image.open',
    group: 'image',
    // Hand the picture to Preview: it already has every annotation and crop tool
    // people need, and whatever they copy there lands back on the clipboard.
    title: { zh: '预览打开图片', en: 'Open in Preview' },
    accepts: ['image'],
    run: async (input, ctx) => {
      const result = await ctx.openInPreview(input);
      return result.ok ? { handled: true, toast: 'open.done' } : { error: result.error ?? 'open_failed' };
    },
  },
  {
    id: 'image.upload',
    group: 'image',
    title: { zh: '上传到图床', en: 'Upload to bucket' },
    accepts: ['image'],
    // Hidden until a bucket is configured — the panel never offers a dead end.
    isAvailable: (_input, ctx) => Boolean(ctx?.hasBucket),
    run: async (input, ctx) => {
      const result = await ctx.upload(input);
      if (!result.ok) return { error: result.error ?? 'upload_failed' };
      return { text: formatLink(result.url, ctx.linkFormat), toast: 'upload.done' };
    },
  },
  {
    id: 'image.restore',
    group: 'image',
    // Same effect as picking the picture from history: the image is on the
    // clipboard again, ready to paste, without saving it to disk first.
    title: { zh: '复制到剪贴板', en: 'Copy to clipboard' },
    accepts: ['image'],
    run: (input) => ({ image: input, toast: 'restore.done' }),
  },
  {
    id: 'image.save',
    group: 'image',
    title: { zh: '存到下载目录', en: 'Save to Downloads' },
    accepts: ['image'],
    run: async (input, ctx) => {
      const file = await ctx.saveFile(input);
      return file ? { text: file, toast: 'save.done' } : { error: 'save_failed' };
    },
  },
];
