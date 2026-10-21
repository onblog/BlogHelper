'use strict';

/**
 * Cleanup actions: what people do with text copied out of a web page, a PDF or
 * a chat window. Everything here is a pure function over the clipboard text.
 *
 * Every action in this project has the same shape:
 *
 *   { id, group, title: { zh, en }, accepts, isAvailable?, run(input) }
 *
 * `run` returns `{ text }` on success or `{ error: <code> }` when the input
 * cannot be handled. Nothing here touches Electron, so the whole set is unit
 * testable with `node:test` and zero dependencies.
 */

const { stripHtml } = require('../html.cjs');

const INVISIBLE = /[\u200b-\u200d\u2060\u180e\ufeff\u00ad]/g;
// Non-global twin: calling .test() on a /g regex would advance lastIndex.
const INVISIBLE_TEST = /[\u200b-\u200d\u2060\u180e\ufeff\u00ad]/;

function collapseBlankLines(text) {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

function trimLines(text) {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
}

function oneLine(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/[ \t]{2,}/g, ' ');
}

/** Drop leading "12. ", "12)", "12、" style numbering. */
function stripLineNumbers(text) {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*\d+\s*[.)、:：]\s?/, ''))
    .join('\n');
}

function removeBlankLines(text) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .join('\n');
}

/**
 * Remove characters that survive copy-paste but are invisible: zero-width
 * spaces, the byte-order mark, soft hyphens, and non-breaking spaces turned
 * back into ordinary ones.
 */
function stripInvisible(text) {
  return text.replace(INVISIBLE, '').replace(/\u00a0/g, ' ');
}

/** Flatten Markdown syntax back to the words it decorates. */
function stripMarkdown(text) {
  return text
    // [ \t] instead of \s everywhere: \s also matches the newline, and a
    // pattern like /^\s*[-*+]\s+/ would then eat the blank line before a bullet.
    .replace(/^[ \t]*```[^\n]*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/^[ \t]*[-*+][ \t]+/gm, '')
    .replace(/^[ \t]*\d+\.[ \t]+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = [
  {
    id: 'clean.plain',
    group: 'clean',
    title: { zh: '转纯文本', en: 'To plain text' },
    accepts: ['text'],
    // Only offers itself when the clipboard actually carries rich text.
    isAvailable: (input) => Boolean(input.html),
    run: (input) => {
      const text = stripHtml(input.html);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'clean.trim',
    group: 'clean',
    title: { zh: '去首尾空白', en: 'Trim whitespace' },
    accepts: ['text'],
    run: (input) => {
      const text = trimLines(input.text);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'clean.blank-lines',
    group: 'clean',
    title: { zh: '合并空行', en: 'Collapse blank lines' },
    accepts: ['text'],
    run: (input) => {
      const text = collapseBlankLines(input.text);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'clean.no-blank-lines',
    group: 'clean',
    title: { zh: '删掉空行', en: 'Remove blank lines' },
    accepts: ['text'],
    run: (input) => {
      const text = removeBlankLines(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'clean.one-line',
    group: 'clean',
    title: { zh: '压成一行', en: 'Join into one line' },
    accepts: ['text'],
    run: (input) => {
      const text = oneLine(input.text);
      return text ? { text } : { error: 'empty_result' };
    },
  },
  {
    id: 'clean.strip-numbers',
    group: 'clean',
    title: { zh: '去掉行号', en: 'Strip line numbers' },
    accepts: ['text'],
    run: (input) => {
      const text = stripLineNumbers(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'clean.invisible',
    group: 'clean',
    title: { zh: '清除隐形字符', en: 'Remove invisible chars' },
    accepts: ['text'],
    isAvailable: (input) => INVISIBLE_TEST.test(input.text) || input.text.includes('\u00a0'),
    run: (input) => {
      const text = stripInvisible(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'clean.strip-markdown',
    group: 'clean',
    title: { zh: '去掉 Markdown 标记', en: 'Strip Markdown syntax' },
    accepts: ['text'],
    isAvailable: (input) =>
      /(\*\*|`|^#{1,6}\s|\[[^\]]+\]\([^)]+\)|^\s*[-*+]\s)/m.test(input.text),
    run: (input) => {
      const text = stripMarkdown(input.text);
      return text ? { text } : { error: 'empty_result' };
    },
  },
];
