'use strict';

/**
 * Small persisted settings file.
 *
 * Same rule as the history store: no Electron imports, so it can be tested
 * with a temporary directory. The main process maps `launchAtLogin` onto
 * `app.setLoginItemSettings` itself.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const { ALLOWED_LINK_FORMATS } = require('./storage.cjs');

const DEFAULTS = {
  historyEnabled: true,
  maxItems: 100,
  launchAtLogin: false,
  linkFormat: 'url',
  // One anonymous launch signal a day; see electron/main.cjs reportLaunch().
  telemetry: true,
};

const ALLOWED_MAX_ITEMS = [50, 100, 200];

function normalise(patch, base) {
  const next = { ...base };

  if (typeof patch.historyEnabled === 'boolean') next.historyEnabled = patch.historyEnabled;
  if (typeof patch.launchAtLogin === 'boolean') next.launchAtLogin = patch.launchAtLogin;
  if (ALLOWED_MAX_ITEMS.includes(patch.maxItems)) next.maxItems = patch.maxItems;
  if (ALLOWED_LINK_FORMATS.includes(patch.linkFormat)) next.linkFormat = patch.linkFormat;
  if (typeof patch.telemetry === 'boolean') next.telemetry = patch.telemetry;

  return next;
}

class SettingsStore {
  constructor({ file }) {
    this.file = file;
    this.values = { ...DEFAULTS };
  }

  async init() {
    try {
      const parsed = JSON.parse(await fs.readFile(this.file, 'utf8'));
      this.values = normalise(parsed, DEFAULTS);
    } catch {
      this.values = { ...DEFAULTS };
    }
    return this;
  }

  get() {
    return { ...this.values };
  }

  async update(patch) {
    this.values = normalise(patch, this.values);
    await fs.mkdir(path.dirname(this.file), { recursive: true });

    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.values, null, 2));
    await fs.rename(tmp, this.file);

    return this.get();
  }
}

module.exports = { SettingsStore, DEFAULTS, ALLOWED_MAX_ITEMS };
