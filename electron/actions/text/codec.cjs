'use strict';

/**
 * Encoding and escaping: Base64, percent-encoding, HTML entities.
 *
 * All of it is Node built-ins — no dependency is worth this little code.
 */

const { decodeEntities, escapeHtml } = require('../html.cjs');

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function encodeBase64(text) {
  return Buffer.from(text, 'utf8').toString('base64');
}

/**
 * Decode Base64 only when it round-trips.
 *
 * `Buffer.from(garbage, 'base64')` happily returns mojibake, so the decoded
 * bytes are re-encoded and compared; anything that does not match was never
 * Base64 and the caller gets a proper error instead of silent corruption.
 */
function decodeBase64(text) {
  const compact = text.replace(/\s+/g, '');
  if (!compact || !BASE64.test(compact)) return null;

  const decoded = Buffer.from(compact, 'base64').toString('utf8');
  const roundTrip = Buffer.from(decoded, 'utf8').toString('base64').replace(/=+$/, '');
  if (roundTrip !== compact.replace(/=+$/, '')) return null;

  // Reject binary payloads that survived the round-trip but are not text.
  if (decoded.includes('\uFFFD')) return null;
  return decoded;
}

module.exports = [
  {
    id: 'codec.base64-encode',
    group: 'codec',
    title: { zh: 'Base64 编码', en: 'Base64 encode' },
    accepts: ['text'],
    run: (input) => {
      const text = encodeBase64(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'codec.base64-decode',
    group: 'codec',
    title: { zh: 'Base64 解码', en: 'Base64 decode' },
    accepts: ['text'],
    isAvailable: (input) => decodeBase64(input.text) !== null,
    run: (input) => {
      const text = decodeBase64(input.text);
      return text === null ? { error: 'invalid_base64' } : { text };
    },
  },
  {
    id: 'codec.url-encode',
    group: 'codec',
    title: { zh: 'URL 编码', en: 'URL encode' },
    accepts: ['text'],
    run: (input) => {
      const text = encodeURIComponent(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'codec.url-decode',
    group: 'codec',
    title: { zh: 'URL 解码', en: 'URL decode' },
    accepts: ['text'],
    isAvailable: (input) => /%[0-9a-f]{2}/i.test(input.text),
    run: (input) => {
      try {
        return { text: decodeURIComponent(input.text) };
      } catch {
        return { error: 'invalid_url_encoding' };
      }
    },
  },
  {
    id: 'codec.html-escape',
    group: 'codec',
    title: { zh: 'HTML 转义', en: 'Escape HTML' },
    accepts: ['text'],
    run: (input) => {
      const text = escapeHtml(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'codec.html-unescape',
    group: 'codec',
    title: { zh: 'HTML 反转义', en: 'Unescape HTML' },
    accepts: ['text'],
    isAvailable: (input) => /&(#x?[0-9a-f]+|[a-z]+);/i.test(input.text),
    run: (input) => {
      const text = decodeEntities(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
];
