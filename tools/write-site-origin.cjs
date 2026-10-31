'use strict';

/**
 * Bakes the site origin into `electron/site.json` for the packaged app.
 *
 * The main process cannot see a build environment at runtime (a double-clicked
 * .app has no SITE_URL), so the value has to travel inside the bundle. The file
 * is git-ignored, which keeps the production domain out of the repository.
 *
 * Source order: SITE_URL → VITE_SITE_URL in .env → empty (features off).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'electron', 'site.json');

/** Reads `KEY=value` from the repo-root `.env`; `VITE_SITE_URL` for the origin by default. */
function fromEnvFile(key = 'VITE_SITE_URL') {
  try {
    const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    const pattern = new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`);
    for (const line of text.split('\n')) {
      const match = line.match(pattern);
      if (match) return match[1].replace(/^["']|["']$/g, '');
    }
  } catch {
    // No .env: the build simply ships without a site origin.
  }
  return '';
}

const origin = (process.env.SITE_URL || fromEnvFile()).trim().replace(/\/+$/, '');
// 联系方式同理：仓库里不出现真实邮箱，打包时从环境或 .env 取值。
const contactEmail = (process.env.CONTACT_EMAIL || fromEnvFile('CONTACT_EMAIL')).trim();

fs.writeFileSync(OUT, `${JSON.stringify({ origin, contactEmail }, null, 2)}\n`);

if (origin) {
  console.log(`site origin embedded: ${origin}`);
} else {
  console.log('site origin empty — update check, launch stats and the tray website stay off');
}
if (!contactEmail) console.log('contact email empty — the About panel hides the mail entry');
