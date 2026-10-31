#!/usr/bin/env node
/**
 * Publish the packaged dmgs to R2 and point the site at the new version.
 *
 *   1. upload release/miaomiao-bar-<version>-<arch>.dmg -> R2 common/miaomiao-bar/releases/
 *   2. rewrite site/latest.json (the manifest the Worker serves)
 *   3. upload the manifest -> R2 common/miaomiao-bar/releases/latest.json
 *   4. delete the dmgs the previous manifest pointed at (old versions)
 *
 * Run `npm run build` and `npm run dist` first, then `npm run release` from
 * site/. The worker itself does not change between releases, so a plain version
 * bump needs no `wrangler deploy` — Cloudflare Workers Builds owns deployment.
 *
 * R2 keeps only the live version: an installer nobody can reach any more is
 * dead weight. Pruning is driven by the manifest that is replaced on disk, so it
 * needs no bucket listing (wrangler has no `r2 object list`).
 *
 * The `common` bucket is shared with onblog and miaomiao-notes, so every object
 * key carries the `miaomiao-bar/` prefix (see KEY_PREFIX in src/index.js).
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const siteDir = path.resolve(import.meta.dirname, '..');
const repoDir = path.resolve(siteDir, '..');
const releaseDir = path.join(repoDir, 'release');
const wranglerBin = path.join(siteDir, 'node_modules', '.bin', 'wrangler');
const BUCKET = 'common';
/** Shared-bucket namespace: must match KEY_PREFIX in src/index.js. */
const KEY_PREFIX = 'miaomiao-bar/';
const ARCHES = ['arm64', 'x64'];

const { version } = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);

/**
 * wrangler on newer Node versions finishes the work and then never exits (an
 * open handle keeps the process alive), so waiting on `exitCode` would hang
 * forever. Wait for the success line, then stop the process ourselves; a
 * non-zero exit before that line is a real failure.
 */
function runWrangler(args, successPattern, { failPattern, timeoutMs = 10 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(wranglerBin, args, {
      cwd: siteDir,
      env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2000).unref();
      error ? reject(error) : resolve(output);
    };

    const timer = setTimeout(
      () => finish(new Error(`wrangler timed out after ${timeoutMs}ms:\n${output}`)),
      timeoutMs,
    );

    const onData = (chunk) => {
      output += chunk.toString();
      if (successPattern.test(output)) return finish(null);
      if (failPattern?.test(output)) {
        const line = output.split('\n').find((l) => l.trim() && !l.includes('⛅')) || output;
        return finish(new Error(line.trim()));
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', finish);
    child.on('exit', (code) => {
      if (successPattern.test(output)) return finish(null);
      finish(new Error(`wrangler exited with code ${code}:\n${output}`));
    });
  });
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

const UPLOAD_ATTEMPTS = 3;

/**
 * R2 uploads occasionally die on a transient Cloudflare API timeout. Retrying
 * matters most for the manifest: until it lands the site keeps announcing the
 * previous version, even though the new dmgs are already in the bucket.
 */
async function upload(localFile, key) {
  const args = ['r2', 'object', 'put', `${BUCKET}/${key}`, `--file=${localFile}`, '--remote'];
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await runWrangler(args, /Upload complete/i);
    } catch (error) {
      if (attempt === UPLOAD_ATTEMPTS) throw error;
      const first = String(error.message).split('\n').find((line) => line.trim()) || 'unknown error';
      console.log(`  attempt ${attempt}/${UPLOAD_ATTEMPTS} failed: ${first.trim()}`);
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }
}

const DELETE_ATTEMPTS = 3;

/** Delete one object; a missing key is success (someone already cleaned it). */
async function deleteObject(key) {
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt += 1) {
    try {
      await runWrangler(['r2', 'object', 'delete', `${BUCKET}/${key}`, '--remote'], /Delete complete/i, {
        failPattern: /does not exist|not found|✘/i,
        timeoutMs: 120000,
      });
      return 'deleted';
    } catch (error) {
      const message = String(error.message);
      if (/does not exist|not found/i.test(message)) return 'missing';
      if (attempt === DELETE_ATTEMPTS) throw error;
      console.log(`  delete attempt ${attempt}/${DELETE_ATTEMPTS} failed: ${message.split('\n')[0]}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

/** Keys the previous manifest advertised, i.e. the versions about to go stale. */
function readPreviousKeys(manifestPath) {
  try {
    const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Object.values(previous.files || {})
      .map((file) => file.key)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function prune(previousKeys, keepKeys) {
  const keep = new Set(keepKeys);
  const stale = previousKeys.filter((key) => !keep.has(key));
  if (!stale.length) {
    console.log('no stale objects to remove');
    return;
  }
  for (const key of stale) {
    const result = await deleteObject(key);
    console.log(`  ${result === 'deleted' ? 'deleted' : 'already gone'}: ${key}`);
  }
}

async function main() {
  if (!fs.existsSync(wranglerBin)) {
    throw new Error(`wrangler not installed; run npm install in ${siteDir}`);
  }

  const manifestPath = path.join(siteDir, 'latest.json');
  const previousKeys = readPreviousKeys(manifestPath);

  const files = {};
  for (const arch of ARCHES) {
    const name = `miaomiao-bar-${version}-${arch}.dmg`;
    const file = path.join(releaseDir, name);
    if (!fs.existsSync(file)) {
      throw new Error(`missing ${file}; run "npm run dist" first`);
    }
    files[arch] = {
      key: `${KEY_PREFIX}releases/${name}`,
      name,
      size: fs.statSync(file).size,
      sha256: await sha256(file),
    };
  }

  for (const arch of ARCHES) {
    const { key, name } = files[arch];
    console.log(`uploading ${name} (${(files[arch].size / 1024 / 1024).toFixed(1)} MB)`);
    await upload(path.join(releaseDir, name), key);
  }

  const manifest = {
    version,
    released_at: new Date().toISOString().slice(0, 10),
    files,
  };
  // Rich single-line entries keep a version bump a readable diff.
  const inline = (file) =>
    `{ ${Object.entries(file)
      .map(([k, v]) => `"${k}": ${JSON.stringify(v)}`)
      .join(', ')} }`;
  const body = [
    '{',
    `  "version": "${manifest.version}",`,
    `  "released_at": "${manifest.released_at}",`,
    '  "files": {',
    `    "arm64": ${inline(files.arm64)},`,
    `    "x64":   ${inline(files.x64)}`,
    '  }',
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(manifestPath, body);
  console.log(`wrote ${path.relative(process.cwd(), manifestPath)}`);

  await upload(manifestPath, `${KEY_PREFIX}releases/latest.json`);

  console.log('removing older installers');
  await prune(previousKeys, Object.values(files).map((file) => file.key));

  console.log(`published ${version}: ${ARCHES.join(', ')}`);
}

// Only run when invoked directly, so the helpers stay unit-testable.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`release failed: ${error.message}`);
    process.exit(1);
  });
}

export { deleteObject, prune, readPreviousKeys };
