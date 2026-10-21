'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Ad-hoc sign the packaged app before the dmg is built.
 *
 * electron-builder's `identity: "-"` is not understood as ad-hoc — it looks
 * for a certificate literally named "-" and silently skips signing. Without a
 * signature the bundle has no sealed resources, and macOS reports the app as
 * "damaged" instead of "unverified developer".
 */
/**
 * electron-builder's Arch enum: ia32 0, x64 1, armv7l 2, arm64 3, universal 4.
 * Only the matching node-screenshots addon may ship, otherwise an Intel dmg
 * would carry an arm64 binary that cannot load (and the other way round).
 */
const ARCH_NAMES = ['ia32', 'x64', 'armv7l', 'arm64', 'universal'];

function dropForeignAddons(context, appPath) {
  const arch = ARCH_NAMES[context.arch] ?? process.arch;
  if (arch === 'universal') return;

  const unpacked = path.join(appPath, 'Contents/Resources/app.asar.unpacked/node_modules');
  for (const name of ['node-screenshots-darwin-arm64', 'node-screenshots-darwin-x64']) {
    if (name.endsWith(`-${arch}`)) continue;
    const target = path.join(unpacked, name);
    if (!fs.existsSync(target)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[after-pack] dropped ${name} (building for ${arch})`);
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  dropForeignAddons(context, appPath);

  execFileSync('codesign', ['--deep', '--force', '--sign', '-', appPath], {
    stdio: 'inherit',
  });

  // Fail the build if the bundle did not actually get sealed.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });

  console.log(`[after-pack] ad-hoc signed and verified ${appPath}`);
};
