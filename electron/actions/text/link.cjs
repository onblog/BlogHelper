'use strict';

/**
 * Link actions. Ordinary users do not care about percent-encoding as a concept,
 * but they do care that a shared link is 400 characters of tracking parameters,
 * or that a pasted link shows `%20` instead of spaces.
 */

const URL_PATTERN = /https?:\/\/[^\s<>"'）】]+/g;
// Non-global twin: calling .test() on a /g regex would advance lastIndex.
const URL_TEST = /https?:\/\/[^\s<>"'）】]+/;

/** Query parameters that only ever track the person clicking the link. */
const TRACKING_EXACT = new Set([
  'fbclid',
  'gclid',
  'yclid',
  'dclid',
  'msclkid',
  'wbraid',
  'gbraid',
  'igshid',
  'spm',
  'scm',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'share_token',
  'ref_src',
  'chksm',
]);

function isTracking(name) {
  const key = name.toLowerCase();
  return key.startsWith('utm_') || TRACKING_EXACT.has(key);
}

function stripQuery(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!parsed.search) return url;

  let removed = false;
  const params = new URLSearchParams();
  for (const [name, value] of parsed.searchParams) {
    if (isTracking(name)) {
      removed = true;
      continue;
    }
    params.append(name, value);
  }
  if (!removed) return url;

  const query = params.toString();
  parsed.search = query ? `?${query}` : '';
  return parsed.toString();
}

/** Rewrite every link inside the text, dropping tracking parameters only. */
function stripTracking(text) {
  return text.replace(URL_PATTERN, (url) => stripQuery(url));
}


function extractLinks(text) {
  const found = text.match(URL_PATTERN) ?? [];
  const unique = [...new Set(found.map((url) => url.replace(/[.,;]+$/, '')))];
  return unique.join('\n');
}

module.exports = [
  {
    id: 'link.strip-tracking',
    group: 'link',
    title: { zh: '净化链接', en: 'Clean tracking params' },
    accepts: ['text'],
    isAvailable: (input) => /[?&](utm_|fbclid|gclid|spm|scm|share_token|mc_cid)/i.test(input.text),
    run: (input) => {
      const text = stripTracking(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'link.extract',
    group: 'link',
    title: { zh: '提取文中所有链接', en: 'Extract every link' },
    accepts: ['text'],
    isAvailable: (input) => URL_TEST.test(input.text),
    run: (input) => {
      const text = extractLinks(input.text);
      return text ? { text } : { error: 'no_links' };
    },
  },
];
