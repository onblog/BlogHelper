'use strict';

/**
 * Cleanup actions: strip markup, normalise whitespace, drop line numbers.
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
];
