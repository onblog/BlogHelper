'use strict';

/**
 * AWS Signature Version 4, hand-written.
 *
 * The whole upload feature rests on this signing code, so it is kept apart from
 * Electron and covered by the AWS conformance vector: the `get-vanilla` case
 * from AWS's published test suite. If that signature matches, canonical
 * request, string-to-sign, key derivation and HMAC are all correct.
 */

const crypto = require('node:crypto');

const EMPTY_PAYLOAD_HASH = crypto.createHash('sha256').update('').digest('hex');
const ALGORITHM = 'AWS4-HMAC-SHA256';
const UNSIGNED_CHARS = /[A-Za-z0-9_.~-]/;

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/** RFC 3986 percent-encoding — AWS is strict about which characters survive. */
function uriEncode(value, encodeSlash = true) {
  let out = '';
  for (const byte of Buffer.from(String(value), 'utf8')) {
    const char = String.fromCharCode(byte);
    if (UNSIGNED_CHARS.test(char)) out += char;
    else if (char === '/' && !encodeSlash) out += '/';
    else out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

/** Encode an object key without touching its slashes. */
function encodeKey(key) {
  return String(key)
    .split('/')
    .map((segment) => uriEncode(segment))
    .join('/');
}

/**
 * Canonical query string: every pair encoded, sorted by name then value.
 * Accepts an object of scalars or arrays, or nothing at all.
 */
function canonicalQuery(query) {
  const pairs = [];

  for (const [name, value] of Object.entries(query ?? {})) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) pairs.push([uriEncode(name), uriEncode(item ?? '')]);
  }

  pairs.sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));

  return pairs.map(([name, value]) => `${name}=${value}`).join('&');
}

/**
 * Sign a request.
 *
 * @param {object} request
 * @param {string} request.method
 * @param {string} request.host
 * @param {string} request.path            already-encoded absolute path
 * @param {object} [request.query]
 * @param {Record<string,string>} request.headers  must include host and x-amz-date
 * @param {string} request.payloadHash
 * @param {string} request.region
 * @param {string} request.service
 * @param {string} request.accessKey
 * @param {string} request.secretKey
 * @param {string} request.amzDate          YYYYMMDDTHHMMSSZ
 */
function sign({
  method,
  host,
  path = '/',
  query,
  headers,
  payloadHash,
  region,
  service,
  accessKey,
  secretKey,
  amzDate,
}) {
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;

  const normalised = Object.entries(headers).map(([name, value]) => [
    name.toLowerCase(),
    String(value).trim().replace(/\s+/g, ' '),
  ]);
  normalised.sort((a, b) => (a[0] < b[0] ? -1 : 1));

  const signedHeaders = normalised.map(([name]) => name).join(';');
  const canonicalHeaders = normalised.map(([name, value]) => `${name}:${value}\n`).join('');

  const canonicalRequest = [
    method,
    path,
    canonicalQuery(query),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    sha256Hex(Buffer.from(canonicalRequest, 'utf8')),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), service),
    'aws4_request',
  );
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    signature,
    signedHeaders,
    scope,
    canonicalRequest,
    stringToSign,
    authorization: `${ALGORITHM} Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function amzDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * PUT one object into an S3-compatible bucket.
 *
 * Path-style addressing (`endpoint/bucket/key`) is the default because it works
 * on R2, COS, OSS and MinIO alike; virtual-host style is available for buckets
 * that require it.
 */
async function putObject({
  endpoint,
  region = 'auto',
  bucket,
  key,
  body,
  contentType = 'application/octet-stream',
  accessKey,
  secretKey,
  pathStyle = true,
  publicBase,
  fetchImpl = fetch,
  now = new Date(),
}) {
  const base = new URL(endpoint);
  const host = pathStyle ? base.host : `${bucket}.${base.host}`;
  const basePath = base.pathname.replace(/\/+$/, '');
  const encodedKey = encodeKey(key);
  const path = pathStyle
    ? `${basePath}/${uriEncode(bucket)}/${encodedKey}`
    : `${basePath}/${encodedKey}`;

  const payloadHash = sha256Hex(body);
  const stamp = amzDate(now);

  const { authorization } = sign({
    method: 'PUT',
    host,
    path,
    headers: { host, 'x-amz-date': stamp, 'x-amz-content-sha256': payloadHash },
    payloadHash,
    region,
    service: 's3',
    accessKey,
    secretKey,
    amzDate: stamp,
  });

  const response = await fetchImpl(`${base.protocol}//${host}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'x-amz-date': stamp,
      'x-amz-content-sha256': payloadHash,
      'content-type': contentType,
      'content-length': String(body.length),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      error: text.slice(0, 300) || `HTTP ${response.status}`,
    };
  }

  const publicUrl = publicBase
    ? `${publicBase.replace(/\/+$/, '')}/${key}`
    : `${base.protocol}//${host}${path}`;

  return { ok: true, status: response.status, url: publicUrl, key };
}

/** Content-addressed key so the same screenshot is stored once. */
function objectKey({ buffer, mime, now = new Date() }) {
  const extension = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
    'image/bmp': 'bmp',
  }[mime] ?? 'png';

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const digest = sha1Hex(buffer).slice(0, 8);

  return `images/${year}/${month}/${digest}.${extension}`;
}

function sha1Hex(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

module.exports = {
  sign,
  putObject,
  objectKey,
  uriEncode,
  encodeKey,
  canonicalQuery,
  amzDate,
  sha256Hex,
  EMPTY_PAYLOAD_HASH,
};
