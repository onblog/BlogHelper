'use strict';

/**
 * Where the official site lives.
 *
 * The domain is never committed. `tools/write-site-origin.cjs` bakes it into
 * `electron/site.json` while packaging (from SITE_URL or VITE_SITE_URL), and an
 * environment override still wins so a local run can point somewhere else.
 *
 * Returns '' when nothing is configured — callers must treat that as "feature
 * off" rather than firing a request at an empty URL.
 */

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, 'site.json');

function normalise(value) {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

function siteOrigin() {
  const fromEnv = normalise(process.env.SITE_URL);
  if (fromEnv) return fromEnv;

  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return normalise(parsed && parsed.origin);
  } catch {
    return '';
  }
}

/**
 * Contact address baked in at packaging time, same contract as `siteOrigin()`:
 * an environment override wins, the bundled file is the fallback, and '' means
 * "not configured" so the About panel can hide the entry.
 */
function contactEmail() {
  const fromEnv = normalise(process.env.CONTACT_EMAIL);
  if (fromEnv) return fromEnv;

  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return normalise(parsed && parsed.contactEmail);
  } catch {
    return '';
  }
}

module.exports = { siteOrigin, contactEmail };
