'use strict';

/**
 * List actions: what you need after pasting a column of names, a shopping list
 * or the lines of a table — dedupe, order, number, squeeze into one line.
 */

function dedupe(text) {
  const seen = new Set();
  const kept = [];

  for (const line of text.split('\n')) {
    const key = line.trim();
    if (!key) {
      // Keep intentional paragraph breaks, collapse repeated ones.
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }

  return kept.join('\n').replace(/\n+$/, '');
}

function sortLines(text) {
  return text
    .split('\n')
    .filter((line) => line.trim())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .join('\n');
}

function reverseLines(text) {
  return text.split('\n').reverse().join('\n');
}

function numberLines(text) {
  let index = 0;
  return text
    .split('\n')
    .map((line) => (line.trim() ? `${(index += 1)}. ${line}` : line))
    .join('\n');
}

function joinWithCommas(text) {
  return text
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(', ');
}

function makeAction(id, zh, en, transform, extra = {}) {
  return {
    id,
    group: 'list',
    title: { zh, en },
    accepts: ['text'],
    ...extra,
    run: (input) => {
      const text = transform(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  };
}

module.exports = [
  makeAction('list.dedupe', '去重行', 'Remove duplicate lines', dedupe),
  makeAction('list.sort', '排序行', 'Sort lines', sortLines),
  makeAction(
    'list.reverse',
    '反转行序',
    'Reverse line order',
    reverseLines,
    { isAvailable: (input) => input.text.includes('\n') },
  ),
  makeAction(
    'list.number',
    '加序号',
    'Number the lines',
    numberLines,
    { isAvailable: (input) => /\n/.test(input.text) }
  ),
  makeAction(
    'list.commas',
    '合并成逗号分隔',
    'Join into a comma list',
    joinWithCommas,
    { isAvailable: (input) => input.text.trim().length > 0 },
  ),
];
