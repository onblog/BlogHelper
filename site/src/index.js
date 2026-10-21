/**
 * bar-tool — official site worker.
 *
 * Only /api/* reaches this script (see run_worker_first in wrangler.jsonc); every
 * other request is served straight from the static asset layer, which keeps the
 * site free and fast.
 *
 * Privacy: this worker stores no IP addresses, sets no cookies and calls no third
 * parties. Its only state is a 60 second in-memory cache of the release manifest.
 * Downloads are counted with standard Workers Logs, not a database.
 */

const MANIFEST_KEY = 'releases/latest.json';
const CACHE_TTL_MS = 60_000;
const ALLOWED_ARCH = new Set(['arm64', 'x64']);

let manifestCache = { value: null, at: 0 };

function json(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function fail(status, code, message) {
  return json(status, { ok: false, error: { code, message } });
}

async function readManifest(env) {
  const now = Date.now();
  if (manifestCache.value && now - manifestCache.at < CACHE_TTL_MS) return manifestCache.value;

  const object = await env.R2_RELEASES.get(MANIFEST_KEY);
  if (!object) return null;

  let parsed;
  try {
    parsed = await object.json();
  } catch {
    return null;
  }

  manifestCache = { value: parsed, at: now };
  return parsed;
}

/** Public shape: never expose the internal R2 key. */
function publicManifest(manifest) {
  const files = {};
  for (const arch of ['arm64', 'x64']) {
    const file = manifest?.files?.[arch];
    if (!file) continue;
    files[arch] = {
      name: file.name,
      size: file.size ?? null,
      url: `/api/download?arch=${arch}`,
    };
  }

  return {
    version: manifest?.version ?? null,
    released_at: manifest?.released_at ?? null,
    files,
  };
}

async function handleRelease(env) {
  const manifest = await readManifest(env);
  if (!manifest) {
    return fail(503, 'release_unavailable', '安装包还没上传，稍后再来');
  }

  return json(200, { ok: true, data: publicManifest(manifest) }, {
    'Cache-Control': 'public, max-age=60',
  });
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match) return null;

  const start = match[1] === '' ? size - Number(match[2]) : Number(match[1]);
  const end = match[1] === '' || match[2] === '' ? size - 1 : Number(match[2]);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end >= size || start > end) {
    return null;
  }

  return { offset: start, length: end - start + 1, start, end };
}

async function handleDownload(request, env) {
  const url = new URL(request.url);
  const arch = url.searchParams.get('arch') ?? 'arm64';
  if (!ALLOWED_ARCH.has(arch)) return fail(400, 'bad_arch', '未知架构');

  const manifest = await readManifest(env);
  const file = manifest?.files?.[arch];
  if (!file?.key) return fail(404, 'not_found', '这个架构的安装包还没上传');

  const size = file.size ?? 0;
  const range = size ? parseRange(request.headers.get('range'), size) : null;

  const object = await env.R2_RELEASES.get(file.key, range ? { range } : undefined);
  if (!object) return fail(404, 'not_found', '安装包丢失了');

  const headers = new Headers();
  headers.set('content-type', 'application/octet-stream');
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  if (range) {
    headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
    headers.set('content-length', String(range.length));
  } else {
    if (size) headers.set('content-length', String(size));
    headers.set('content-disposition', `attachment; filename="${file.name ?? `bar-tool-${arch}.dmg`}"`);
  }

  return new Response(object.body, { status: range ? 206 : 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/release') return handleRelease(env);
    if (url.pathname === '/api/download') return handleDownload(request, env);

    return new Response('Not found', { status: 404 });
  },
};
