'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Remove build artifacts that no longer belong to the current version.
 *
 * `release/` keeps growing every time electron-builder runs: dmg + blockmap for
 * every version ever built, plus the unpacked `mac*` staging directories that
 * only exist so codesign and dmg creation can run. None of it is needed once a
 * version is published, and together it reaches hundreds of MB, so this runs at
 * the end of `npm run dist` and only keeps what the current release needs.
 */
const { version } = require('../package.json');

const releaseDir = path.resolve(__dirname, '..', 'release');
const STAGING_DIRS = ['mac', 'mac-arm64', 'mac-universal'];
const KEPT = new Set(['latest-mac.yml', 'builder-debug.yml', 'latest.yml', '.DS_Store']);

function sizeOf(target) {
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.size;
  return fs.readdirSync(target).reduce(
    (total, entry) => total + sizeOf(path.join(target, entry)),
    0,
  );
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

function isStaleVersionArtifact(name) {
  if (!/^miaomiao-bar-.*\.(dmg|blockmap|zip)$/.test(name)) return false;
  return !name.includes(`-${version}-`);
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.log('[clean] no release directory, nothing to do');
    return;
  }

  let freed = 0;

  for (const entry of fs.readdirSync(releaseDir)) {
    const target = path.join(releaseDir, entry);
    const staleDir = STAGING_DIRS.includes(entry) && fs.statSync(target).isDirectory();
    if (!staleDir && (KEPT.has(entry) || !isStaleVersionArtifact(entry))) continue;

    freed += sizeOf(target);
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[clean] removed ${entry}`);
  }

  console.log(
    freed
      ? `[clean] freed ${formatSize(freed)} (logical); kept ${version} artifacts only`
      : `[clean] already tidy (only ${version} artifacts)`,
  );
}

main();
