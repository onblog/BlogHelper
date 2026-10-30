'use strict';

/**
 * Clipboard history store.
 *
 * Deliberately Electron-free: it takes a directory, a clock and already-rendered
 * thumbnails, so the whole thing is unit testable with `node:test`. The main
 * process is the only caller and it supplies the base directory.
 *
 * Layout on disk:
 *
 *   <dir>/index.json            metadata, newest first
 *   <dir>/blobs/<id>.png        full image, used for restore
 *   <dir>/blobs/<id>.thumb.png  small preview, used for the list
 *
 * Nothing is written for text entries — they live in the index.
 */

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const INDEX_VERSION = 1;
const MAX_TEXT_CHARS = 100 * 1024;
const SNIPPET_CHARS = 120;

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function snippet(text) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.slice(0, SNIPPET_CHARS);
}

class HistoryStore {
  constructor({ dir, maxItems = 100, maxBytes = 200 * 1024 * 1024, now = () => Date.now() }) {
    this.dir = dir;
    this.blobsDir = path.join(dir, 'blobs');
    this.indexFile = path.join(dir, 'index.json');
    this.maxItems = maxItems;
    this.maxBytes = maxBytes;
    this.now = now;
    /** @type {Array<object>} newest first */
    this.items = [];
  }

  async init() {
    await fs.mkdir(this.blobsDir, { recursive: true });

    try {
      const parsed = JSON.parse(await fs.readFile(this.indexFile, 'utf8'));
      if (Array.isArray(parsed.items)) this.items = parsed.items;
    } catch {
      this.items = [];
    }

    return this;
  }

  stats() {
    return {
      count: this.items.length,
      bytes: this.items.reduce((sum, item) => sum + (item.bytes ?? 0), 0),
    };
  }

  /** Metadata only — the list needs a snippet, never the whole payload. */
  list(limit = this.items.length) {
    return this.items.slice(0, limit).map((item) => ({
      id: item.id,
      kind: item.kind,
      at: item.at,
      bytes: item.bytes ?? 0,
      width: item.width ?? null,
      height: item.height ?? null,
      snippet: item.kind === 'text' ? snippet(item.text ?? '') : null,
      thumbFile: item.thumbFile ?? null,
    }));
  }

  find(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  /** Full payload for a restore: text inline, images read from disk. */
  async read(id) {
    const item = this.find(id);
    if (!item) return null;

    if (item.kind === 'text') return { kind: 'text', text: item.text ?? '' };

    const buffer = await fs.readFile(path.join(this.blobsDir, item.file));
    return { kind: 'image', buffer, mime: item.mime ?? 'image/png' };
  }

  async readThumb(id) {
    const item = this.find(id);
    if (!item?.thumbFile) return null;
    try {
      return await fs.readFile(path.join(this.blobsDir, item.thumbFile));
    } catch {
      return null;
    }
  }

  /** Delete one entry and its blobs. Returns false when the id is already gone. */
  async remove(id) {
    const item = this.find(id);
    if (!item) return false;

    this.items = this.items.filter((entry) => entry.id !== id);
    await this.dropBlobs(item);
    await this.save();
    return true;
  }

  async addText(text) {
    if (!text || !text.trim()) return null;

    const truncated = text.slice(0, MAX_TEXT_CHARS);
    const hash = sha1(Buffer.from(truncated, 'utf8'));

    return this.upsert({
      id: this.nextId(hash),
      kind: 'text',
      hash,
      text: truncated,
      chars: text.length,
      bytes: Buffer.byteLength(truncated, 'utf8'),
    });
  }

  async addImage({ buffer, thumb = null, width = null, height = null, mime = 'image/png' }) {
    if (!buffer?.length) return null;

    const hash = sha1(buffer);
    const id = this.nextId(hash);
    const file = `${id}.png`;
    const thumbFile = thumb ? `${id}.thumb.png` : null;

    await fs.writeFile(path.join(this.blobsDir, file), buffer);
    if (thumbFile) await fs.writeFile(path.join(this.blobsDir, thumbFile), thumb);

    return this.upsert({
      id,
      kind: 'image',
      hash,
      file,
      thumbFile,
      width,
      height,
      mime,
      bytes: buffer.length,
    });
  }

  nextId(hash) {
    return `${this.now().toString(36)}-${hash.slice(0, 8)}`;
  }

  /** Move-to-front on duplicate content, so the list stays a list of distinct things. */
  async upsert(entry) {
    this.items = this.items.filter((item) => item.hash !== entry.hash);

    const item = { ...entry, at: new Date(this.now()).toISOString() };
    this.items.unshift(item);

    await this.trim();
    await this.save();
    return item;
  }

  async trim() {
    const dropped = [];

    while (this.items.length > this.maxItems) dropped.push(this.items.pop());

    let bytes = this.stats().bytes;
    while (bytes > this.maxBytes && this.items.length > 1) {
      const item = this.items.pop();
      bytes -= item.bytes ?? 0;
      dropped.push(item);
    }

    for (const item of dropped) await this.dropBlobs(item);
  }

  async dropBlobs(item) {
    for (const name of [item.file, item.thumbFile]) {
      if (!name) continue;
      await fs.rm(path.join(this.blobsDir, name), { force: true });
    }
  }

  async save() {
    const tmp = `${this.indexFile}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ version: INDEX_VERSION, items: this.items }));
    await fs.rename(tmp, this.indexFile);
  }

  async clear() {
    this.items = [];
    await fs.rm(this.blobsDir, { recursive: true, force: true });
    await fs.mkdir(this.blobsDir, { recursive: true });
    await this.save();
  }

  /** Blobs that no longer have an index entry (crash leftovers). */
  async sweep() {
    const keep = new Set();
    for (const item of this.items) {
      if (item.file) keep.add(item.file);
      if (item.thumbFile) keep.add(item.thumbFile);
    }

    let names = [];
    try {
      names = await fs.readdir(this.blobsDir);
    } catch {
      return 0;
    }

    let removed = 0;
    for (const name of names) {
      if (keep.has(name)) continue;
      await fs.rm(path.join(this.blobsDir, name), { force: true });
      removed += 1;
    }
    return removed;
  }
}

module.exports = { HistoryStore, snippet, MAX_TEXT_CHARS };
