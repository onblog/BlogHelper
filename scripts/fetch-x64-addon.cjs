'use strict';

/**
 * Make an Intel build possible from an Apple Silicon machine.
 *
 * node-screenshots ships one prebuilt addon per platform as optional
 * dependencies, and npm only installs the host's — so an x64 dmg built here
 * bundled the arm64 addon and the overlay could not load on an Intel Mac.
 * This fetches the x64 twin, pinned to the same version as the host copy.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const hostPkg = path.join(root, 'node_modules/node-screenshots/package.json');

if (!fs.existsSync(hostPkg)) {
  console.error('[fetch-x64-addon] node-screenshots is not installed; run npm ci first');
  process.exit(1);
}

const { version } = JSON.parse(fs.readFileSync(hostPkg, 'utf8'));
const target = path.join(root, `node_modules/node-screenshots-darwin-x64/package.json`);
const installed = fs.existsSync(target)
  ? JSON.parse(fs.readFileSync(target, 'utf8')).version
  : null;

if (installed === version) {
  console.log(`[fetch-x64-addon] node-screenshots-darwin-x64@${version} already present`);
  process.exit(0);
}

console.log(`[fetch-x64-addon] installing node-screenshots-darwin-x64@${version}`);
execFileSync('npm', ['install', '--no-save', '--force', `node-screenshots-darwin-x64@${version}`], {
  cwd: root,
  stdio: 'inherit',
});
