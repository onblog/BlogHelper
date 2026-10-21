'use strict';

/**
 * Storage buckets (the image host configuration).
 *
 * Secrets never touch the JSON file in plain text: encryption is injected by the
 * caller (the main process passes `safeStorage`, which is the macOS Keychain),
 * which also keeps this module unit testable.
 */

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const ALLOWED_LINK_FORMATS = ['url', 'markdown', 'html', 'bbcode'];

function randomId() {
  return crypto.randomBytes(4).toString('hex');
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate and normalise a bucket coming from the settings form.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
function normaliseBucket(input, { encrypt, previous }) {
  const endpoint = cleanString(input.endpoint);

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { ok: false, error: 'invalid_endpoint' };
  }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'insecure_endpoint' };

  const bucket = cleanString(input.bucket);
  const accessKey = cleanString(input.accessKey);
  if (!bucket) return { ok: false, error: 'missing_bucket' };
  if (!accessKey) return { ok: false, error: 'missing_access_key' };

  const secretInput = cleanString(input.secret);
  let secret;
  if (secretInput) {
    try {
      secret = encrypt(secretInput);
    } catch {
      return { ok: false, error: 'encryption_unavailable' };
    }
  } else if (previous?.secret) {
    secret = previous.secret; // keep the stored secret when the field is left blank
  } else {
    return { ok: false, error: 'missing_secret' };
  }

  const publicBase = cleanString(input.publicBase);

  return {
    ok: true,
    value: {
      id: previous?.id ?? randomId(),
      name: cleanString(input.name) || bucket,
      endpoint: endpoint.replace(/\/+$/, ''),
      region: cleanString(input.region) || 'auto',
      bucketName: bucket,
      publicBase: publicBase.replace(/\/+$/, ''),
      accessKey,
      secret,
      pathStyle: input.pathStyle !== false,
      addedAt: previous?.addedAt ?? new Date().toISOString(),
    },
  };
}

class BucketStore {
  constructor({ file, encrypt, decrypt }) {
    this.file = file;
    this.encrypt = encrypt;
    this.decrypt = decrypt;
    /** @type {Array<object>} */
    this.items = [];
    this.activeId = null;
  }

  async init() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (Array.isArray(parsed.items)) this.items = parsed.items;
      this.activeId = parsed.activeId ?? this.items[0]?.id ?? null;
    } catch {
      this.items = [];
      this.activeId = null;
    }

    if (!this.items.some((item) => item.id === this.activeId)) {
      this.activeId = this.items[0]?.id ?? null;
    }

    return this;
  }

  /** Safe for the renderer: no secrets, only a hint that one exists. */
  list() {
    return this.items.map((item) => ({
      id: item.id,
      name: item.name,
      endpoint: item.endpoint,
      region: item.region,
      bucketName: item.bucketName,
      publicBase: item.publicBase,
      accessKey: item.accessKey,
      pathStyle: item.pathStyle,
      hasSecret: Boolean(item.secret),
      active: item.id === this.activeId,
    }));
  }

  hasActive() {
    return Boolean(this.activeId);
  }

  /** Full bucket with the decrypted secret, for signing. */
  active() {
    const item = this.items.find((entry) => entry.id === this.activeId);
    if (!item) return null;

    try {
      return { ...item, secret: this.decrypt(item.secret) };
    } catch (error) {
      console.error('bucket secret could not be decrypted', error);
      return null;
    }
  }

  async save(input) {
    const previous = input.id ? this.items.find((item) => item.id === input.id) : null;

    const result = normaliseBucket(input, { encrypt: this.encrypt, previous });
    if (!result.ok) return result;

    const value = result.value;
    const index = this.items.findIndex((item) => item.id === value.id);
    if (index >= 0) this.items[index] = value;
    else this.items.push(value);

    if (!this.activeId) this.activeId = value.id;
    await this.persist();

    return { ok: true, id: value.id };
  }

  async remove(id) {
    this.items = this.items.filter((item) => item.id !== id);
    if (this.activeId === id) this.activeId = this.items[0]?.id ?? null;

    await this.persist();
    return { ok: true };
  }

  async setActive(id) {
    if (!this.items.some((item) => item.id === id)) return { ok: false, error: 'not_found' };

    this.activeId = id;
    await this.persist();
    return { ok: true };
  }

  async persist() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ activeId: this.activeId, items: this.items }));
    await fs.rename(tmp, this.file);
  }
}

module.exports = { BucketStore, normaliseBucket, ALLOWED_LINK_FORMATS };
