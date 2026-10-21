'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

/**
 * Ad-hoc sign the packaged app before the dmg is built.
 *
 * electron-builder's `identity: "-"` is not understood as ad-hoc — it looks
 * for a certificate literally named "-" and silently skips signing. Without a
 * signature the bundle has no sealed resources, and macOS reports the app as
 * "damaged" instead of "unverified developer".
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  execFileSync('codesign', ['--deep', '--force', '--sign', '-', appPath], {
    stdio: 'inherit',
  });

  // Fail the build if the bundle did not actually get sealed.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });

  console.log(`[after-pack] ad-hoc signed and verified ${appPath}`);
};
