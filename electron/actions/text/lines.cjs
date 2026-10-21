'use strict';

/**
 * Line-level helpers: the "clean up this pasted list" actions.
 */

function lines(text) {
  return text.split('\n');
}

function dedupe(text) {
  const seen = new Set();
  const kept = [];

  for (const line of lines(text)) {
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

function sort(text) {
  const kept = lines(text).filter((line) => line.trim());
  kept.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return kept.join('\n');
}

module.exports = [
  {
    id: 'lines.dedupe',
    group: 'lines',
    title: { zh: '去重行', en: 'Remove duplicate lines' },
    accepts: ['text'],
    run: (input) => {
      const text = dedupe(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
  {
    id: 'lines.sort',
    group: 'lines',
    title: { zh: '排序行', en: 'Sort lines' },
    accepts: ['text'],
    run: (input) => {
      const text = sort(input.text);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  },
];
