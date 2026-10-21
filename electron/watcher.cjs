'use strict';

/**
 * Clipboard watcher.
 *
 * macOS gives Electron no clipboard change event (no `changeCount`, no signal),
 * so this is a poller. Text is cheap to read and compared by hash; images are
 * only read when the clipboard has no text and an image is present, and at a
 * slower cadence, because decoding a screenshot every second is not free.
 *
 * Consequences, documented rather than hidden:
 *   - text changes are captured exactly;
 *   - an image is captured when the clipboard *becomes* an image. Replacing one
 *     image with another while the first is still on the clipboard is missed
 *     until the clipboard holds text or empties in between.
 */

const crypto = require('node:crypto');

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

class ClipboardWatcher {
  /**
   * @param {object} options
   * @param {() => Promise<string>} options.readText
   * @param {() => Promise<boolean>} options.hasImage
   * @param {() => Promise<{buffer: Buffer}>} options.readImage
   * @param {(entry: object) => Promise<void>|void} options.onItem
   */
  constructor({
    readText,
    hasImage,
    readImage,
    onItem,
    intervalMs = 1200,
    imageIntervalMs = 3000,
    now = () => Date.now(),
  }) {
    this.readText = readText;
    this.hasImage = hasImage;
    this.readImage = readImage;
    this.onItem = onItem;
    this.intervalMs = intervalMs;
    this.imageIntervalMs = imageIntervalMs;
    this.now = now;

    this.timer = null;
    this.lastSignature = null;
    this.lastImageCheck = 0;
    /** Signature of content we wrote ourselves and must not record. */
    this.expected = null;
    /** Set when we restored an image: macOS re-encodes it, so the hash differs. */
    this.skipImage = false;
    this.busy = false;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((error) => console.error('clipboard watcher tick failed', error));
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Tell the watcher which content came from us. Without this, every action
   * would immediately record its own result as a new history entry.
   */
  expectText(text) {
    this.expected = `t:${sha1(Buffer.from(text, 'utf8'))}`;
  }

  expectImage(buffer) {
    this.expected = `i:${sha1(buffer)}`;
  }

  /**
   * Skip the next image sample. Used after restoring an image from history:
   * the pasteboard copies the pixels, not our file, so the PNG bytes we would
   * read back never match the ones we wrote — comparing hashes cannot catch it,
   * only skipping the next sample can.
   */
  skipNextImage() {
    this.skipImage = true;
  }

  /** One polling step; exposed so the tests can drive it deterministically. */
  async tick() {
    if (this.busy) return;
    this.busy = true;

    try {
      const text = await this.readText();

      if (text && text.trim()) {
        const signature = `t:${sha1(Buffer.from(text, 'utf8'))}`;
        if (signature === this.lastSignature) return;
        this.lastSignature = signature;
        if (this.consumeExpected(signature)) return;
        await this.onItem({ kind: 'text', text });
        return;
      }

      const now = this.now();
      if (now - this.lastImageCheck < this.imageIntervalMs) return;
      this.lastImageCheck = now;

      if (!(await this.hasImage())) {
        this.lastSignature = 'empty';
        return;
      }

      const image = await this.readImage();
      if (!image?.buffer?.length) return;

      const signature = `i:${sha1(image.buffer)}`;
      if (signature === this.lastSignature) return;
      this.lastSignature = signature;
      if (this.consumeExpected(signature)) return;
      if (this.skipImage) {
        this.skipImage = false;
        return;
      }
      await this.onItem({ kind: 'image', ...image });
    } finally {
      this.busy = false;
    }
  }

  consumeExpected(signature) {
    if (this.expected && signature === this.expected) {
      this.expected = null;
      return true;
    }
    return false;
  }
}

module.exports = { ClipboardWatcher };
