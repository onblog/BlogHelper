'use strict';

/**
 * JSON actions. `JSON.parse` + `JSON.stringify` cover what people actually
 * mean by "format my code" in a clipboard tool — no formatter dependency.
 */

function parse(text) {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    return { error };
  }
}

function looksLikeJson(text) {
  const trimmed = text.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return false;
  return !parse(trimmed).error;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function makeAction(id, zh, en, transform) {
  return {
    id,
    group: 'data',
    title: { zh, en },
    accepts: ['text'],
    isAvailable: (input) => looksLikeJson(input.text),
    run: (input) => {
      const parsed = parse(input.text);
      if (parsed.error) return { error: 'invalid_json' };

      const text = transform(parsed.value);
      return text === input.text ? { error: 'unchanged' } : { text };
    },
  };
}

module.exports = [
  makeAction('data.json-beautify', 'JSON 美化', 'Beautify JSON', (value) =>
    JSON.stringify(value, null, 2),
  ),
  makeAction('data.json-minify', 'JSON 压缩', 'Minify JSON', (value) => JSON.stringify(value)),
  makeAction('data.json-sort-keys', 'JSON 键排序', 'Sort JSON keys', (value) =>
    JSON.stringify(sortKeys(value), null, 2),
  ),
];
