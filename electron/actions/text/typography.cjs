'use strict';

/**
 * Chinese typography — the group that makes this useful for people who write
 * in Chinese all day: spacing between Chinese and Latin text, and punctuation
 * that belongs to one script or the other.
 *
 * The rules are conservative on purpose. A wrong insertion inside a number or
 * a URL is worse than a missed one, so every rule requires a character from
 * each script to be adjacent.
 */

const CJK = '\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uf900-\ufaff';
const CJK_ALNUM = new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g');
const ALNUM_CJK = new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g');
const ADJACENT_PAIR = new RegExp(`[${CJK}][A-Za-z0-9]|[A-Za-z0-9][${CJK}]`);
const URL_PATTERN = /https?:\/\/[^\s<>"'）】]+/g;

const TO_FULLWIDTH = {
  ',': '，',
  '.': '。',
  '!': '！',
  '?': '？',
  ':': '：',
  ';': '；',
  '~': '～',
};

const TO_HALFWIDTH = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '：': ':',
  '；': ';',
  '、': ',',
  '（': '(',
  '）': ')',
  '“': '"',
  '”': '"',
  '‘': "'",
  '’': "'",
  '～': '~',
  '《': '<',
  '》': '>',
  '【': '[',
  '】': ']',
};

const HALFWIDTH_CLASS = Object.keys(TO_HALFWIDTH).join('');
const FULLWIDTH_PUNCT = new RegExp(`[${HALFWIDTH_CLASS}]`, 'g');
// Non-global twin for .test(), which must not depend on lastIndex.
const FULLWIDTH_PUNCT_TEST = new RegExp(`[${HALFWIDTH_CLASS}]`);

/**
 * Insert a space between Chinese and Latin/digits, the way good Chinese
 * typesetting does. URLs are masked first so nothing is inserted inside them.
 */
function addCjkSpacing(text) {
  const urls = [];
  const masked = text.replace(URL_PATTERN, (url) => {
    urls.push(url);
    return `\u0000${urls.length - 1}\u0000`;
  });

  const spaced = masked.replace(CJK_ALNUM, '$1 $2').replace(ALNUM_CJK, '$1 $2');

  return spaced.replace(/\u0000(\d+)\u0000/g, (_match, index) => urls[Number(index)]);
}

/** Turn ASCII punctuation into full-width when it sits next to Chinese text. */
function toFullwidth(text) {
  return text
    .replace(new RegExp(`([${CJK}])([,.!?:;~])`, 'g'), (_m, cjk, mark) => cjk + TO_FULLWIDTH[mark])
    .replace(new RegExp(`([,.!?:;~])([${CJK}])`, 'g'), (_m, mark, cjk) => TO_FULLWIDTH[mark] + cjk)
    .replace(new RegExp(`([${CJK}])\\.(?=\\s|$)`, 'gm'), (_m, cjk) => `${cjk}。`);
}

/** Turn full-width punctuation into ASCII — handy when pasting into code. */
function toHalfwidth(text) {
  return text.replace(FULLWIDTH_PUNCT, (mark) => TO_HALFWIDTH[mark]);
}

module.exports = [
  {
    id: 'typography.cjk-spacing',
    group: 'typography',
    title: { zh: '中英文之间加空格', en: 'Space CJK and Latin' },
    accepts: ['text'],
    isAvailable: (input) => ADJACENT_PAIR.test(input.text),
    run: (input) => {
      const text = addCjkSpacing(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'typography.fullwidth',
    group: 'typography',
    title: { zh: '标点转全角', en: 'Punctuation → full-width' },
    accepts: ['text'],
    isAvailable: (input) =>
      new RegExp(`[${CJK}][,.!?:;~]|[,.!?:;~][${CJK}]`).test(input.text) ||
      new RegExp(`[${CJK}]\\.(\\s|$)`).test(input.text),
    run: (input) => {
      const text = toFullwidth(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
];
